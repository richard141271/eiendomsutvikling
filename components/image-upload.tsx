"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Image from "next/image";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  onUploadStatusChange?: (isUploading: boolean) => void;
  allowMultiple?: boolean;
}

export function ImageUpload({ value, onChange, label = "Bilde", onUploadStatusChange, allowMultiple = false }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

  useEffect(() => {
    if (!uploading) {
      setPreview(value || null);
    }
  }, [value, uploading]);

  useEffect(() => {
    if (uploadComplete) {
      const timer = setTimeout(() => {
        setUploadComplete(false);
        setUploadProgress(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadComplete]);

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.8);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const selectedFiles = allowMultiple ? files : [files[0]];

    setUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });
    setUploadComplete(false);

    if (onUploadStatusChange) onUploadStatusChange(true);

    try {
      let completedCount = 0;
      for (const file of selectedFiles) {
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        const resizedBlob = await resizeImage(file);
        const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' });

        const formData = new FormData();
        formData.append("file", resizedFile);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await res.json();
        onChange(data.imageUrl);
        
        completedCount++;
        setUploadProgress({ current: completedCount, total: selectedFiles.length });
      }
      
      setUploadComplete(true);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(`Kunne ikke laste opp bilde: ${error instanceof Error ? error.message : "Ukjent feil"}`);
      setPreview(value || null); // Revert preview
      setUploadProgress(null);
    } finally {
      setUploading(false);
      if (onUploadStatusChange) onUploadStatusChange(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-4">
        {preview ? (
          <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => {
                setPreview(null);
                onChange("");
              }}
            >
              Fjern
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full max-w-sm p-6 border-2 border-dashed rounded-lg border-muted-foreground/25 bg-muted/50 hover:bg-muted/75 transition-colors">
            <div className="text-center">
              <div className="mt-2 flex text-sm leading-6 text-muted-foreground">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-primary/80"
                >
                  <span>Last opp et bilde</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    multiple={allowMultiple}
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF opp til 10MB</p>
            </div>
          </div>
        )}
        {uploading && uploadProgress && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Laster opp bilde {uploadProgress.current} av {uploadProgress.total}...
          </p>
        )}
        {uploadComplete && uploadProgress && (
          <p className="text-sm text-green-600 font-medium flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Alle {uploadProgress.total} bilder lastet opp!
          </p>
        )}
      </div>
    </div>
  );
}
