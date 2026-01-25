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
      <div className="w-full max-w-4xl mx-auto bg-white p-16 shadow-xl print:shadow-none print:p-0 font-serif">
        {/* Border Frame */}
        <div className="border border-slate-300 p-12 h-full flex flex-col items-center text-center relative">
          
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-5xl font-serif text-slate-900 mb-2 tracking-wide uppercase">LEIETAKERBEVIS</h1>
            <p className="text-slate-500 italic text-xl font-serif">Utstedt av Halden Eiendomsutvikling</p>
          </div>

          <div className="w-3/4 h-px bg-slate-300 mb-12"></div>

          {/* Main Content */}
          <div className="space-y-6 mb-12">
            <p className="text-slate-700 text-lg">Det bekreftes herved at</p>
            <h2 className="text-5xl font-serif font-bold text-slate-900 py-4">{name}</h2>
            <div className="max-w-2xl mx-auto">
               <p className="text-slate-700 text-lg leading-relaxed">
                 har gjennomført et leieforhold med fremragende resultater og har oppnådd status som
               </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-16 relative">
            <div className="absolute inset-0 bg-slate-50 opacity-50 blur-xl rounded-full transform -translate-y-2"></div>
            <div className={cn("relative text-3xl font-bold uppercase tracking-widest flex items-center justify-center gap-3", printColor)}>
              <Star className="fill-current w-6 h-6" />
              {tier.name === 'Standard' ? 'VERIFISERT LEIETAKER' : `${tier.name.toUpperCase()} LEIETAKER`}
              <Star className="fill-current w-6 h-6" />
            </div>
          </div>

          {/* Assessment & QR Section */}
          <div className="flex justify-between items-end w-full max-w-3xl px-8 mb-16">
             {/* Left: Assessment Box */}
             <div className="bg-slate-50 p-6 rounded-sm w-80">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                   <span className="font-bold text-slate-900 uppercase tracking-wider text-sm">VURDERING</span>
                   <span className={cn("font-bold flex items-center gap-1", printColor)}>
                     {stars}/10 <Star className="w-3 h-3 fill-current" />
                   </span>
                </div>
                <div className="space-y-2 text-sm">
                   <div className="flex justify-between items-center text-slate-700">
                      <span>Betalingsevne</span>
                      <div className="flex text-slate-900">★★★★★</div>
                   </div>
                   <div className="flex justify-between items-center text-slate-700">
                      <span>Orden & Renhold</span>
                      <div className="flex text-slate-900">★★★★★</div>
                   </div>
                   <div className="flex justify-between items-center text-slate-700">
                      <span>Naboforhold</span>
                      <div className="flex text-slate-900">★★★★★</div>
                   </div>
                </div>
             </div>

             {/* Right: QR Code */}
             <div className="flex flex-col items-center">
                <div className="border-4 border-slate-900 p-2 mb-2">
                   <QRCodeSVG value={verificationUrl} size={100} />
                </div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">SCAN FOR Å VERIFISERE</p>
                <p className="text-[8px] font-mono text-slate-400 max-w-[150px] truncate text-center">{id}</p>
             </div>
          </div>

          {/* Footer Line */}
          <div className="w-full h-px bg-slate-200 mb-8"></div>

          {/* Footer Signature */}
          <div className="flex justify-between items-end w-full px-4 text-slate-500 text-xs uppercase tracking-widest">
             <div className="text-left w-1/3">
                <div className="h-px bg-slate-300 w-full mb-2"></div>
                DATO: {issueDate ? new Date(issueDate).toLocaleDateString('no-NO') : new Date().toLocaleDateString('no-NO')}
             </div>
             
             <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                Halden Eiendomsutvikling
             </div>

             <div className="text-right w-1/3">
                <div className="text-xl font-handwriting normal-case text-slate-900 mb-1 font-serif italic">Signert Digitalt</div>
                <div className="h-px bg-slate-300 w-full mb-2"></div>
                SIGNATUR
             </div>
          </div>

        </div>
      </div>
    );
  }

  // Digital "Card" Variant
  return (
    <div className="relative w-full max-w-md aspect-[1.586] rounded-xl overflow-hidden shadow-2xl text-white transform transition-all hover:scale-[1.02] duration-300 mx-auto font-sans">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-slate-900 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50"></div>
      </div>
      
      {/* Color Accents based on Tier */}
      <div className={cn("absolute -top-10 -right-10 w-40 h-40 blur-3xl rounded-full pointer-events-none opacity-20", 
          tier.name === 'Diamant' ? 'bg-cyan-500' : 
          (tier.name === 'Gull' ? 'bg-yellow-500' : 
          (tier.name === 'Standard' ? 'bg-emerald-500' : 'bg-slate-400'))
      )}></div>
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 p-8 flex flex-col justify-between h-full border border-white/5 rounded-xl bg-white/5 backdrop-blur-sm shadow-inner">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <ShieldCheck className={cn("w-10 h-10 mt-1", tier.iconColor)} />
            <div className="flex flex-col">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">Offisielt Dokument</h3>
              <h2 className="text-xl font-bold tracking-wide text-white leading-tight">LEIETAKERBEVIS</h2>
            </div>
          </div>
          
          {/* Verified Badge */}
          <div className="flex flex-col items-end gap-1">
             <div className={cn("px-2.5 py-0.5 rounded-full border border-opacity-50 mr-[-4px]", tier.bg, tier.border)}>
               <span className={cn("text-[9px] font-bold uppercase tracking-widest", tier.color)}>Verifisert</span>
             </div>
          </div>
        </div>

        {/* Chip & User Info */}
        <div className="flex items-center gap-5 mt-2">
           <div className={cn("w-14 h-10 rounded-md bg-gradient-to-br shadow-lg flex items-center justify-center relative overflow-hidden", 
              tier.name === 'Diamant' ? 'from-cyan-200 to-cyan-500' : 
              (tier.name === 'Gull' ? 'from-yellow-200 to-yellow-500' : 
              (tier.name === 'Standard' ? 'from-emerald-200 to-emerald-500' : 'from-slate-200 to-slate-400'))
           )}>
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              <div className="w-8 h-5 border border-black/20 rounded-sm grid grid-cols-2 gap-[1px] opacity-60">
                <div className="border border-black/20 rounded-[1px]"></div>
                <div className="border border-black/20 rounded-[1px]"></div>
                <div className="border border-black/20 rounded-[1px]"></div>
                <div className="border border-black/20 rounded-[1px]"></div>
              </div>
           </div>
           <div className="flex flex-col">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Navn</p>
              <p className="text-2xl font-mono text-white tracking-wide font-medium">{name}</p>
           </div>
        </div>

        {/* Footer Info */}
        <div className="flex justify-between items-end mt-4">
          <div className="flex gap-10">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Leietaker siden</p>
              <p className="text-lg font-medium text-white">{memberSinceYear}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Totalvurdering</p>
              <div className="flex items-center gap-1.5">
                <span className={cn("text-lg font-bold", tier.color)}>{stars}/50</span>
                <Star className={cn("w-4 h-4 fill-current", tier.iconColor)} />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-1.5 rounded-lg shadow-lg">
            <QRCodeSVG value={verificationUrl} size={55} />
          </div>
        </div>
      </div>
    </div>
  );
}
