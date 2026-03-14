"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2 } from "lucide-react";
import { updateEvidenceInclusion } from "@/app/actions/reports";
import { upsertDamageReportDraft } from "@/app/actions/report-draft";
import { createEvent, linkEvidenceToEvent } from "@/app/actions/events";
import { generateDamageReport } from "@/app/actions/generate-report";
import { useRouter } from "next/navigation";

interface EvidenceItem {
  id: string;
  evidenceNumber: number;
  title: string;
  description?: string | null;
  includeInReport: boolean;
  sourceType?: string | null;
  legalDate?: string | null;
  fileType?: string | null;
  fileUrl?: string | null;
}

interface TimelineEvent {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  evidenceItems: { id: string; evidenceNumber: number; title: string }[];
}

interface DamageReportDraftFormProps {
  projectId: string;
  initialData: any;
  evidenceItems: EvidenceItem[];
  initialEvents: TimelineEvent[];
  onGenerateReport?: () => void;
}

const isImage = (item: EvidenceItem) => {
  const ft = item.fileType || "";
  return ft.startsWith("image/");
};

const toVedleggCode = (index: number) => {
  let n = index;
  let code = "";
  while (n >= 0) {
    code = String.fromCharCode(65 + (n % 26)) + code;
    n = Math.floor(n / 26) - 1;
  }
  return code;
};

