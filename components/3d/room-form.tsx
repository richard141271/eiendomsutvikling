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
  wallsPaintType?: string;
  wallsGloss?: string;
  wallsColorCode?: string;
  ceilingPaintType?: string;
  ceilingGloss?: string;
  ceilingColorCode?: string;
  trimPaintType?: string;
  trimGloss?: string;
  trimColorCode?: string;
  doorsPaintType?: string;
  doorsGloss?: string;
  doorsColorCode?: string;
  windowsPaintType?: string;
  windowsGloss?: string;
  windowsColorCode?: string;
  paintNotes?: string;
  file?: File; // 3D model
  images?: File[]; // Standard images
}

export interface ExistingRoomData {
  id: string;
  name: string;
  type: string;
  sizeSqm?: number | null;
  description?: string | null;
  scanUrl?: string | null;
  wallsPaintType?: string | null;
  wallsGloss?: string | null;
  wallsColorCode?: string | null;
  ceilingPaintType?: string | null;
  ceilingGloss?: string | null;
  ceilingColorCode?: string | null;
  trimPaintType?: string | null;
  trimGloss?: string | null;
  trimColorCode?: string | null;
  doorsPaintType?: string | null;
  doorsGloss?: string | null;
  doorsColorCode?: string | null;
  windowsPaintType?: string | null;
  windowsGloss?: string | null;
  windowsColorCode?: string | null;
  paintNotes?: string | null;
  images?: { id: string; url: string }[];
}

