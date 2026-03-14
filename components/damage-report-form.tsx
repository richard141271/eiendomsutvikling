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

interface MeasurementItem {
  label: string;
  value: string;
  unit: string;
  method: string;
  comment?: string;
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

const toMeasurementItems = (measurements: any): MeasurementItem[] => {
  if (!measurements) return [];
  if (Array.isArray(measurements)) {
    return measurements
      .filter(Boolean)
      .map((m: any) => ({
        label: typeof m?.label === "string" ? m.label : "",
        value: typeof m?.value === "number" ? String(m.value) : typeof m?.value === "string" ? m.value : "",
        unit: typeof m?.unit === "string" ? m.unit : "",
        method: typeof m?.method === "string" ? m.method : "",
        comment: typeof m?.comment === "string" ? m.comment : typeof m?.optionalComment === "string" ? m.optionalComment : undefined,
      }))
      .filter((m: MeasurementItem) => Boolean(m.label || m.value || m.unit || m.method || m.comment));
  }

  if (typeof measurements === "object" && Array.isArray((measurements as any).items)) {
    return toMeasurementItems((measurements as any).items);
  }

  const legacyText =
    typeof measurements === "string"
      ? measurements
      : typeof (measurements as any)?.text === "string"
        ? (measurements as any).text
        : "";
  if (!legacyText) return [];
  return [{ label: "Måling", value: "", unit: "", method: "", comment: legacyText }];
};

const normalizeDraft = (data: any) => {
  if (!data) return {};
  const items = toMeasurementItems(data.measurements);
  if (items.length === 0) return data;
  return { ...data, measurements: { items } };
};

export function DamageReportDraftForm({ projectId, initialData, evidenceItems, initialEvents, onGenerateReport }: DamageReportDraftFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(() => normalizeDraft(initialData || {}));
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

  const imageEvidenceOptions = useMemo(() => evidenceItems.filter(isImage).sort((a, b) => a.evidenceNumber - b.evidenceNumber), [evidenceItems]);

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

  const appendFigureRef = (field: string, evidenceId: string) => {
    const token = `(se [[REF:${evidenceId}]])`;
    setFormData((prev: any) => {
      const current = typeof prev[field] === "string" ? prev[field] : "";
      const next = current ? `${current.trimEnd()} ${token}` : token;
      return { ...prev, [field]: next };
    });
  };

  const measurementItems = useMemo(() => toMeasurementItems(formData.measurements), [formData.measurements]);
  const [newMeasurement, setNewMeasurement] = useState<MeasurementItem>({ label: "", value: "", unit: "", method: "", comment: "" });

  const setMeasurements = (items: MeasurementItem[]) => {
    handleChange("measurements", { items });
  };

  const addMeasurement = () => {
    const trimmed: MeasurementItem = {
      label: newMeasurement.label.trim(),
      value: newMeasurement.value.trim(),
      unit: newMeasurement.unit.trim(),
      method: newMeasurement.method.trim(),
      comment: (newMeasurement.comment || "").trim() || undefined,
    };
    if (!trimmed.label && !trimmed.value && !trimmed.unit && !trimmed.method && !trimmed.comment) return;
    setMeasurements([...measurementItems, trimmed]);
    setNewMeasurement({ label: "", value: "", unit: "", method: "", comment: "" });
  };

  const FigureRefPicker = ({ field }: { field: string }) => {
    if (imageEvidenceOptions.length === 0) return null;
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">Sett inn figurreferanse</div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue=""
          onChange={(e) => {
            const id = e.currentTarget.value;
            if (!id) return;
            appendFigureRef(field, id);
            e.currentTarget.value = "";
          }}
        >
          <option value="">Velg figur…</option>
          {imageEvidenceOptions.map((img) => (
            <option key={img.id} value={img.id}>
              {`${evidenceCodes.get(img.id)} – ${img.title}`}
            </option>
          ))}
        </select>
      </div>
    );
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
            <FigureRefPicker field="shortDescription" />
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
            <FigureRefPicker field="observations" />
            <Textarea value={formData.observations || ""} onChange={(e) => handleChange("observations", e.target.value)} className="min-h-[140px]" />
          </div>
          <div className="space-y-2">
            <Label>Tekniske vurderinger</Label>
            <FigureRefPicker field="technicalAssessment" />
            <Textarea value={formData.technicalAssessment || ""} onChange={(e) => handleChange("technicalAssessment", e.target.value)} className="min-h-[140px]" />
          </div>
          <div className="space-y-2">
            <Label>Målinger</Label>
            {measurementItems.length === 0 ? <div className="text-sm text-muted-foreground">Ingen målinger registrert.</div> : null}
            {measurementItems.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-muted-foreground">
                  <div>Måling</div>
                  <div>Verdi</div>
                  <div>Enhet</div>
                  <div>Metode</div>
                  <div>Kommentar</div>
                </div>
                {measurementItems.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-start">
                    <Input
                      value={m.label}
                      onChange={(e) => {
                        const next = measurementItems.slice();
                        next[idx] = { ...next[idx], label: e.target.value };
                        setMeasurements(next);
                      }}
                    />
                    <Input
                      value={m.value}
                      onChange={(e) => {
                        const next = measurementItems.slice();
                        next[idx] = { ...next[idx], value: e.target.value };
                        setMeasurements(next);
                      }}
                    />
                    <Input
                      value={m.unit}
                      onChange={(e) => {
                        const next = measurementItems.slice();
                        next[idx] = { ...next[idx], unit: e.target.value };
                        setMeasurements(next);
                      }}
                    />
                    <Input
                      value={m.method}
                      onChange={(e) => {
                        const next = measurementItems.slice();
                        next[idx] = { ...next[idx], method: e.target.value };
                        setMeasurements(next);
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        value={m.comment || ""}
                        onChange={(e) => {
                          const next = measurementItems.slice();
                          next[idx] = { ...next[idx], comment: e.target.value };
                          setMeasurements(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = measurementItems.filter((_, i) => i !== idx);
                          setMeasurements(next);
                        }}
                      >
                        Fjern
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-4 border rounded-md p-3 space-y-3">
              <div className="text-sm font-medium">Legg til måling</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Måling</Label>
                  <Input value={newMeasurement.label} onChange={(e) => setNewMeasurement((p) => ({ ...p, label: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Verdi</Label>
                  <Input value={newMeasurement.value} onChange={(e) => setNewMeasurement((p) => ({ ...p, value: e.target.value }))} placeholder="F.eks. 1,7" />
                </div>
                <div className="space-y-1">
                  <Label>Enhet</Label>
                  <Input value={newMeasurement.unit} onChange={(e) => setNewMeasurement((p) => ({ ...p, unit: e.target.value }))} placeholder="F.eks. m / mm" />
                </div>
                <div className="space-y-1">
                  <Label>Metode</Label>
                  <Input value={newMeasurement.method} onChange={(e) => setNewMeasurement((p) => ({ ...p, method: e.target.value }))} placeholder="F.eks. Kamerainspeksjon" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Kommentar (valgfri)</Label>
                  <Input value={newMeasurement.comment || ""} onChange={(e) => setNewMeasurement((p) => ({ ...p, comment: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={addMeasurement}>
                  Legg til måling
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tegninger</Label>
            <FigureRefPicker field="drawings" />
            <Textarea value={formData.drawings || ""} onChange={(e) => handleChange("drawings", e.target.value)} className="min-h-[100px]" />
          </div>
          <div className="space-y-2">
            <Label>Beregninger</Label>
            <FigureRefPicker field="calculations" />
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
            <FigureRefPicker field="causeOptions" />
            <Textarea value={formData.causeOptions || ""} onChange={(e) => handleChange("causeOptions", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Sannsynlig årsak</Label>
            <FigureRefPicker field="probableCause" />
            <Textarea value={formData.probableCause || ""} onChange={(e) => handleChange("probableCause", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Alternative forklaringer</Label>
            <FigureRefPicker field="alternativeExplanations" />
            <Textarea value={formData.alternativeExplanations || ""} onChange={(e) => handleChange("alternativeExplanations", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Teknisk begrunnelse</Label>
            <FigureRefPicker field="technicalJustification" />
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
            <FigureRefPicker field="scope" />
            <Textarea value={formData.scope || ""} onChange={(e) => handleChange("scope", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Risiko</Label>
            <FigureRefPicker field="risk" />
            <Textarea value={formData.risk || ""} onChange={(e) => handleChange("risk", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Følgeskader</Label>
            <FigureRefPicker field="secondaryDamage" />
            <Textarea value={formData.secondaryDamage || ""} onChange={(e) => handleChange("secondaryDamage", e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Mulige fremtidige problemer</Label>
            <FigureRefPicker field="futureIssues" />
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
          <FigureRefPicker field="conclusion" />
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
