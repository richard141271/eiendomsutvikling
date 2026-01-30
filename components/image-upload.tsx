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
}

export function ImageUpload({ value, onChange, label = "Bilde", onUploadStatusChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

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
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    setUploading(true);
    if (onUploadStatusChange) onUploadStatusChange(true);

    try {
      // Resize image before upload to avoid server limits and save bandwidth
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
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(`Kunne ikke laste opp bilde: ${error instanceof Error ? error.message : "Ukjent feil"}`);
      setPreview(value || null); // Revert preview
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
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF opp til 10MB</p>
            </div>
          </div>
        )}
        {uploading && <p className="text-sm text-muted-foreground">Laster opp...</p>}
      </div>
    </div>
  );
}
