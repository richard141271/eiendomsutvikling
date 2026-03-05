"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { upsertLegalReportDraft } from "@/app/actions/report-draft";
import { updateEvidenceInclusion } from "@/app/actions/reports";
import { generateLegalReport } from "@/app/actions/generate-report";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

interface EvidenceItem {
  id: string;
  evidenceNumber: number;
  title: string;
  includeInReport: boolean;
  missingLink?: boolean;
  missingLinkResolved?: boolean;
  sourceType?: string;
}

interface LegalReportDraftFormProps {
  projectId: string;
  initialData: any;
  evidenceItems: EvidenceItem[];
  onGenerateReport?: () => void;
}

export function LegalReportDraftForm({ projectId, initialData, evidenceItems, onGenerateReport }: LegalReportDraftFormProps) {
  const [formData, setFormData] = useState(initialData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [debouncedFormData] = useDebounce(formData, 1000);
  const [evidenceSelection, setEvidenceSelection] = useState<Record<string, boolean>>(
    evidenceItems.reduce((acc, item) => ({ ...acc, [item.id]: item.includeInReport }), {})
  );

  // Stats calculation
  const totalEvidence = evidenceItems.length;
  const includedEvidence = Object.values(evidenceSelection).filter(Boolean).length;
  const missingLinks = evidenceItems.filter(e => e.missingLink && !e.missingLinkResolved).length;
  const resolvedLinks = evidenceItems.filter(e => e.missingLink && e.missingLinkResolved).length;
  const isReady = missingLinks === 0 && includedEvidence > 0;

  const handleSave = useCallback(async (data: any) => {
    setIsSaving(true);
    try {
      await upsertLegalReportDraft(projectId, data);
    } catch (error) {
      toast.error("Kunne ikke lagre utkast");
    } finally {
      setIsSaving(false);
    }
  }, [projectId]);

  // Autosave effect
  useEffect(() => {
    if (debouncedFormData) {
      handleSave(debouncedFormData);
    }
  }, [debouncedFormData, handleSave]);

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    
    // Ensure we save the latest changes before generating
    try {
        toast.info("Lagrer siste endringer...");
        await upsertLegalReportDraft(projectId, formData);
    } catch (e) {
        console.error("Failed to save draft before generation:", e);
        // Continue anyway? Or stop? Better to continue but warn.
        // But if save fails, report might be empty.
    }

    toast.info("Genererer rapport... Dette kan ta litt tid.");
    try {
        // Step 1: Create report version and snapshot in database
        const result: any = await generateLegalReport(projectId);
        
        // Step 2: Call API route to generate PDFs using renderPackage
        const response = await fetch(`/api/reports/${result.reportId}/generate`, {
            method: 'POST',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Feil under PDF-generering: ${errorText || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
             throw new Error(data.error || "Ukjent feil ved generering");
        }

        toast.success(`Juridisk rapport v${result.versionNumber} generert!`);
        
        if (data.url) {
            window.open(data.url, '_blank');
        }
        
        if (data.attachments && data.attachments.length > 0) {
             toast.info(`Laster ned ${data.attachments.length} vedlegg...`);
             // Open attachments in new tabs
             data.attachments.forEach((att: { url: string }) => window.open(att.url, '_blank'));
        }

        if (onGenerateReport) {
            await onGenerateReport();
        }
    } catch (error) {
        console.error("Report generation error:", error);
        toast.error(error instanceof Error ? error.message : "Kunne ikke generere rapport");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const toggleEvidence = async (evidenceId: string, checked: boolean) => {
    setEvidenceSelection(prev => ({ ...prev, [evidenceId]: checked }));
    try {
      await updateEvidenceInclusion(evidenceId, checked);
    } catch (error) {
      toast.error("Kunne ikke oppdatere bevisstatus");
      // Revert state on error
      setEvidenceSelection(prev => ({ ...prev, [evidenceId]: !checked }));
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      
      {/* 0. Status Sammendrag (Sammendragsboks) */}
      <Card className={`border-l-4 ${missingLinks > 0 ? "border-l-red-500" : isReady ? "border-l-emerald-500" : "border-l-amber-500"}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Rapportstatus: {missingLinks > 0 ? "Mangler dokumentasjon" : isReady ? "Klar til generering" : "Under arbeid"}</span>
            {isReady && <span className="text-sm font-normal bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">Klar</span>}
            {missingLinks > 0 && <span className="text-sm font-normal bg-red-100 text-red-800 px-2 py-1 rounded-full">Mangler info</span>}
          </CardTitle>
          <CardDescription>Oversikt over bevis og dokumentasjon.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col p-3 bg-slate-50 rounded-lg border">
                    <span className="text-slate-500 font-medium">Totalt antall bevis</span>
                    <span className="text-2xl font-bold">{totalEvidence}</span>
                    <span className="text-xs text-slate-400">Inkludert i rapport: {includedEvidence}</span>
                </div>
                <div className="flex flex-col p-3 bg-slate-50 rounded-lg border">
                    <span className="text-slate-500 font-medium">Manglende koblinger</span>
                    <span className={`text-2xl font-bold ${missingLinks > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {missingLinks}
                    </span>
                    <span className="text-xs text-slate-400">Må løses før ferdigstillelse</span>
                </div>
                <div className="flex flex-col p-3 bg-slate-50 rounded-lg border">
                    <span className="text-slate-500 font-medium">Avklarte mangler</span>
                    <span className="text-2xl font-bold text-blue-600">{resolvedLinks}</span>
                    <span className="text-xs text-slate-400">Godkjent som &quot;Avklart&quot;</span>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* 1. Sammendrag */}
      <Card>
        <CardHeader>
          <CardTitle>📘 1. Sammendrag</CardTitle>
          <CardDescription>Kort og presist om hva saken gjelder.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder="Skriv sammendrag her..." 
            value={formData.summary || ""} 
            onChange={(e) => handleChange("summary", e.target.value)}
            className="min-h-[150px]"
          />
        </CardContent>
      </Card>

      {/* 2. Faktisk grunnlag */}
      <Card>
        <CardHeader>
          <CardTitle>📄 2. Faktisk grunnlag</CardTitle>
          <CardDescription>Kronologisk redegjørelse av hendelsesforløpet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder="Beskriv fakta kronologisk..." 
            value={formData.factualBasis || ""} 
            onChange={(e) => handleChange("factualBasis", e.target.value)}
            className="min-h-[200px]"
          />
        </CardContent>
      </Card>

      {/* 3. Teknisk vurdering */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>🛠 3. Teknisk vurdering</CardTitle>
            <CardDescription>Byggteknisk analyse og vurdering.</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeTechnical" 
              checked={formData.includeTechnical || false}
              onCheckedChange={(checked) => handleChange("includeTechnical", checked)}
            />
            <Label htmlFor="includeTechnical">Inkluder modul</Label>
          </div>
        </CardHeader>
        {formData.includeTechnical && (
          <CardContent>
            <Textarea 
              placeholder="Teknisk analyse (TEK17, avvik, etc)..." 
              value={formData.technicalAnalysis || ""} 
              onChange={(e) => handleChange("technicalAnalysis", e.target.value)}
              className="min-h-[200px]"
            />
          </CardContent>
        )}
      </Card>

      {/* 4. Juridisk vurdering */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>⚖ 4. Juridisk vurdering</CardTitle>
            <CardDescription>Strukturert juridisk argumentasjon.</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeLegal" 
              checked={formData.includeLegal || false}
              onCheckedChange={(checked) => handleChange("includeLegal", checked)}
            />
            <Label htmlFor="includeLegal">Inkluder modul</Label>
          </div>
        </CardHeader>
        {formData.includeLegal && (
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Ansvarsgrunnlag</Label>
              <Textarea 
                value={formData.liabilityBasis || ""} 
                onChange={(e) => handleChange("liabilityBasis", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Lovhenvisning</Label>
              <Textarea 
                value={formData.legalNormReference || ""} 
                onChange={(e) => handleChange("legalNormReference", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Årsakssammenheng</Label>
              <Textarea 
                value={formData.causationAnalysis || ""} 
                onChange={(e) => handleChange("causationAnalysis", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Påregnelighet</Label>
              <Textarea 
                value={formData.foreseeabilityAssessment || ""} 
                onChange={(e) => handleChange("foreseeabilityAssessment", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Økonomisk tap</Label>
              <Textarea 
                value={formData.economicLoss || ""} 
                onChange={(e) => handleChange("economicLoss", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Juridisk Konklusjon</Label>
              <Textarea 
                value={formData.legalConclusion || ""} 
                onChange={(e) => handleChange("legalConclusion", e.target.value)}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* 5. Endelig Konklusjon */}
      <Card>
        <CardHeader>
          <CardTitle>📑 5. Endelig konklusjon</CardTitle>
          <CardDescription>Oppsummering av krav og ansvar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder="Konklusjon..." 
            value={formData.conclusion || ""} 
            onChange={(e) => handleChange("conclusion", e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* 4. Bevisvelger (Placed here as per user request "Under juridisk seksjon" - actually user said "Under juridisk seksjon" but numbered it 4 in the list, while Conclusion is 5. Let's place it before conclusion or after? User list: 1, 2, 3, 4(Legal), 5(Conclusion). Then "4. Bevisvelger Under juridisk seksjon". This implies between 4 and 5? Or after 5? Let's put it after 5 for flow, or between 4 and 5. Let's put it between 4 and 5.) */}
      
      <Card>
        <CardHeader>
          <CardTitle>Bevisutvalg</CardTitle>
          <CardDescription>Velg hvilke bevis som skal inkluderes i rapporten.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
            {evidenceItems.map(item => (
              <div key={item.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                <Checkbox 
                  id={`evidence-${item.id}`} 
                  checked={evidenceSelection[item.id] ?? false}
                  onCheckedChange={(checked) => toggleEvidence(item.id, checked as boolean)}
                />
                <Label htmlFor={`evidence-${item.id}`} className="cursor-pointer flex-1 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold mr-2">B-{String(item.evidenceNumber).padStart(3, '0')}</span>
                    {item.title}
                  </div>
                  {item.missingLink && (
                    item.missingLinkResolved ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">Avklart</span>
                    ) : (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-2">Mangler kobling</span>
                    )
                  )}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-between items-center z-50 px-8">
        <div className="flex items-center text-sm text-muted-foreground">
          {isSaving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Lagrer utkast...</>
          ) : (
            "Utkast lagret"
          )}
        </div>
        <Button size="lg" onClick={handleGenerateClick} disabled={isGenerating}>
          {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isGenerating ? "Genererer..." : "Generer Juridisk Rapport"}
        </Button>
      </div>

    </div>
  );
}
