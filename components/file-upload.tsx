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
}

export function FileUpload({ value, onChange, label = "Fil", onUploadStatusChange, allowMultiple = false, accept }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(value ? "Fil lastet opp" : null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    setUploading(true);
    if (onUploadStatusChange) onUploadStatusChange(true);

    try {
      for (const file of files) {
        setFileName(file.name);
        
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        onChange(data.imageUrl); // API returns generic { imageUrl: url }
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
            accept={accept}
            multiple={allowMultiple}
          />
        </Button>
        {fileName && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{fileName}</span>}
      </div>
    </div>
  );
}
