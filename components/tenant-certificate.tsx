"use client";

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantCertificateProps {
  name: string;
  issueDate: Date;
  score?: number;
  stars?: number;
  id: string;
  variant?: "digital" | "print";
  memberSince?: Date;
  baseUrl?: string;
}

export function TenantCertificate({
  name,
  issueDate,
  score = 10,
  stars = 0,
  id,
  variant = "digital",
  memberSince,
  baseUrl,
}: TenantCertificateProps) {
  const resolvedBaseUrl =
    baseUrl ||
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "");

  const verificationUrl = resolvedBaseUrl
    ? `${resolvedBaseUrl.replace(/\/+$/, "")}/verify/${id}`
    : `/verify/${id}`;
  
  const getYear = (date: any) => {
    if (!date) return new Date().getFullYear();
    if (typeof date.getFullYear === 'function') return date.getFullYear();
    return new Date(date).getFullYear();
  };

  const memberSinceYear = getYear(memberSince || issueDate);

  // Tier Logic
  const getTier = (s: number) => {
    if (s >= 10) return { 
        name: "Diamant", 
        color: "text-cyan-300", 
        bg: "bg-cyan-500/20", 
        border: "border-cyan-500/50",
        iconColor: "text-cyan-300"
    };
    if (s >= 6) return { 
        name: "Gull", 
        color: "text-yellow-400", 
        bg: "bg-yellow-500/20", 
        border: "border-yellow-500/50",
        iconColor: "text-yellow-400"
    };
    if (s >= 1) return { 
        name: "Sølv", 
        color: "text-slate-300", 
        bg: "bg-slate-500/20", 
        border: "border-slate-500/50",
        iconColor: "text-slate-300"
    };
    // Default to Standard (Green) for 0 stars
    return { 
        name: "Standard", 
        color: "text-emerald-300", 
        bg: "bg-emerald-500/20", 
        border: "border-emerald-500/50",
        iconColor: "text-emerald-300"
    };
  };

  const tier = getTier(stars);

  // Document Text Logic
  let certText = "Har gjennomført et leieforhold med fremragende resultater og har oppnådd status som";
  let statusLabel = "VERIFISERT LEIETAKER";

  if (tier.name === "Sølv") {
    certText = "Denne leietakeren har gjennom eget initiativ og positive bidrag under leieforholdet oppnådd status som";
    statusLabel = "SØLV-LEIETAKER (VERIFISERT)";
  } else if (tier.name === "Gull") {
    certText = "Denne leietakeren har gjennom eget initiativ og ekstraordinære positive bidrag under leieforholdet oppnådd status som";
    statusLabel = "GULL-LEIETAKER (VERIFISERT)";
  } else if (tier.name === "Diamant") {
    certText = "Denne leietakeren har gjennom vedvarende initiativ og betydelige positive bidrag under leieforholdet oppnådd status som";
    statusLabel = "DIAMANT-LEIETAKER (VERIFISERT)";
  }
  
  const getPrintColor = (tierName: string) => {
    switch (tierName) {
      case 'Diamant': return 'text-cyan-700';
      case 'Gull': return 'text-yellow-600';
      case 'Sølv': return 'text-slate-600';
      default: return 'text-emerald-700'; // Standard
    }
  };

  const printColor = getPrintColor(tier.name);

  if (variant === 'print') {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white p-12 shadow-xl print:shadow-none print:p-0">
        {/* Border Frame */}
        <div className="border-8 border-double border-slate-200 p-8 h-full flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}></div>
          </div>

          {/* Header */}
          <div className="mb-12 relative z-10">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-200">
               <ShieldCheck className="w-12 h-12 text-slate-800" />
            </div>
            <h1 className="text-5xl font-serif font-bold text-slate-900 mb-4 tracking-tight">LEIETAKERBEVIS</h1>
            <div className={cn("text-3xl font-bold uppercase tracking-widest flex items-center gap-2", printColor)}>
              <Star className="fill-current w-8 h-8" />
              {statusLabel}
              <Star className="fill-current w-8 h-8" />
            </div>
          </div>

          {/* Content */}
          <div className="max-w-2xl mx-auto space-y-8 relative z-10">
            <div className="space-y-2">
              <p className="text-slate-500 uppercase tracking-widest text-sm">Tildelt til</p>
              <h2 className="text-4xl font-serif font-bold text-slate-900">{name}</h2>
            </div>

            <div className="py-8 border-t border-b border-slate-200">
              <p className="text-xl leading-relaxed text-slate-700 font-serif italic">
                {certText}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-12 text-left">
              <div>
                <p className="text-slate-500 uppercase tracking-widest text-xs mb-1">Medlem siden</p>
                <p className="font-bold text-lg text-slate-900">{memberSinceYear}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase tracking-widest text-xs mb-1">Totalvurdering</p>
                <span className={cn("font-bold text-lg flex items-center gap-1", printColor)}>
                  {stars}/50
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Digital "Card" Variant
  return (
    <div className="relative w-full max-w-md aspect-[1.586] rounded-xl overflow-hidden shadow-2xl text-white transform transition-all hover:scale-[1.02] duration-300 mx-auto">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"></div>
      
      {/* Gold/Color Accents based on Tier */}
      <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full pointer-events-none opacity-20", 
          tier.name === 'Diamant' ? 'bg-cyan-500' : 
          (tier.name === 'Gull' ? 'bg-yellow-500' : 
          (tier.name === 'Standard' ? 'bg-emerald-500' : 'bg-slate-400'))
      )}></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 px-6 pt-6 pb-9 flex flex-col justify-between h-full border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <ShieldCheck className={cn("w-8 h-8", tier.iconColor)} />
            <div>
              <h3 className="text-xs uppercase tracking-widest text-slate-400">Offisielt Dokument</h3>
              <h2 className="font-bold text-lg tracking-wide text-white">LEIETAKERBEVIS</h2>
            </div>
          </div>
          
          {/* Verified Badge & Tier */}
          <div className="flex flex-col items-end">
             <div className={cn("px-2 py-0.5 rounded-full border mb-1 mr-[-2px]", tier.bg, tier.border)}>
               <span className={cn("text-[9px] font-bold uppercase tracking-wider", tier.color)}>Verifisert</span>
             </div>
          </div>
        </div>

        {/* Chip & User Info */}
        <div className="flex items-center gap-4 my-4">
           <div className={cn("w-12 h-9 rounded bg-gradient-to-br shadow-inner opacity-80 flex items-center justify-center", 
              tier.name === 'Diamant' ? 'from-cyan-200 to-cyan-400' : 
              (tier.name === 'Gull' ? 'from-yellow-200 to-yellow-400' : 
              (tier.name === 'Standard' ? 'from-emerald-200 to-emerald-400' : 'from-slate-200 to-slate-400'))
           )}>
              <div className="w-8 h-5 border border-black/10 rounded-sm grid grid-cols-2 gap-[1px]">
                <div className="border border-black/10 rounded-[1px]"></div>
                <div className="border border-black/10 rounded-[1px]"></div>
                <div className="border border-black/10 rounded-[1px]"></div>
                <div className="border border-black/10 rounded-[1px]"></div>
              </div>
           </div>
           <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Navn</p>
              <p className="text-xl font-mono text-white tracking-wide">{name}</p>
           </div>
        </div>

        {/* Footer Info */}
        <div className="flex justify-between items-end">
          <div className="flex gap-8">
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Leietaker siden</p>
              <p className="font-mono text-white">{memberSinceYear}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Totalvurdering</p>
              <div className="flex items-center gap-1">
                <span className={cn("font-bold font-mono", tier.color)}>{stars}/50</span>
                <Star className={cn("w-3 h-3 fill-current", tier.iconColor)} />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-1 rounded-lg">
            <QRCodeSVG value={verificationUrl} size={60} />
          </div>
        </div>
      </div>
    </div>
  );
}
