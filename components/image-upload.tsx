"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Image from "next/image";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = "Bilde" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onChange(data.imageUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Kunne ikke laste opp bilde");
      setPreview(value || null); // Revert preview
    } finally {
      setUploading(false);
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
