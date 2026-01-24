"use client";

import React from 'react';
import { TenantCertificate } from '@/components/tenant-certificate';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Share2 } from 'lucide-react';

interface CertificateClientProps {
  name: string;
  id: string;
  issueDate: Date;
  score: number;
  stars?: number;
  memberSince?: Date;
  baseUrl?: string;
}

export default function CertificateClient({ name, id, issueDate, score, stars = 0, memberSince, baseUrl }: CertificateClientProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/verify/${id}`;
    
    // Check if Web Share API is supported and we are in a secure context (or localhost)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Leietakerbevis',
          text: `Sjekk ut leietakerbeviset til ${name}`,
          url: url,
        });
      } catch (err: any) {
        // User cancelled or other error
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          // Fallback to clipboard if share fails (but not if cancelled)
           navigator.clipboard.writeText(url)
            .then(() => alert('Lenke kopiert til utklippstavlen!'))
            .catch(() => alert('Kunne ikke kopiere lenke.'));
        }
      }
    } else {
      // Fallback for desktop / non-supported browsers
      try {
        await navigator.clipboard.writeText(url);
        alert('Lenke kopiert til utklippstavlen!');
      } catch (err) {
        console.error('Clipboard error:', err);
        alert('Kunne ikke kopiere lenke automatisk. Kopier URL-en fra adressefeltet.');
      }
    }
  };

  return (
    <>
      <div className="hidden print:block print:w-full print:h-full">
        <TenantCertificate 
          name={name} 
          issueDate={issueDate} 
          score={score} 
          stars={stars}
          id={id}
          variant="print"
          memberSince={memberSince}
          baseUrl={baseUrl}
        />
      </div>

      <div className="container mx-auto py-8 print:hidden">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Mitt Leietakerbevis</h1>
           <p className="text-muted-foreground mt-2">
             Din personlige &quot;Bolig-CV&quot;. Vis dette til fremtidige utleiere for å bevise din pålitelighet.
           </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={handlePrint} className="gap-2">
             <Printer className="w-4 h-4" />
             Skriv ut / Lagre som PDF
           </Button>
           <Button className="gap-2" onClick={handleShare}>
             <Share2 className="w-4 h-4" />
             Del lenke
           </Button>
        </div>
      </div>

      <Tabs defaultValue="digital" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8">
          <TabsTrigger value="digital">Digitalt Kort</TabsTrigger>
          <TabsTrigger value="print">A4 Diplom</TabsTrigger>
        </TabsList>
        
        <TabsContent value="digital" className="flex justify-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
           <div className="scale-110 transform transition-all">
             <TenantCertificate 
               name={name} 
               issueDate={issueDate} 
               score={score}
               stars={stars}
               id={id}
               variant="digital"
               memberSince={memberSince}
               baseUrl={baseUrl}
             />
           </div>
        </TabsContent>
        
        <TabsContent value="print" className="bg-slate-100 p-8 rounded-xl overflow-auto flex justify-center">
            <div className="origin-top scale-[0.6] md:scale-[0.8] lg:scale-100 shadow-2xl">
              <TenantCertificate 
                name={name} 
                issueDate={issueDate} 
                score={score} 
                id={id}
                variant="print"
                memberSince={memberSince}
                baseUrl={baseUrl}
              />
            </div>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}
