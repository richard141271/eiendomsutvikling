"use client";

import { useState, useRef } from "react";
import { ImageIcon, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createUnitImage, deleteUnitImage } from "@/app/actions/unit-images";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface UnitImage {
  id: string;
  url: string;
  description: string | null;
  createdAt: Date;
}

interface UnitImageArchiveProps {
  unitId: string;
  images: UnitImage[];
}

export default function UnitImageArchive({ unitId, images }: UnitImageArchiveProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setIsUploading(true);
    const files = Array.from(e.target.files);
    
    // Mock upload for now
    for (const file of files) {
      const mockUrl = `https://picsum.photos/seed/${file.name + Math.random()}/800/600`;
      await createUnitImage(unitId, mockUrl, file.name);
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Er du sikker på at du vil slette dette bildet?")) {
      await deleteUnitImage(id, unitId);
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Bildekartotek</CardTitle>
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <Plus className="mr-2 h-4 w-4" />
          {isUploading ? "Laster opp..." : "Legg til bilder"}
        </Button>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <ImageIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>Ingen bilder i kartoteket</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden border">
                <Image
                  src={img.url}
                  alt={img.description || "Unit image"}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(img.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {img.description && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-white text-xs truncate">
                    {img.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleUpload}
        />
      </CardContent>
    </Card>
  );
}
