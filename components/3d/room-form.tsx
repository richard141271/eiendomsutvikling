"use client";

import { useState, useRef } from "react";
import { Upload, X, Check, Smartphone, Layers, Box, ArrowRight, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  file?: File; // 3D model
  images?: File[]; // Standard images
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
  
  // 3D Model File
  const [file, setFile] = useState<File | null>(null);
  
  // Regular Images
  const [images, setImages] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleSave = () => {
    if (!name) return alert("Navn er påkrevd");
    onSave({
      name,
      type,
      sizeSqm: sizeSqm ? parseFloat(sizeSqm) : undefined,
      description,
      file: file || undefined,
      images: images.length > 0 ? images : undefined
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
            {step === "details" ? "Fyll inn detaljer om rommet" : "Last opp bilder eller skann rommet"}
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
                  Neste: Bilder & 3D <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "scan" && (
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardContent className="pt-6 space-y-6">
                    {/* Images Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">Bilder</h3>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => imageInputRef.current?.click()}
                                className="border-slate-700 hover:bg-slate-800"
                            >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Legg til bilder
                            </Button>
                        </div>
                        
                        {images.length > 0 ? (
                            <div className="grid grid-cols-4 gap-4">
                                {images.map((img, i) => (
                                    <div key={i} className="relative aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                                        {/* In a real app we'd use URL.createObjectURL(img) */}
                                        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                                            {img.name.substring(0, 10)}...
                                        </div>
                                        <button 
                                            onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                                            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full hover:bg-red-500/80 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg text-slate-500 text-sm">
                                Ingen bilder lagt til ennå
                            </div>
                        )}
                        <input
                            type="file"
                            ref={imageInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                        />
                    </div>

                    <div className="h-px bg-slate-800 my-6" />

                    {/* 3D Model Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                             <h3 className="text-lg font-medium">3D Modell</h3>
                             {file && (
                                 <Button 
                                     variant="ghost" 
                                     size="sm" 
                                     className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                     onClick={() => setFile(null)}
                                 >
                                     Fjern modell
                                 </Button>
                             )}
                        </div>

                        {file ? (
                            <div className="flex items-center gap-4 p-4 bg-green-900/20 border border-green-900/50 rounded-lg">
                                <div className="bg-green-500/20 p-2 rounded-full">
                                    <Check className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-green-400">3D-modell klar</p>
                                    <p className="text-xs text-green-500/70">{file.name}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 text-sm text-blue-200 space-y-2">
                                    <p className="font-semibold flex items-center gap-2">
                                        <Smartphone className="h-4 w-4" />
                                        Scan med iPhone 15 Pro Max (LiDAR)
                                    </p>
                                    <ol className="list-decimal list-inside space-y-1 text-slate-400 ml-1">
                                        <li>Last ned en skanne-app (f.eks. <strong>Polycam</strong> eller <strong>Scaniverse</strong>)</li>
                                        <li>Scan rommet med appen</li>
                                        <li>Eksporter som <strong>.USDZ</strong> eller <strong>.GLB</strong></li>
                                        <li>Last opp filen her</li>
                                    </ol>
                                </div>
                                
                                <Button 
                                    variant="outline" 
                                    className="w-full h-24 flex flex-col gap-2 border-slate-700 hover:bg-slate-800 border-dashed"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-8 w-8 text-blue-500" />
                                    <span className="text-lg">Last opp 3D-fil</span>
                                    <span className="text-xs text-slate-500 font-normal">Støtter .USDZ, .GLB, .GLTF, .OBJ</span>
                                </Button>
                            </div>
                        )}
                         <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".glb,.gltf,.usdz,.obj"
                            onChange={handleFileUpload}
                        />
                    </div>

                </CardContent>
            </Card>
            
            <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep("details")} className="text-white hover:bg-white/10">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake
                </Button>
                <Button 
                    onClick={handleSave} 
                    className="bg-blue-600 hover:bg-blue-700 min-w-[200px]"
                >
                    {file ? "Lagre Rom & 3D" : "Lagre Rom"}
                </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
