"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Box, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ScannerInterface from "@/components/3d/scanner-interface";
import { createRoomScan, deleteRoomScan } from "@/app/actions/room-scan";
import { useRouter } from "next/navigation";

// Dynamic import for ModelViewer to avoid SSR issues
const ModelViewer = dynamic(() => import("@/components/3d/model-viewer"), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-900 animate-pulse rounded-xl" />,
});

interface RoomScan {
  id: string;
  name: string;
  fileUrl: string;
  createdAt: Date;
}

interface RoomScanManagerProps {
  unitId: string;
  initialScans: RoomScan[];
}

export default function RoomScanManager({ unitId, initialScans }: RoomScanManagerProps) {
  const [scans, setScans] = useState<RoomScan[]>(initialScans);
  const [viewMode, setViewMode] = useState<"list" | "scan" | "view">("list");
  const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleScanComplete = async (file: File, name: string) => {
    // In a real app, upload 'file' to storage (Supabase/S3) and get URL.
    // For this MVP, we will use a demo URL to simulate success.
    const demoUrl = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
    
    // Optimistic UI update (if we had the local blob)
    // const localUrl = URL.createObjectURL(file);
    
    const result = await createRoomScan(unitId, name, demoUrl);
    
    if (result.success && result.data) {
      setScans([result.data, ...scans]);
      setViewMode("list");
      router.refresh();
    } else {
      alert("Feil ved lagring av skanning");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Er du sikker på at du vil slette denne skanningen?")) {
        const result = await deleteRoomScan(id, unitId);
        if (result.success) {
            setScans(scans.filter(s => s.id !== id));
            router.refresh();
        }
    }
  };

  return (
    <div className="space-y-6">
      {viewMode === "list" && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Lagrede Rom</h2>
            <Button onClick={() => setViewMode("scan")}>
              <Plus className="mr-2 h-4 w-4" />
              Ny Skanning
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {scans.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-slate-50 border border-dashed rounded-xl">
                <Box className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Ingen skanninger ennå</h3>
                <p className="text-slate-500 mb-6">Start din første romskanning for å se den her.</p>
                <Button onClick={() => setViewMode("scan")}>Start Skanning</Button>
              </div>
            ) : (
              scans.map((scan) => (
                <Card key={scan.id} className="overflow-hidden group hover:shadow-lg transition-all">
                  <div 
                    className="h-40 bg-slate-100 relative cursor-pointer flex items-center justify-center"
                    onClick={() => {
                      setCurrentModelUrl(scan.fileUrl);
                      setViewMode("view");
                    }}
                  >
                     <Box className="h-16 w-16 text-slate-300 group-hover:scale-110 transition-transform" />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                        <span>{scan.name}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(scan.id);
                        }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="text-xs text-muted-foreground">
                    Skannet: {new Date(scan.createdAt).toLocaleDateString()}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {viewMode === "scan" && (
        <ScannerInterface 
          onScanComplete={handleScanComplete} 
          onCancel={() => setViewMode("list")} 
        />
      )}

      {viewMode === "view" && currentModelUrl && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setViewMode("list")} className="pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til oversikt
          </Button>
          
          <div className="bg-slate-950 rounded-xl p-1">
             <ModelViewer url={currentModelUrl} autoRotate />
          </div>
          
          <div className="flex justify-between items-center text-sm text-muted-foreground px-2">
            <p>Bruk mus/touch for å rotere og zoome. Dobbelklikk for å fokusere.</p>
          </div>
        </div>
      )}
    </div>
  );
}
