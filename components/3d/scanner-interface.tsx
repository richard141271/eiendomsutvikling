"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, Check, Smartphone, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ScannerInterfaceProps {
  onScanComplete: (file: File, name: string) => void;
  onCancel: () => void;
}

export default function ScannerInterface({ onScanComplete, onCancel }: ScannerInterfaceProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanName, setScanName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && scanName) {
      simulateProcessing(file);
    }
  };

  const simulateProcessing = (file: File) => {
    setIsScanning(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onScanComplete(file, scanName);
        }, 500);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={onCancel}
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)]">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Rom-skanner</h2>
          <p className="text-slate-400">Velg metode for å digitalisere rommet</p>
        </div>

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

            <div className="space-y-4 mb-6">
               <Label htmlFor="roomName" className="text-white">Navn på rom (f.eks. Stue)</Label>
               <Input 
                 id="roomName" 
                 placeholder="Skriv inn navn..." 
                 value={scanName}
                 onChange={(e) => setScanName(e.target.value)}
                 className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
               />
            </div>

            <TabsContent value="ios">
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="bg-blue-900/20 p-4 rounded-full w-fit mx-auto">
                    <Smartphone className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-medium">LiDAR-skanning (iOS)</h3>
                    <p className="text-sm text-slate-400">
                      Bruk en iPhone/iPad Pro med LiDAR for best resultat. Last opp .USDZ eller .GLB filen her.
                    </p>
                  </div>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                    onClick={() => {
                      if (!scanName) return alert("Vennligst gi rommet et navn først");
                      fileInputRef.current?.click();
                    }}
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
                      Ta 20-40 bilder rundt i rommet. Vi genererer 3D-modellen i skyen.
                    </p>
                  </div>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="lg"
                    onClick={() => {
                       if (!scanName) return alert("Vennligst gi rommet et navn først");
                       // Mock action for photogrammetry
                       alert("Kamera åpnes... (Mock)");
                    }}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Ta bilder
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
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
    </div>
  );
}
