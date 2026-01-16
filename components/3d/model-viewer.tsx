"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Stage, OrbitControls, Environment, Grid } from "@react-three/drei";
import { Loader2, Maximize2, RotateCcw, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ModelViewerProps {
  url: string;
  autoRotate?: boolean;
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function ModelViewer({ url, autoRotate = false }: ModelViewerProps) {
  const [showGrid, setShowGrid] = useState(true);
  const [intensity, setIntensity] = useState(1);
  const [measureMode, setMeasureMode] = useState(false);

  return (
    <div className="relative w-full h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowGrid(!showGrid)}
          title="Vis/Skjul rutenett"
          className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border-0"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant={measureMode ? "default" : "secondary"}
          size="icon"
          onClick={() => setMeasureMode(!measureMode)}
          title="Måleverktøy"
          className={`backdrop-blur-md border-0 ${
            measureMode 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
        >
          <Ruler className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setIntensity(1)}
          title="Tilbakestill lys"
          className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border-0"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Lighting Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/50 backdrop-blur-md p-4 rounded-lg border border-white/10">
        <div className="flex items-center gap-4">
          <span className="text-xs text-white font-medium">Lysstyrke</span>
          <Slider
            value={[intensity]}
            onValueChange={(v) => setIntensity(v[0])}
            min={0}
            max={3}
            step={0.1}
            className="flex-1"
          />
        </div>
      </div>

      {/* Measure Mode Indicator */}
      {measureMode && (
        <div className="absolute top-4 left-4 z-10 bg-blue-600/90 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          Måleverktøy Aktivt
        </div>
      )}

      <Canvas shadows dpr={[1, 2]} camera={{ fov: 50 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={intensity} adjustCamera>
            <Model url={url} />
          </Stage>
          {showGrid && (
            <Grid
              renderOrder={-1}
              position={[0, 0, 0]}
              infiniteGrid
              cellSize={1}
              sectionSize={5}
              fadeDistance={50}
              sectionColor="#ffffff"
              cellColor="#666666"
            />
          )}
        </Suspense>
        <OrbitControls autoRotate={autoRotate} makeDefault />
        <Environment preset="apartment" />
      </Canvas>

      {/* Loading Fallback (handled by parent Suspense usually, but good to have) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Suspense fallback={<Loader2 className="h-8 w-8 text-white animate-spin" />}>
          {null}
        </Suspense>
      </div>
    </div>
  );
}
