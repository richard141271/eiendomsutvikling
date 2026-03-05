"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileIcon, Loader2, CheckCircle2 } from "lucide-react";

interface FileUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  onUploadStatusChange?: (isUploading: boolean) => void;
  allowMultiple?: boolean;
  accept?: string;
  endpoint?: string;
  onUploadComplete?: (data: any) => void;
  onBeforeUpload?: (file: File) => Promise<boolean>;
}

export function FileUpload({ value, onChange, label = "Fil", onUploadStatusChange, allowMultiple = false, accept, endpoint, onUploadComplete, onBeforeUpload }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(value ? "Fil lastet opp" : null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    // Check before upload if provided
    if (onBeforeUpload) {
      for (const file of files) {
        const shouldContinue = await onBeforeUpload(file);
        if (!shouldContinue) {
          // Reset input so user can pick again
          e.target.value = '';
          return;
        }
      }
    }

    setUploading(true);
    if (onUploadStatusChange) onUploadStatusChange(true);

    try {
      for (const file of files) {
        setFileName(file.name);
        
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(endpoint || "/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        const url = data.imageUrl || data.url;
        onChange(url);
        
        if (onUploadComplete) {
          onUploadComplete(data);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Feil ved opplasting av fil");
    } finally {
      setUploading(false);
      if (onUploadStatusChange) onUploadStatusChange(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          className="relative"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Laster opp...
            </>
          ) : fileName ? (
             <>
               <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
               Last opp ny fil
             </>
          ) : (
            <>
              <FileIcon className="mr-2 h-4 w-4" />
              Velg fil
            </>
          )}
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept={accept || ".jpg,.jpeg,.png,.pdf,.eml,.html,.htm"}
            multiple={allowMultiple}
          />
        </Button>
        {fileName && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{fileName}</span>}
      </div>
    </div>
  );
}
