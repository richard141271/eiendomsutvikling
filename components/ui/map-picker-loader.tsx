
"use client";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./map-picker"), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-slate-100 animate-pulse rounded-md flex items-center justify-center text-slate-400">Laster kart...</div>
});

export default MapPicker;
