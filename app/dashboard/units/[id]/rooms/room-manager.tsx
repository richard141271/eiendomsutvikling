"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Box, ArrowLeft, Trash2, Home, Maximize, FileText, ImageIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RoomForm, { RoomData } from "@/components/3d/room-form";
import { createRoom, deleteRoom, updateRoom } from "@/app/actions/room";
import { useRouter } from "next/navigation";
import { RoomType } from "@prisma/client";
import Image from "next/image";

// Dynamic import for ModelViewer to avoid SSR issues
const ModelViewer = dynamic(() => import("@/components/3d/model-viewer"), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-900 animate-pulse rounded-xl" />,
});

interface RoomImage {
  id: string;
  url: string;
}

interface Room {
  id: string;
  name: string;
  type: RoomType;
  sizeSqm: number | null;
  description: string | null;
  scanUrl: string | null;
  createdAt: Date;
  images: RoomImage[];
}

interface RoomManagerProps {
  unitId: string;
  initialRooms: Room[];
}

export default function RoomManager({ unitId, initialRooms }: RoomManagerProps) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [viewMode, setViewMode] = useState<"list" | "create" | "view" | "edit">("list");
  const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const router = useRouter();

  const handleSaveRoom = async (data: RoomData) => {
    // 1. Upload 3D model if present
    let scanUrl = selectedRoom?.scanUrl || undefined;
    if (data.file) {
      // In a real app, upload 'data.file' to storage (Supabase/S3) and get URL.
      // For this MVP, we will use a demo URL if a file is provided.
      const demoUrl = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
      scanUrl = demoUrl;
    }
    
    // 2. Upload images if present
    let imageUrls: string[] = [];
    if (data.images && data.images.length > 0) {
        // Mock image URLs
        imageUrls = data.images.map(() => `https://picsum.photos/seed/${Math.random()}/400/300`);
    }

    // Map string type to RoomType enum
    const roomType = data.type as RoomType;

    if (viewMode === "edit" && selectedRoom) {
        const result = await updateRoom(selectedRoom.id, unitId, {
            name: data.name,
            type: roomType,
            sizeSqm: data.sizeSqm,
            description: data.description,
            scanUrl,
            images: imageUrls
        });

        if (result.success && result.data) {
            setRooms(rooms.map(r => r.id === result.data.id ? (result.data as unknown as Room) : r));
            setViewMode("list");
            setSelectedRoom(null);
            router.refresh();
        } else {
            alert("Feil ved oppdatering av rom");
        }
    } else {
        const result = await createRoom(unitId, {
            name: data.name,
            type: roomType,
            sizeSqm: data.sizeSqm,
            description: data.description,
            scanUrl: scanUrl,
            images: imageUrls
        });
        
        if (result.success && result.data) {
            // Cast the result data to Room interface (dates might need handling if passed as strings)
            setRooms([result.data as unknown as Room, ...rooms]);
            setViewMode("list");
            router.refresh();
        } else {
            alert("Feil ved lagring av rom");
        }
    }
  };

  const handleEditRoom = (room: Room) => {
      setSelectedRoom(room);
      setViewMode("edit");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Er du sikker på at du vil slette dette rommet?")) {
        const result = await deleteRoom(id, unitId);
        if (result.success) {
            setRooms(rooms.filter(s => s.id !== id));
            router.refresh();
        }
    }
  };

  const getRoomTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LIVING_ROOM: "Stue",
      KITCHEN: "Kjøkken",
      BEDROOM: "Soverom",
      BATHROOM: "Bad",
      HALLWAY: "Gang",
      STORAGE: "Bod",
      BALCONY: "Balkong",
      GARAGE: "Garasje",
      OTHER: "Annet"
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {viewMode === "list" && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Lagrede Rom</h2>
            <Button onClick={() => setViewMode("create")}>
              <Plus className="mr-2 h-4 w-4" />
              Nytt Rom
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-slate-50 border border-dashed rounded-xl">
                <Box className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Ingen rom ennå</h3>
                <p className="text-slate-500 mb-6">Registrer ditt første rom for å se det her.</p>
                <Button onClick={() => setViewMode("create")}>Registrer Rom</Button>
              </div>
            ) : (
              rooms.map((room) => (
                <Card key={room.id} className="overflow-hidden group hover:shadow-lg transition-all flex flex-col">
                  <div 
                    className="h-40 bg-slate-100 relative cursor-pointer flex items-center justify-center border-b overflow-hidden"
                    onClick={() => {
                      if (room.scanUrl) {
                        setCurrentModelUrl(room.scanUrl);
                        setViewMode("view");
                      }
                    }}
                  >
                    {room.images && room.images.length > 0 ? (
                       // Show first image if available
                       <div className="relative w-full h-full">
                           <Image 
                                src={room.images[0].url} 
                                alt={room.name} 
                                fill 
                                className="object-cover"
                           />
                           {room.scanUrl && (
                                <Badge className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 z-10">3D</Badge>
                           )}
                           {room.scanUrl && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center z-20">
                                    <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-xs px-2 py-1 rounded transition-opacity">
                                        Vis 3D Modell
                                    </span>
                                </div>
                           )}
                       </div>
                    ) : room.scanUrl ? (
                      <>
                        <Box className="h-16 w-16 text-blue-400 group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-xs px-2 py-1 rounded transition-opacity">
                            Vis 3D Modell
                          </span>
                        </div>
                        <Badge className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600">3D</Badge>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-slate-300">
                        <Home className="h-12 w-12 mb-2" />
                        <span className="text-xs">Ingen media</span>
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span>{room.name}</span>
                          <span className="text-xs font-normal text-muted-foreground mt-1">
                            {getRoomTypeLabel(room.type)}
                          </span>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => {
                                e.stopPropagation();
                                handleEditRoom(room);
                            }}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(room.id);
                            }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2 flex-grow">
                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                      {room.sizeSqm && (
                        <div className="flex items-center gap-2">
                          <Maximize className="h-4 w-4 text-slate-400" />
                          <span>{room.sizeSqm} m²</span>
                        </div>
                      )}
                      {room.description && (
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                          <span className="line-clamp-2">{room.description}</span>
                        </div>
                      )}
                      {room.images && room.images.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                              <ImageIcon className="h-3 w-3" />
                              <span>{room.images.length} bilde{room.images.length !== 1 ? 'r' : ''}</span>
                          </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground pt-2 border-t mt-auto">
                    Opprettet {new Date(room.createdAt).toLocaleDateString("no-NO")}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {viewMode === "create" && (
        <RoomForm 
          onSave={handleSaveRoom} 
          onCancel={() => setViewMode("list")} 
        />
      )}

      {viewMode === "edit" && selectedRoom && (
        <RoomForm 
            onSave={handleSaveRoom} 
            onCancel={() => {
                setViewMode("list");
                setSelectedRoom(null);
            }} 
            initialData={selectedRoom}
        />
      )}

      {viewMode === "view" && currentModelUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-300">
          <div className="absolute top-4 left-4 z-10">
            <Button variant="secondary" onClick={() => setViewMode("list")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbake til oversikt
            </Button>
          </div>
          <div className="flex-1 w-full h-full">
            <ModelViewer url={currentModelUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
