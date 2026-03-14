"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileIcon, Loader2, UploadCloud, Folder, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DropzoneUploadProps {
  projectId: string;
  onUploadComplete: (data: any) => void;
  onBeforeUpload?: (file: File) => Promise<boolean>;
  onBatchComplete?: (count: number) => void;
  className?: string;
}

export function DropzoneUpload({ projectId, onUploadComplete, onBeforeUpload, onBatchComplete, className }: DropzoneUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    const toShortError = (raw: string) => {
      const text = (raw || "").trim();
      if (!text) return "Ukjent feil";
      if (text.length <= 240) return text;
      return `${text.slice(0, 240)}…`;
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length, filename: file.name });

      try {
        // 1. Check duplicates if handler provided
        if (onBeforeUpload) {
          const shouldContinue = await onBeforeUpload(file);
          if (!shouldContinue) {
            continue;
          }
        }

        // 2. Prepare upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("lastModified", file.lastModified.toString());

        // 3. Upload
        const response = await fetch(`/api/projects/${projectId}/evidence/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let message = errorText;
          try {
            const parsed = JSON.parse(errorText);
            if (parsed?.error) message = String(parsed.error);
          } catch {}
          console.error(`Upload failed for ${file.name}:`, message);
          throw new Error(toShortError(message));
        }

        const data = await response.json();
        onUploadComplete({ ...data, isBatch: files.length > 1 });
        successCount++;
      } catch (error) {
        console.error("Upload error:", error);
        const msg = error instanceof Error ? error.message : "Ukjent feil";
        toast.error(`${file.name}: ${msg}`);
        failCount++;
      }
    }

    setUploading(false);
    setProgress(null);

    if (successCount > 0) {
      toast.success(`${successCount} fil(er) lastet opp!`);
    }
    if (failCount > 0) {
      toast.warning(`${failCount} fil(er) feilet.`);
    }

    if (onBatchComplete) {
      onBatchComplete(successCount);
    }
  }, [projectId, onBeforeUpload, onUploadComplete, onBatchComplete]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
    // Reset input value so same file can be selected again if needed
    e.target.value = "";
  }, [processFiles]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const directFiles = Array.from(e.dataTransfer.files || []);
    if (directFiles.length > 0) {
      await processFiles(directFiles);
      return;
    }

    const items = Array.from(e.dataTransfer.items || []);
    const files: File[] = [];
    
    // Helper to read entries recursively
    const readEntry = async (entry: any): Promise<File[]> => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((f: File) => resolve([f]), () => resolve([]));
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries = await new Promise<any[]>((resolve) => {
          dirReader.readEntries((results: any[]) => resolve(results), () => resolve([]));
        });
        
        const nestedFiles: File[] = [];
        for (const nestedEntry of entries) {
          const f = await readEntry(nestedEntry);
          nestedFiles.push(...f);
        }
        return nestedFiles;
      }
      return [];
    };

    if (items && items.length > 0) {
      // Check if webkitGetAsEntry exists (it's non-standard but common in browsers)
      const firstItem = items[0] as any;
      if (typeof firstItem.webkitGetAsEntry === 'function') {
        const queue = items.map(item => (item as any).webkitGetAsEntry()).filter(entry => entry !== null);
        for (const entry of queue) {
          const entryFiles = await readEntry(entry);
          files.push(...entryFiles);
        }
      } else {
        files.push(...Array.from(e.dataTransfer.files));
      }
    } else {
      // Fallback
      files.push(...Array.from(e.dataTransfer.files));
    }

    if (files.length === 0) {
      toast.error("Fant ingen filer å laste opp");
      return;
    }

    await processFiles(files);
  }, [processFiles]);

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors text-center flex flex-col items-center justify-center gap-4 min-h-[200px] bg-slate-50/50",
          isDragging ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          mozdirectory=""
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          {...({ capture: "environment" } as any)}
          className="hidden"
          onChange={handleFileInputChange}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-1">
              <div className="text-sm font-medium">
                Laster opp {progress?.current} av {progress?.total}...
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {progress?.filename}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-full bg-white shadow-sm border">
              <UploadCloud className="h-8 w-8 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-lg">Dra og slipp filer her</h3>
              <p className="text-sm text-slate-500">
                Bilder, video, dokumenter, e-post eller hele mapper
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                <FileIcon className="w-4 h-4 mr-2" />
                Velg filer
              </Button>
              <Button onClick={() => cameraInputRef.current?.click()} variant="outline" size="sm">
                <ImageIcon className="w-4 h-4 mr-2" />
                Ta bilde
              </Button>
              <Button onClick={() => folderInputRef.current?.click()} variant="outline" size="sm">
                <Folder className="w-4 h-4 mr-2" />
                Velg mappe
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
