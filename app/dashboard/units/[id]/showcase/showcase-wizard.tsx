"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";
import { saveRoomData, generateShowcaseReport } from "@/app/actions/showcase";
import { Loader2, Camera, CheckCircle2, ArrowRight, ArrowLeft, FileText, Home, Key } from "lucide-react";
import { useRouter } from "next/navigation";

interface ShowcaseWizardProps {
  unit: any; // We can improve typing if needed, but 'any' allows flexibility with Prisma includes
}

type ShowcaseType = "PROSPEKT" | "SALGSOPPGAVE" | "UTLEIEOPPGAVE";

const ROOM_OPTIONS = [
  { id: "gang", label: "Gang / Entré" },
  { id: "stue", label: "Stue" },
  { id: "kjøkken", label: "Kjøkken" },
  { id: "bad", label: "Bad" },
  { id: "soverom_1", label: "Soverom 1" },
  { id: "soverom_2", label: "Soverom 2" },
  { id: "soverom_3", label: "Soverom 3" },
  { id: "balkong", label: "Balkong / Terrasse" },
  { id: "ute", label: "Uteområde" },
  { id: "fasade", label: "Fasade" },
];

export function ShowcaseWizard({ unit }: ShowcaseWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "checklist" | "rooms" | "details" | "review">("type");
  const [showcaseType, setShowcaseType] = useState<ShowcaseType | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [roomData, setRoomData] = useState<Record<string, { images: string[]; notes: string }>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleTypeSelect = (type: ShowcaseType) => {
    setShowcaseType(type);
    setStep("checklist");
  };

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleStartCapture = () => {
    if (selectedRooms.length === 0) {
      alert("Du må velge minst ett rom");
      return;
    }
    setStep("rooms");
    setCurrentRoomIndex(0);
  };

  const handleRoomImageAdd = (url: string) => {
    const roomId = selectedRooms[currentRoomIndex];
    setRoomData((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        images: [...(prev[roomId]?.images || []), url],
        notes: prev[roomId]?.notes || "",
      },
    }));
  };

  const handleRoomImageRemove = (urlToRemove: string) => {
    const roomId = selectedRooms[currentRoomIndex];
    setRoomData((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        images: (prev[roomId]?.images || []).filter((url) => url !== urlToRemove),
      },
    }));
  };

  const handleNotesChange = (notes: string) => {
    const roomId = selectedRooms[currentRoomIndex];
    setRoomData((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        images: prev[roomId]?.images || [],
        notes,
      },
    }));
  };

  const handleNextRoom = async () => {
    setLoading(true);
    // Auto-save current room
    const roomId = selectedRooms[currentRoomIndex];
    const data = roomData[roomId];
    
    if (data) {
      const roomLabel = ROOM_OPTIONS.find(r => r.id === roomId)?.label || roomId;
      await saveRoomData(unit.id, roomLabel, data.images, data.notes);
    }

    setLoading(false);

    if (currentRoomIndex < selectedRooms.length - 1) {
      setCurrentRoomIndex((prev) => prev + 1);
    } else {
      setStep("details");
    }
  };

  const handlePreviousRoom = () => {
    if (currentRoomIndex > 0) {
      setCurrentRoomIndex((prev) => prev - 1);
    } else {
      setStep("checklist");
    }
  };
  
  const handleDetailsSubmit = () => {
      setStep("review");
  };

  const handleGenerate = async () => {
    if (!showcaseType) return;
    setLoading(true);
    try {
      const result = await generateShowcaseReport(unit.id, showcaseType);
      if (result.success) {
        alert("Rapport generert!");
        // Redirect or show download link
        router.refresh();
      } else {
        alert("Kunne ikke generere rapport");
      }
    } catch (error) {
      alert("Noe gikk galt");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER STEPS ---

  if (step === "type") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Velg type skrytemappe</h2>
        <div className="grid gap-4">
          <Button
            variant="outline"
            className="h-24 text-lg flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-200"
            onClick={() => handleTypeSelect("PROSPEKT")}
          >
            <FileText className="h-8 w-8 text-blue-600" />
            Lag Prospekt
          </Button>
          <Button
            variant="outline"
            className="h-24 text-lg flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:border-green-200"
            onClick={() => handleTypeSelect("SALGSOPPGAVE")}
          >
            <Home className="h-8 w-8 text-green-600" />
            Salgsoppgave
          </Button>
          <Button
            variant="outline"
            className="h-24 text-lg flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:border-purple-200"
            onClick={() => handleTypeSelect("UTLEIEOPPGAVE")}
          >
            <Key className="h-8 w-8 text-purple-600" />
            Utleieoppgave
          </Button>
        </div>
      </div>
    );
  }

  if (step === "checklist") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("type")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">Hvilke rom skal med?</h2>
        </div>
        
        <Card>
          <CardContent className="pt-6 grid gap-4">
            {ROOM_OPTIONS.map((room) => (
              <div key={room.id} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer" onClick={() => handleRoomToggle(room.id)}>
                <Checkbox 
                  id={room.id} 
                  checked={selectedRooms.includes(room.id)}
                  onCheckedChange={() => handleRoomToggle(room.id)}
                />
                <Label htmlFor={room.id} className="flex-1 cursor-pointer font-medium">
                  {room.label}
                </Label>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleStartCapture} disabled={selectedRooms.length === 0}>
              Start fotografering <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === "rooms") {
    const currentRoomId = selectedRooms[currentRoomIndex];
    const currentRoomLabel = ROOM_OPTIONS.find(r => r.id === currentRoomId)?.label || currentRoomId;
    const data = roomData[currentRoomId] || { images: [], notes: "" };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={handlePreviousRoom} disabled={loading}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Forrige
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Rom {currentRoomIndex + 1} av {selectedRooms.length}
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {currentRoomLabel}
            </CardTitle>
            <CardDescription>
              Ta bilder av rommet og legg til eventuelle notater.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Bilder</Label>
              <div className="grid grid-cols-2 gap-2">
                {data.images.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-md overflow-hidden border">
                    <img src={url} alt={`Room ${idx}`} className="object-cover w-full h-full" />
                    <button 
                      onClick={() => handleRoomImageRemove(url)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                    >
                      <span className="sr-only">Slett</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
                    </button>
                  </div>
                ))}
                
                {/* Use ImageUpload component - adapted for multiple adds */}
                <div className="aspect-square">
                    <ImageUpload 
                        value={null} // Always reset
                        onChange={handleRoomImageAdd}
                        label="Legg til"
                        onUploadStatusChange={(isUploading) => setLoading(isUploading)}
                    />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notater</Label>
              <Textarea 
                id="notes" 
                placeholder="F.eks. nylig oppusset, varmekabler i gulv..."
                value={data.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleNextRoom} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              {currentRoomIndex === selectedRooms.length - 1 ? "Ferdig" : "Neste rom"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">
          Detaljer for {showcaseType?.toLowerCase().replace("oppgave", "")}
        </h2>
        
        <Card>
          <CardContent className="pt-6 space-y-4">
            {showcaseType === "SALGSOPPGAVE" && (
              <>
                 <div className="space-y-2">
                  <Label htmlFor="price">Prisantydning</Label>
                  <Input 
                    id="price" 
                    placeholder="F.eks. 3 500 000"
                    value={details.price || ""}
                    onChange={(e) => setDetails(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="commonCost">Felleskostnader</Label>
                  <Input 
                    id="commonCost" 
                    placeholder="F.eks. 3 500"
                    value={details.commonCost || ""}
                    onChange={(e) => setDetails(prev => ({ ...prev, commonCost: e.target.value }))}
                  />
                </div>
              </>
            )}

            {showcaseType === "UTLEIEOPPGAVE" && (
              <>
                 <div className="space-y-2">
                  <Label htmlFor="rent">Månedsleie</Label>
                  <Input 
                    id="rent" 
                    placeholder="F.eks. 15 000"
                    value={details.rent || ""}
                    onChange={(e) => setDetails(prev => ({ ...prev, rent: e.target.value }))}
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="deposit">Depositum</Label>
                  <Input 
                    id="deposit" 
                    placeholder="F.eks. 45 000"
                    value={details.deposit || ""}
                    onChange={(e) => setDetails(prev => ({ ...prev, deposit: e.target.value }))}
                  />
                </div>
              </>
            )}
            
             <div className="space-y-2">
              <Label htmlFor="generalNotes">Generelle opplysninger</Label>
              <Textarea 
                id="generalNotes" 
                placeholder="Andre viktige opplysninger..."
                value={details.generalNotes || ""}
                onChange={(e) => setDetails(prev => ({ ...prev, generalNotes: e.target.value }))}
              />
            </div>

          </CardContent>
          <CardFooter>
             <Button className="w-full" onClick={handleDetailsSubmit}>
              Gå til oppsummering <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Se over og generer</h2>
        
        <div className="space-y-4">
          {selectedRooms.map((roomId) => {
            const label = ROOM_OPTIONS.find(r => r.id === roomId)?.label;
            const data = roomData[roomId];
            const imageCount = data?.images?.length || 0;
            
            return (
              <Card key={roomId}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{label}</CardTitle>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                  <p>{imageCount} bilder lastet opp</p>
                  {data?.notes && <p className="mt-1 italic">"{data.notes}"</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => setStep("rooms")}>
            Gå tilbake
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setStep("checklist")}>
            Legg til flere rom
          </Button>
          <Button className="flex-1" onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Generer {showcaseType?.toLowerCase().replace("oppgave", "")}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "success" && generatedUrl) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Rapport generert!</h2>
          <p className="text-muted-foreground">
            Din {showcaseType?.toLowerCase()} er nå klar til bruk.
          </p>
        </div>

        <Card className="p-6 bg-slate-50">
          <div className="flex flex-col gap-4">
            <a href={generatedUrl} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button size="lg" className="w-full gap-2">
                <FileText className="h-5 w-5" />
                Last ned / Åpne PDF
              </Button>
            </a>
            
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => router.push(`/dashboard/units/${unit.id}`)}>
                Tilbake til bolig
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Lag ny
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