interface RoomFormProps {
  onSave: (data: RoomData) => void;
  onCancel: () => void;
  initialData?: ExistingRoomData;
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

export default function RoomForm({ onSave, onCancel, initialData }: RoomFormProps) {
  const [step, setStep] = useState<"details" | "scan">("details");
  
  // Form State
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState(initialData?.type || "OTHER");
  const [sizeSqm, setSizeSqm] = useState(initialData?.sizeSqm?.toString() || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [wallsPaintType, setWallsPaintType] = useState(initialData?.wallsPaintType || "");
  const [wallsGloss, setWallsGloss] = useState(initialData?.wallsGloss || "");
  const [wallsColorCode, setWallsColorCode] = useState(initialData?.wallsColorCode || "");
  const [ceilingPaintType, setCeilingPaintType] = useState(initialData?.ceilingPaintType || "");
  const [ceilingGloss, setCeilingGloss] = useState(initialData?.ceilingGloss || "");
  const [ceilingColorCode, setCeilingColorCode] = useState(initialData?.ceilingColorCode || "");
  const [trimPaintType, setTrimPaintType] = useState(initialData?.trimPaintType || "");
  const [trimGloss, setTrimGloss] = useState(initialData?.trimGloss || "");
  const [trimColorCode, setTrimColorCode] = useState(initialData?.trimColorCode || "");
  const [doorsPaintType, setDoorsPaintType] = useState(initialData?.doorsPaintType || "");
  const [doorsGloss, setDoorsGloss] = useState(initialData?.doorsGloss || "");
  const [doorsColorCode, setDoorsColorCode] = useState(initialData?.doorsColorCode || "");
  const [windowsPaintType, setWindowsPaintType] = useState(initialData?.windowsPaintType || "");
  const [windowsGloss, setWindowsGloss] = useState(initialData?.windowsGloss || "");
  const [windowsColorCode, setWindowsColorCode] = useState(initialData?.windowsColorCode || "");
  const [paintNotes, setPaintNotes] = useState(initialData?.paintNotes || "");
  
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
    const normalize = (value: string) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };
    onSave({
      name,
      type,
      sizeSqm: sizeSqm ? parseFloat(sizeSqm) : undefined,
      description,
      wallsPaintType: normalize(wallsPaintType),
      wallsGloss: normalize(wallsGloss),
      wallsColorCode: normalize(wallsColorCode),
      ceilingPaintType: normalize(ceilingPaintType),
      ceilingGloss: normalize(ceilingGloss),
      ceilingColorCode: normalize(ceilingColorCode),
      trimPaintType: normalize(trimPaintType),
      trimGloss: normalize(trimGloss),
      trimColorCode: normalize(trimColorCode),
      doorsPaintType: normalize(doorsPaintType),
      doorsGloss: normalize(doorsGloss),
      doorsColorCode: normalize(doorsColorCode),
      windowsPaintType: normalize(windowsPaintType),
      windowsGloss: normalize(windowsGloss),
      windowsColorCode: normalize(windowsColorCode),
      paintNotes: normalize(paintNotes),
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
          <h2 className="text-2xl font-bold text-white">{initialData ? "Rediger Rom" : "Registrer Rom"}</h2>
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

              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">Maling (valgfritt)</h3>
                  <p className="text-sm text-slate-400">Registrer malingstype, glans og fargenummer per overflate.</p>
                </div>

                <div className="space-y-2">
                  <Label>Vegger</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      value={wallsPaintType}
                      onChange={(e) => setWallsPaintType(e.target.value)}
                      placeholder="Malingstype"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={wallsGloss}
                      onChange={(e) => setWallsGloss(e.target.value)}
                      placeholder="Glans"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={wallsColorCode}
                      onChange={(e) => setWallsColorCode(e.target.value)}
                      placeholder="Fargenr / kode"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tak</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      value={ceilingPaintType}
                      onChange={(e) => setCeilingPaintType(e.target.value)}
                      placeholder="Malingstype"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={ceilingGloss}
                      onChange={(e) => setCeilingGloss(e.target.value)}
                      placeholder="Glans"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={ceilingColorCode}
                      onChange={(e) => setCeilingColorCode(e.target.value)}
                      placeholder="Fargenr / kode"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Lister</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      value={trimPaintType}
                      onChange={(e) => setTrimPaintType(e.target.value)}
                      placeholder="Malingstype"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={trimGloss}
                      onChange={(e) => setTrimGloss(e.target.value)}
                      placeholder="Glans"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={trimColorCode}
                      onChange={(e) => setTrimColorCode(e.target.value)}
                      placeholder="Fargenr / kode"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Dører</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      value={doorsPaintType}
                      onChange={(e) => setDoorsPaintType(e.target.value)}
                      placeholder="Malingstype"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={doorsGloss}
                      onChange={(e) => setDoorsGloss(e.target.value)}
                      placeholder="Glans"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={doorsColorCode}
                      onChange={(e) => setDoorsColorCode(e.target.value)}
                      placeholder="Fargenr / kode"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Vinduer</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      value={windowsPaintType}
                      onChange={(e) => setWindowsPaintType(e.target.value)}
                      placeholder="Malingstype"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={windowsGloss}
                      onChange={(e) => setWindowsGloss(e.target.value)}
                      placeholder="Glans"
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      value={windowsColorCode}
                      onChange={(e) => setWindowsColorCode(e.target.value)}
                      placeholder="Fargenr / kode"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paintNotes">Andre viktige malingsnotater</Label>
                  <Textarea
                    id="paintNotes"
                    value={paintNotes}
                    onChange={(e) => setPaintNotes(e.target.value)}
                    placeholder="F.eks. merke, base, batchnr, antall strøk, grunning, dato malt..."
                    className="bg-slate-800 border-slate-700 min-h-[80px]"
                  />
                </div>
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
                        
                        {/* Existing Images */}
                        {initialData?.images && initialData.images.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-slate-400 mb-2">Eksisterende bilder</h4>
                                <div className="grid grid-cols-4 gap-4">
                                    {initialData.images.map((img) => (
                                        <div key={img.id} className="relative aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={img.url} 
                                                alt="Existing" 
                                                className="w-full h-full object-cover opacity-75"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                {/* No delete functionality for existing images yet */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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

                        {initialData?.scanUrl && !file && (
                            <div className="flex items-center gap-4 p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg mb-4">
                                <div className="bg-blue-500/20 p-2 rounded-full">
                                    <Box className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-blue-400">Eksisterende 3D-modell</p>
                                    <p className="text-xs text-blue-500/70">Last opp ny fil for å erstatte</p>
                                </div>
                            </div>
                        )}

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
                    {initialData 
                        ? (file || images.length > 0 ? "Oppdater Rom & Media" : "Oppdater Rom")
                        : (file ? "Lagre Rom & 3D" : "Lagre Rom")
                    }
                </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
