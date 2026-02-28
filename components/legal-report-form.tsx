"use client";

import { useState, useEffect } from "react";
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
  const [debouncedFormData] = useDebounce(formData, 1000);
  const [evidenceSelection, setEvidenceSelection] = useState<Record<string, boolean>>(
    evidenceItems.reduce((acc, item) => ({ ...acc, [item.id]: item.includeInReport }), {})
  );

  // Autosave effect
  useEffect(() => {
    if (debouncedFormData) {
      handleSave(debouncedFormData);
    }
  }, [debouncedFormData]);

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      await upsertLegalReportDraft(projectId, data);
    } catch (error) {
      toast.error("Kunne ikke lagre utkast");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateClick = async () => {
    // Optimistic feedback
    toast.info("Genererer rapport...");
    try {
        const result: any = await generateLegalReport(projectId);
        toast.success(`Juridisk rapport v${result.versionNumber} generert med ${result.evidenceCount} bevis!`);
        
        if (result.pdfUrl) {
            window.open(result.pdfUrl, '_blank');
        }

        // We might want to refresh the page or redirect to show the report status
        // For now, let's trigger the parent callback if any
        if (onGenerateReport) {
            await onGenerateReport();
        }
    } catch (error) {
        toast.error(error instanceof Error ? error.message : "Kunne ikke generere rapport");
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
                <Label htmlFor={`evidence-${item.id}`} className="cursor-pointer flex-1">
                  <span className="font-mono font-bold mr-2">B-{String(item.evidenceNumber).padStart(3, '0')}</span>
                  {item.title}
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
        <Button size="lg" onClick={handleGenerateClick}>
          Generer Juridisk Rapport
        </Button>
      </div>

    </div>
  );
}
