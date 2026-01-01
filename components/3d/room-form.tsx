"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, Check, Smartphone, Layers, Box, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface RoomData {
  name: string;
  type: string;
  sizeSqm?: number;
  description?: string;
  file?: File;
}

interface RoomFormProps {
  onSave: (data: RoomData) => void;
  onCancel: () => void;
}

const ROOM_TYPES = [
  { value: "LIVING_ROOM", label: "Stue" },
  { value: "KITCHEN", label: "Kjøkken" },
  { value: "BEDROOM", label: "Soverom" },
  { value: "BATHROOM", label: "Bad" },
  { value: "HALLWAY", label: "Gang" },
  { value: "STORAGE", label: "Bod" },
  { value: "BALCONY", label: "Balkong" },
  { value: "GARAGE", label: "Garasje" },
  { value: "OTHER", label: "Annet" },
];

export default function RoomForm({ onSave, onCancel }: RoomFormProps) {
  const [step, setStep] = useState<"details" | "scan">("details");
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("OTHER");
  const [sizeSqm, setSizeSqm] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      simulateProcessing(selectedFile);
    }
  };

  const simulateProcessing = (f: File) => {
    setIsScanning(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setFile(f);
          setIsScanning(false);
        }, 500);
      }
    }, 50);
  };

  const handleSave = () => {
    if (!name) return alert("Navn er påkrevd");
    onSave({
      name,
      type,
      sizeSqm: sizeSqm ? parseFloat(sizeSqm) : undefined,
      description,
      file: file || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={onCancel}
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="max-w-2xl w-full space-y-8 my-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)]">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Registrer Rom</h2>
          <p className="text-slate-400">
            {step === "details" ? "Fyll inn detaljer om rommet" : "Last opp eller skann rommet (Valgfritt)"}
          </p>
        </div>

        {step === "details" && (
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Romnavn *</Label>
                  <Input 
                    id="name" 
                    placeholder="F.eks. Hovedsoverom" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Romtype</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Velg type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="size">Størrelse (kvm)</Label>
                <Input 
                  id="size" 
                  type="number"
                  placeholder="0" 
                  value={sizeSqm}
                  onChange={(e) => setSizeSqm(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea 
                  id="description" 
                  placeholder="Beskriv rommet..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-800 border-slate-700 min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onCancel} className="bg-transparent border-slate-700 text-white hover:bg-slate-800">Avbryt</Button>
                <Button onClick={() => setStep("scan")} disabled={!name}>
                  Neste: 3D Scan <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "scan" && (
          <div className="space-y-6">
            {isScanning ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6 text-center">
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="animate-spin w-full h-full text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
                    {progress}%
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-medium">Prosesserer 3D-modell</h3>
                  <p className="text-sm text-slate-400">Genererer mesh og teksturer...</p>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ) : file ? (
               <Card className="bg-slate-900 border-slate-800 text-white">
                 <CardContent className="pt-6 text-center space-y-6">
                   <div className="w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                     <Check className="h-10 w-10 text-green-500" />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold">Skann lastet opp!</h3>
                     <p className="text-slate-400 mt-2">{file.name}</p>
                   </div>
                   <div className="flex gap-3 justify-center">
                     <Button variant="outline" onClick={() => setFile(null)} className="border-slate-700 text-white hover:bg-slate-800">
                       Endre fil
                     </Button>
                     <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                       Lagre Rom
                     </Button>
                   </div>
                 </CardContent>
               </Card>
            ) : (
              <Tabs defaultValue="ios" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-900 border border-slate-800">
                  <TabsTrigger value="ios" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Smartphone className="h-4 w-4 mr-2" />
                    LiDAR / AR
                  </TabsTrigger>
                  <TabsTrigger value="photo" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Camera className="h-4 w-4 mr-2" />
                    Fotogrammetri
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ios">
                  <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="pt-6 text-center space-y-4">
                      <div className="bg-blue-900/20 p-4 rounded-full w-fit mx-auto">
                        <Smartphone className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-white font-medium">LiDAR-skanning (iOS)</h3>
                        <p className="text-sm text-slate-400">
                          Last opp .USDZ eller .GLB filen her.
                        </p>
                      </div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="lg"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Last opp skann
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="photo">
                  <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="pt-6 text-center space-y-4">
                      <div className="bg-purple-900/20 p-4 rounded-full w-fit mx-auto">
                        <Camera className="h-8 w-8 text-purple-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-white font-medium">Bilde-til-3D</h3>
                        <p className="text-sm text-slate-400">
                          Ta bilder for å generere 3D-modell.
                        </p>
                      </div>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        size="lg"
                        onClick={() => alert("Mock: Kamera åpnes")}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Ta bilder
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <div className="flex justify-between pt-6">
                   <Button variant="ghost" onClick={() => setStep("details")} className="text-white hover:bg-white/10">
                     <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake
                   </Button>
                   <Button variant="outline" onClick={handleSave} className="border-slate-700 text-white hover:bg-slate-800">
                     Lagre uten 3D-modell
                   </Button>
                </div>
              </Tabs>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".glb,.gltf,.usdz,.obj"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>
    </div>
  );
}