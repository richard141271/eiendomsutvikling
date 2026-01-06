"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InspectionProtocol, InspectionCheckpoint, CheckpointImage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { updateCheckpoint, updateProtocolDetails, signProtocol, addCheckpointImage, deleteCheckpointImage } from "@/app/actions/inspection-actions";
import { Loader2, Check, X, AlertCircle, Camera, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRef } from "react";

type CheckpointWithImages = InspectionCheckpoint & { images: CheckpointImage[] };

type ProtocolWithRelations = InspectionProtocol & {
  checkpoints: CheckpointWithImages[];
};

interface InspectionFormProps {
  protocol: ProtocolWithRelations;
  isOwner: boolean;
  isTenant: boolean;
}

export function InspectionForm({ protocol, isOwner, isTenant }: InspectionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [meterReading, setMeterReading] = useState(protocol.electricityMeterReading || "");
  const [keysCount, setKeysCount] = useState(protocol.keysHandedOver?.toString() || "");
  const [notes, setNotes] = useState(protocol.notes || "");

  // Group checkpoints by room
  const checkpointsByRoom = protocol.checkpoints.reduce((acc, cp) => {
    if (!acc[cp.roomName]) acc[cp.roomName] = [];
    acc[cp.roomName].push(cp);
    return acc;
  }, {} as Record<string, typeof protocol.checkpoints>);

  const handleDetailsSave = async () => {
    setLoading(true);
    try {
      await updateProtocolDetails(protocol.id, {
        electricityMeterReading: meterReading,
        keysHandedOver: parseInt(keysCount) || 0,
        notes
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    setLoading(true);
    try {
      const role = isOwner ? "OWNER" : "TENANT";
      await signProtocol(protocol.id, role);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const isSignedByMe = isOwner ? protocol.signedByOwner : protocol.signedByTenant;
  const canEdit = !protocol.signedByOwner || !protocol.signedByTenant; // Can edit until both signed? Or lock after self sign? Usually lock after self sign.
  const isLocked = isSignedByMe; 

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Generell Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Strømmålerstand</Label>
              <Input 
                value={meterReading} 
                onChange={(e) => setMeterReading(e.target.value)} 
                onBlur={handleDetailsSave}
                disabled={isLocked}
                placeholder="F.eks. 12345 kWh"
              />
            </div>
            <div className="space-y-2">
              <Label>Antall nøkler overlevert</Label>
              <Input 
                type="number"
                value={keysCount} 
                onChange={(e) => setKeysCount(e.target.value)} 
                onBlur={handleDetailsSave}
                disabled={isLocked}
                placeholder="3"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Generelle merknader</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              onBlur={handleDetailsSave}
              disabled={isLocked}
              placeholder="Andre observasjoner..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Sjekkliste rom for rom</h2>
        {Object.entries(checkpointsByRoom).map(([roomName, checkpoints]) => (
          <Card key={roomName}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{roomName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkpoints.map((cp) => (
                  <CheckpointItem 
                    key={cp.id} 
                    checkpoint={cp} 
                    disabled={isLocked} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded-full", protocol.signedByOwner ? "bg-green-500" : "bg-gray-300")} />
              <span>Utleier {protocol.signedByOwner ? "(Signert)" : "(Venter)"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded-full", protocol.signedByTenant ? "bg-green-500" : "bg-gray-300")} />
              <span>Leietaker {protocol.signedByTenant ? "(Signert)" : "(Venter)"}</span>
            </div>
          </div>

          {!isSignedByMe && (
            <Button onClick={handleSign} disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Signer protokoll som {isOwner ? "Utleier" : "Leietaker"}
            </Button>
          )}
          
          {isSignedByMe && (
            <p className="text-sm text-green-600 font-medium">
              Du har signert denne protokollen.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CheckpointItem({ checkpoint, disabled }: { checkpoint: CheckpointWithImages, disabled: boolean }) {
  const [status, setStatus] = useState(checkpoint.status);
  const [notes, setNotes] = useState(checkpoint.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = async (newStatus?: string, newNotes?: string) => {
    setIsSaving(true);
    try {
      await updateCheckpoint(checkpoint.id, {
        status: newStatus || status,
        notes: newNotes !== undefined ? newNotes : notes
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { imageUrl } = await res.json();
      await addCheckpointImage(checkpoint.id, imageUrl);
      
    } catch (error) {
      console.error(error);
      alert("Kunne ikke laste opp bilde");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (imageId: string) => {
     if (!confirm("Er du sikker på at du vil slette bildet?")) return;
     await deleteCheckpointImage(imageId);
  }

  return (
    <div className="flex flex-col gap-3 py-4 border-b last:border-0">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-32 font-medium">{checkpoint.element}</div>
        
        <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
          <Select 
            value={status} 
            onValueChange={(val) => { setStatus(val); handleUpdate(val); }}
            disabled={disabled}
          >
            <SelectTrigger className={cn("w-[140px]", 
              status === "OK" && "text-green-600",
              status === "NOT_OK" && "text-red-600",
              status === "FIXED" && "text-blue-600"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OK">OK</SelectItem>
              <SelectItem value="NOT_OK">Avvik</SelectItem>
              <SelectItem value="FIXED">Utbedret</SelectItem>
            </SelectContent>
          </Select>

          <Input 
            className="flex-1" 
            placeholder="Kommentar..." 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => handleUpdate(undefined, notes)}
            disabled={disabled}
          />
          
          <div className="flex items-center gap-2">
             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
                disabled={disabled || isUploading}
             />
             <Button 
               variant="outline" 
               size="icon" 
               onClick={() => fileInputRef.current?.click()}
               disabled={disabled || isUploading}
               title="Legg til bilde"
             >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
             </Button>
          </div>
        </div>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {checkpoint.images.length > 0 && (
        <div className="flex gap-2 flex-wrap ml-0 sm:ml-36">
           {checkpoint.images.map(img => (
             <div key={img.id} className="relative group">
               <div className="relative h-20 w-20 rounded-md overflow-hidden border">
                 <Image 
                   src={img.url} 
                   alt="Documentation" 
                   fill 
                   className="object-cover"
                 />
               </div>
               {!disabled && (
                 <button 
                   onClick={() => handleDeleteImage(img.id)}
                   className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <X className="h-3 w-3" />
                 </button>
               )}
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
