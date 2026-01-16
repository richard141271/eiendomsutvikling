import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Star, Calendar, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantCertificateProps {
  name: string;
  issueDate: Date;
  score?: number; // 1-10
  id: string; // Certificate ID for verification
  variant?: 'digital' | 'print'; // Card vs A4
  memberSince?: Date;
}

export function TenantCertificate({ 
  name, 
  issueDate, 
  score = 10, 
  id,
  variant = 'digital',
  memberSince
}: TenantCertificateProps) {
  
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://halden-eiendom.no'}/verify/${id}`;
  const memberSinceYear = memberSince ? memberSince.getFullYear() : issueDate.getFullYear();
  
  if (variant === 'print') {
    return (
      <div className="w-[210mm] h-[297mm] bg-white text-slate-900 p-12 relative overflow-hidden border-8 border-double border-slate-200 shadow-2xl mx-auto print:border-none print:shadow-none print:m-0 print:w-full print:h-screen">
        <style jsx global>{`
          @page {
            size: A4;
            margin: 0;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
            }
          }
        `}</style>
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <ShieldCheck className="w-[500px] h-[500px]" />
        </div>

        {/* Header */}
        <div className="text-center border-b-2 border-slate-900 pb-8 mb-12">
          <h1 className="text-5xl font-serif tracking-wider uppercase mb-2">Leietakerbevis</h1>
          <p className="text-xl text-slate-500 font-serif italic">Utstedt av Halden Eiendomsutvikling</p>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center justify-center space-y-8 mb-16">
          <p className="text-xl">Det bekreftes herved at</p>
          <h2 className="text-4xl font-bold font-serif border-b border-slate-300 pb-2 px-8">{name}</h2>
          <p className="text-xl text-center max-w-2xl leading-relaxed">
            har gjennomført et leieforhold med fremragende resultater og har oppnådd status som
          </p>
          <div className="text-3xl font-bold uppercase tracking-widest text-yellow-600 flex items-center gap-2">
            <Star className="fill-current" />
            Verifisert Leietaker
            <Star className="fill-current" />
          </div>
        </div>

        {/* Score Details */}
        <div className="grid grid-cols-2 gap-12 max-w-3xl mx-auto mb-16 w-full">
          <div className="border p-6 bg-slate-50">
             <div className="flex justify-between items-center border-b pb-2 mb-4">
               <h3 className="font-bold text-lg uppercase tracking-wide">Vurdering</h3>
               <span className="font-bold text-lg text-yellow-600 flex items-center gap-1">
                 {score}/10 <Star className="w-4 h-4 fill-current" />
               </span>
             </div>
             <div className="flex justify-between items-center mb-2">
               <span>Betalingsevne</span>
               <div className="flex gap-1">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-slate-900 text-slate-900" />)}</div>
             </div>
             <div className="flex justify-between items-center mb-2">
               <span>Orden & Renhold</span>
               <div className="flex gap-1">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-slate-900 text-slate-900" />)}</div>
             </div>
             <div className="flex justify-between items-center mb-2">
               <span>Naboforhold</span>
               <div className="flex gap-1">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-slate-900 text-slate-900" />)}</div>
             </div>
          </div>

          <div className="flex flex-col items-center justify-center">
             <div className="border-4 border-slate-900 p-2 mb-2">
                <QRCodeSVG value={verificationUrl} size={100} />
             </div>
             <p className="text-xs text-slate-500 uppercase tracking-wide">Scan for å verifisere</p>
             <p className="text-xs font-mono mt-1">{id}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end border-t border-slate-300 pt-8">
          <div className="text-center">
            <div className="h-16 border-b border-slate-400 w-48 mb-2"></div>
            <p className="text-sm uppercase text-slate-500">Dato: {issueDate.toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-slate-900" />
            <span className="font-bold text-lg">Halden Eiendomsutvikling</span>
          </div>
          <div className="text-center">
             <div className="h-16 border-b border-slate-400 w-48 mb-2 flex items-end justify-center pb-2">
               <span className="font-dancing-script text-2xl">Signert Digitalt</span>
             </div>
             <p className="text-sm uppercase text-slate-500">Signatur</p>
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
      
      {/* Gold Accents */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 blur-3xl rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 p-6 flex flex-col justify-between h-full border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-yellow-500" />
            <div>
              <h3 className="text-xs uppercase tracking-widest text-slate-400">Offisielt Dokument</h3>
              <h2 className="font-bold text-lg tracking-wide text-white">LEIETAKERBEVIS</h2>
            </div>
          </div>
          <div className="bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/50">
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Verifisert</span>
          </div>
        </div>

        {/* Chip & User Info */}
        <div className="flex items-center gap-4 my-4">
           <div className="w-12 h-9 rounded bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-inner opacity-80 flex items-center justify-center">
             <div className="w-8 h-5 border border-yellow-600/30 rounded-sm grid grid-cols-2 gap-[1px]">
                <div className="border-r border-yellow-600/30"></div>
                <div></div>
             </div>
           </div>
           <div>
             <p className="text-xs text-slate-400 uppercase">Navn</p>
             <p className="text-xl font-medium tracking-wide font-mono shadow-black drop-shadow-md">{name}</p>
           </div>
        </div>

        {/* Footer Info */}
        <div className="flex justify-between items-end">
          <div>
            <div className="flex gap-4 mb-1">
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Medlem siden</p>
                <p className="text-sm font-mono">{memberSinceYear}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Score</p>
                <div className="flex items-center gap-1 text-yellow-400">
                  <span className="text-sm font-bold">{score}/10</span>
                  <Star className="w-3 h-3 fill-current" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-1 rounded">
             <QRCodeSVG value={verificationUrl} size={48} />
          </div>
        </div>

      </div>
    </div>
  );
}