export function DamageReportDraftForm({ projectId, initialData, evidenceItems, initialEvents, onGenerateReport }: DamageReportDraftFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(initialData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [debouncedFormData] = useDebounce(formData, 1000);

  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents || []);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: new Date() as Date | undefined,
    selectedEvidence: new Set<string>(),
  });
  const [creatingEvent, setCreatingEvent] = useState(false);

  const [evidenceSelection, setEvidenceSelection] = useState<Record<string, boolean>>(
    evidenceItems.reduce((acc, item) => ({ ...acc, [item.id]: item.includeInReport }), {})
  );

  const evidenceCodes = useMemo(() => {
    const images = evidenceItems.filter(isImage).sort((a, b) => a.evidenceNumber - b.evidenceNumber);
    const attachments = evidenceItems.filter((e) => !isImage(e)).sort((a, b) => a.evidenceNumber - b.evidenceNumber);

    const map = new Map<string, string>();
    images.forEach((e, idx) => map.set(e.id, `Figur ${idx + 1}`));
    attachments.forEach((e, idx) => map.set(e.id, `Vedlegg ${toVedleggCode(idx)}`));
    return map;
  }, [evidenceItems]);

  const totalEvidence = evidenceItems.length;
  const includedEvidence = Object.values(evidenceSelection).filter(Boolean).length;

  const handleSave = useCallback(
    async (data: any) => {
      setIsSaving(true);
      try {
        await upsertDamageReportDraft(projectId, data);
      } catch (error) {
        toast.error("Kunne ikke lagre utkast");
      } finally {
        setIsSaving(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (debouncedFormData) {
      handleSave(debouncedFormData);
    }
  }, [debouncedFormData, handleSave]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const getMeasurementsText = () => {
    const m = formData.measurements;
    if (!m) return "";
    if (typeof m === "string") return m;
    if (typeof m === "object" && typeof (m as any).text === "string") return (m as any).text;
    return "";
  };

  const toggleEvidence = async (evidenceId: string, checked: boolean) => {
    setEvidenceSelection((prev) => ({ ...prev, [evidenceId]: checked }));
    try {
      await updateEvidenceInclusion(evidenceId, checked);
    } catch (error) {
      toast.error("Kunne ikke oppdatere dokumentasjon");
      setEvidenceSelection((prev) => ({ ...prev, [evidenceId]: !checked }));
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    if (creatingEvent) return;
    setCreatingEvent(true);
    try {
      const created = await createEvent(projectId, newEvent.title, newEvent.date, newEvent.description || undefined);
      const evidenceIds = Array.from(newEvent.selectedEvidence);
      for (const evidenceId of evidenceIds) {
        await linkEvidenceToEvent(created.id, evidenceId);
      }
      toast.success("Hendelse opprettet");
      setNewEvent({ title: "", description: "", date: new Date(), selectedEvidence: new Set() });
      router.refresh();
      setEvents((prev) => [
        ...prev,
        {
          id: created.id,
          title: created.title,
          description: created.description,
          date: created.date as any,
          evidenceItems: evidenceItems
            .filter((e) => evidenceIds.includes(e.id))
            .map((e) => ({ id: e.id, evidenceNumber: e.evidenceNumber, title: e.title })),
        },
      ]);
    } catch (error) {
      toast.error("Kunne ikke opprette hendelse");
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    try {
      toast.info("Lagrer siste endringer...");
      await upsertDamageReportDraft(projectId, formData);
    } catch (e) {
      console.error(e);
    }

    toast.info("Genererer rapport... Dette kan ta litt tid.");
    try {
      const result: any = await generateDamageReport(projectId);
      const response = await fetch(`/api/reports/${result.reportId}/generate`, { method: "POST" });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Ukjent feil ved generering");

      toast.success(`Skaderapport v${result.versionNumber} generert!`);
      if (data.url) {
        window.open(data.url, "_blank");
      }
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach((att: { url: string }) => window.open(att.url, "_blank"));
      }
      if (onGenerateReport) {
        await onGenerateReport();
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Kunne ikke generere rapport");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Status</span>
            <span className="text-sm font-normal bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
              Dokumentasjon valgt: {includedEvidence}/{totalEvidence}
            </span>
          </CardTitle>
          <CardDescription>Skaderapporten skal alltid fremstå som en faglig vurdering basert på dokumentasjon.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end gap-3">
          <Button onClick={handleGenerateClick} disabled={isGenerating || includedEvidence === 0}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generer PDF
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Prosjekt</CardTitle>
          <CardDescription>Prosjektinformasjon for rapporten.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <Label>Prosjektnavn</Label>
            <Input value={formData.projectName || ""} onChange={(e) => handleChange("projectName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input value={formData.address || ""} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Gnr/Bnr</Label>
            <Input value={formData.gnrBnr || ""} onChange={(e) => handleChange("gnrBnr", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Oppdragsgiver</Label>
            <Input value={formData.client || ""} onChange={(e) => handleChange("client", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Rapportforfatter</Label>
            <Input value={formData.author || ""} onChange={(e) => handleChange("author", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Firma</Label>
            <Input value={formData.company || ""} onChange={(e) => handleChange("company", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Dato</Label>
            <DatePicker date={formData.reportDate ? new Date(formData.reportDate) : undefined} setDate={(d) => handleChange("reportDate", d)} />
          </div>
          <div className="space-y-2">
            <Label>Saksnummer</Label>
            <Input value={formData.caseNumber || ""} onChange={(e) => handleChange("caseNumber", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Kort beskrivelse av saken</Label>
            <Textarea value={formData.shortDescription || ""} onChange={(e) => handleChange("shortDescription", e.target.value)} className="min-h-[120px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Hendelsesforløp</CardTitle>
          <CardDescription>Tidslinje med hendelser og koblet dokumentasjon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-sm text-muted-foreground">Ingen hendelser registrert.</div>
            ) : (
              events
                .slice()
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((e) => (
                  <div key={e.id} className="border rounded-md p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("nb-NO")}</div>
                    </div>
                    {e.description ? <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{e.description}</div> : null}
                    {e.evidenceItems && e.evidenceItems.length > 0 ? (
                      <div className="text-xs text-muted-foreground mt-3">
                        Dokumentasjon:{" "}
                        {e.evidenceItems
                          .filter((x) => x?.id)
                          .map((x) => `${evidenceCodes.get(x.id) || `Bevis ${x.evidenceNumber}`}`)
                          .join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label>Hendelse</Label>
              <Input value={newEvent.title} onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))} placeholder="F.eks. Oppdaget lekkasje" />
            </div>
            <div className="space-y-2">
              <Label>Dato</Label>
              <DatePicker date={newEvent.date} setDate={(d) => setNewEvent((prev) => ({ ...prev, date: d }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Beskrivelse</Label>
              <Textarea value={newEvent.description} onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))} className="min-h-[120px]" />
            </div>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="attach">
              <AccordionTrigger>Koble dokumentasjon</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {evidenceItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Ingen dokumentasjon lastet opp.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {evidenceItems
                        .slice()
                        .sort((a, b) => a.evidenceNumber - b.evidenceNumber)
                        .map((item) => {
                          const checked = newEvent.selectedEvidence.has(item.id);
                          return (
                            <label key={item.id} className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  setNewEvent((prev) => {
                                    const next = new Set(prev.selectedEvidence);
                                    if (v) next.add(item.id);
                                    else next.delete(item.id);
                                    return { ...prev, selectedEvidence: next };
                                  });
                                }}
                              />
                              <span className="text-sm">
                                {evidenceCodes.get(item.id)} – {item.title}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex justify-end">
            <Button onClick={handleCreateEvent} disabled={creatingEvent || !newEvent.title || !newEvent.date}>
              {creatingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Legg til hendelse
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Dokumentasjon</CardTitle>
          <CardDescription>Velg hvilke elementer som skal inkluderes i rapporten.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {evidenceItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">Ingen dokumentasjon funnet. Last opp filer via Skaderapport eller Bevisbank.</div>
          ) : (
            <div className="space-y-2">
              {evidenceItems
                .slice()
                .sort((a, b) => a.evidenceNumber - b.evidenceNumber)
                .map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 border rounded-md p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {evidenceCodes.get(item.id)} – {item.title}
                      </div>
                      {item.description ? <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</div> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={evidenceSelection[item.id]} onCheckedChange={(v) => toggleEvidence(item.id, Boolean(v))} />
                      <span className="text-xs text-muted-foreground">Inkluder</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Teknisk analyse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Observasjoner</Label>
            <Textarea value={formData.observations || ""} onChange={(e) => handleChange("observations", e.target.value)} className="min-h-[140px]" />
          </div>
          <div className="space-y-2">
            <Label>Tekniske vurderinger</Label>
            <Textarea value={formData.technicalAssessment || ""} onChange={(e) => handleChange("technicalAssessment", e.target.value)} className="min-h-[140px]" />
          </div>
          <div className="space-y-2">
            <Label>Målinger</Label>
            <Textarea
              value={getMeasurementsText()}
              onChange={(e) => handleChange("measurements", { text: e.target.value })}
              placeholder="F.eks. Høydeforskjell gulv – septiktank: 266 mm"
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Tegninger</Label>
            <Textarea value={formData.drawings || ""} onChange={(e) => handleChange("drawings", e.target.value)} className="min-h-[100px]" />
          </div>
          <div className="space-y-2">
            <Label>Beregninger</Label>
            <Textarea value={formData.calculations || ""} onChange={(e) => handleChange("calculations", e.target.value)} className="min-h-[100px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Årsaksvurdering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mulige årsaker</Label>
            <Textarea value={formData.causeOptions || ""} onChange={(e) => handleChange("causeOptions", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Sannsynlig årsak</Label>
            <Textarea value={formData.probableCause || ""} onChange={(e) => handleChange("probableCause", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Alternative forklaringer</Label>
            <Textarea value={formData.alternativeExplanations || ""} onChange={(e) => handleChange("alternativeExplanations", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Teknisk begrunnelse</Label>
            <Textarea value={formData.technicalJustification || ""} onChange={(e) => handleChange("technicalJustification", e.target.value)} className="min-h-[140px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Konsekvens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Skadeomfang</Label>
            <Textarea value={formData.scope || ""} onChange={(e) => handleChange("scope", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Risiko</Label>
            <Textarea value={formData.risk || ""} onChange={(e) => handleChange("risk", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Følgeskader</Label>
            <Textarea value={formData.secondaryDamage || ""} onChange={(e) => handleChange("secondaryDamage", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Mulige fremtidige problemer</Label>
            <Textarea value={formData.futureIssues || ""} onChange={(e) => handleChange("futureIssues", e.target.value)} className="min-h-[120px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Konklusjon</CardTitle>
          <CardDescription>Dette er en faglig konklusjon, ikke en juridisk.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea value={formData.conclusion || ""} onChange={(e) => handleChange("conclusion", e.target.value)} className="min-h-[160px]" />
        </CardContent>
      </Card>

      {isSaving ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Lagrer...
        </div>
      ) : null}
    </div>
  );
}
