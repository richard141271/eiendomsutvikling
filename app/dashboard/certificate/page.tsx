"use client";

import React, { useState } from 'react';
import { TenantCertificate } from '@/components/tenant-certificate';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Printer, Share2 } from 'lucide-react';

export default function CertificatePage() {
  // In a real app, fetch this data from the API
  const [user] = useState({
    name: "Ola Nordmann", // This would come from auth context
    id: "CERT-2024-8839", // Unique Certificate ID
    issueDate: new Date(),
    score: 9.8,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="hidden print:block print:w-full print:h-full">
        <TenantCertificate 
          name={user.name} 
          issueDate={user.issueDate} 
          score={user.score} 
          id={user.id}
          variant="print"
        />
      </div>

      <div className="container mx-auto py-8 print:hidden">
        <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Mitt Leietakerbevis</h1>
           <p className="text-muted-foreground mt-2">
             Din personlige "Bolig-CV". Vis dette til fremtidige utleiere for å bevise din pålitelighet.
           </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={handlePrint} className="gap-2">
             <Printer className="w-4 h-4" />
             Skriv ut / Lagre som PDF
           </Button>
           <Button className="gap-2">
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
               name={user.name} 
               issueDate={user.issueDate} 
               score={user.score} 
               id={user.id}
               variant="digital"
             />
           </div>
        </TabsContent>
        
        <TabsContent value="print" className="bg-slate-100 p-8 rounded-xl overflow-auto flex justify-center">
            <div className="origin-top scale-[0.6] md:scale-[0.8] lg:scale-100 shadow-2xl">
              <TenantCertificate 
                name={user.name} 
                issueDate={user.issueDate} 
                score={user.score} 
                id={user.id}
                variant="print"
              />
            </div>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}
