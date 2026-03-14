"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { createProject } from "@/app/actions/projects";
import { upsertDamageReportDraft } from "@/app/actions/report-draft";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Loader2, Upload, X } from "lucide-react";

interface Property {
  id: string;
  name: string;
  address?: string | null;
  gnr?: string | null;
  bnr?: string | null;
  units: { id: string; name: string; unitNumber: string | null }[];
}

interface DamageReportWizardProps {
  properties: Property[];
}

export default function DamageReportWizard({ properties }: DamageReportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [customPropertyName, setCustomPropertyName] = useState<string>("");

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  const [formData, setFormData] = useState({
    projectName: "",
    address: "",
    gnrBnr: "",
    client: "",
    author: "",
    company: "",
    reportDate: new Date() as Date | undefined,
    caseNumber: "",
    shortDescription: "",
  });

  const [uploads, setUploads] = useState<
    {
      file: File;
      status: "pending" | "uploading" | "done" | "error";
      progress: number;
      id?: string;
    }[]
  >([]);

  const handleCreateProject = async () => {
    if (!formData.projectName) return;
    if (loading) return;
    setLoading(true);

    try {
      const propertyIdRaw = selectedPropertyId;
      const propertyId = propertyIdRaw === "custom" ? undefined : propertyIdRaw || undefined;

      const project = await createProject({
        title: formData.projectName,
        description: formData.shortDescription,
        reportType: "DAMAGE",
        propertyId,
        customPropertyName: propertyIdRaw === "custom" ? customPropertyName : undefined,
      });

      await upsertDamageReportDraft(project.id, {
        projectName: formData.projectName,
        address: formData.address,
        gnrBnr: formData.gnrBnr,
        client: formData.client,
        author: formData.author,
        company: formData.company,
        reportDate: formData.reportDate,
        caseNumber: formData.caseNumber,
        shortDescription: formData.shortDescription,
      });

      setProjectId(project.id);
      setStep(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!projectId) return;
    setUploads((prev) => prev.map((u) => (u.file === file ? { ...u, status: "uploading" } : u)));

    const body = new FormData();
    body.append("file", file);
    body.append("projectId", projectId);
    body.append("lastModified", file.lastModified.toString());

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/projects/${projectId}/evidence/upload`);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploads((prev) => prev.map((u) => (u.file === file ? { ...u, progress } : u)));
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploads((prev) => prev.map((u) => (u.file === file ? { ...u, status: "done", id: response.evidenceId } : u)));
        } else {
          setUploads((prev) => prev.map((u) => (u.file === file ? { ...u, status: "error" } : u)));
        }
      };

      xhr.onerror = () => {
        setUploads((prev) => prev.map((u) => (u.file === file ? { ...u, status: "error" } : u)));
      };

      xhr.send(body);
    } catch (error) {
      console.error(error);
      setUploads((prev) => prev.map((u) => (u.file === file ? { ...u, status: "error" } : u)));
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (step !== 2 || !projectId) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const newUploads = files.map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
      }));

      setUploads((prev) => [...prev, ...newUploads]);
      newUploads.forEach((u) => uploadFile(u.file));
    },
    [projectId, step]
  );

  const handleFinish = () => {
    if (!projectId) return;
    router.push(`/projects/${projectId}/skaderapport`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-8 relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -z-10" />
        {[1, 2, 3].map((s) => (
          <div key={s} className={cn("flex flex-col items-center bg-white px-4", step >= s ? "text-slate-900" : "text-slate-400")}>
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 bg-white transition-colors",
                step >= s ? "border-slate-900 font-bold" : "border-slate-200",
                step > s && "bg-slate-900 text-white border-slate-900"
              )}
            >
              {step > s ? <Check className="w-6 h-6" /> : s}
            </div>
            <span className="text-sm font-medium">
              {s === 1 && "Prosjekt"}
              {s === 2 && "Dokumentasjon"}
              {s === 3 && "Ferdig"}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Opprett Skaderapport</CardTitle>
            <CardDescription>Sett opp prosjektinformasjon. Du kan endre dette senere.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Eiendom (valgfri)</Label>
              <Select value={selectedPropertyId} onValueChange={(v) => {
                setSelectedPropertyId(v);
                if (v && v !== "custom") {
                  const p = properties.find((x) => x.id === v);
                  if (p) {
                    const gnrBnr = [p.gnr, p.bnr].filter(Boolean).join("/");
                    setFormData((prev) => ({
                      ...prev,
                      address: p.address || prev.address,
                      gnrBnr: gnrBnr || prev.gnrBnr,
                    }));
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg eiendom eller tilfeldig prosjekt" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Tilfeldig prosjekt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPropertyId === "custom" && (
              <div className="space-y-2">
                <Label>Navn på prosjektsted (valgfritt)</Label>
                <Input value={customPropertyName} onChange={(e) => setCustomPropertyName(e.target.value)} placeholder="F.eks. Industribygg Nordsiden" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label>Prosjektnavn</Label>
                <Input value={formData.projectName} onChange={(e) => setFormData({ ...formData, projectName: e.target.value })} placeholder="F.eks. Skaderapport – vanninntrengning kjeller" />
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Gateadresse" />
              </div>
              <div className="space-y-2">
                <Label>Gnr/Bnr</Label>
                <Input value={formData.gnrBnr} onChange={(e) => setFormData({ ...formData, gnrBnr: e.target.value })} placeholder="F.eks. 12/345" />
              </div>
              <div className="space-y-2">
                <Label>Oppdragsgiver</Label>
                <Input value={formData.client} onChange={(e) => setFormData({ ...formData, client: e.target.value })} placeholder="Navn / firma" />
              </div>
              <div className="space-y-2">
                <Label>Rapportforfatter</Label>
                <Input value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} placeholder="Navn" />
              </div>
              <div className="space-y-2">
                <Label>Firma</Label>
                <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Firma" />
              </div>
              <div className="space-y-2">
                <Label>Dato</Label>
                <DatePicker date={formData.reportDate} setDate={(d) => setFormData({ ...formData, reportDate: d })} placeholder="Velg dato" />
              </div>
              <div className="space-y-2">
                <Label>Saksnummer</Label>
                <Input value={formData.caseNumber} onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })} placeholder="F.eks. 2026-001" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Kort beskrivelse av saken</Label>
                <Textarea value={formData.shortDescription} onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })} placeholder="Kort bakgrunn og hva rapporten omhandler..." />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleCreateProject} disabled={loading || !formData.projectName}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Opprett & Gå til Dokumentasjon
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Dokumentasjon</CardTitle>
            <CardDescription>Dra og slipp filer her for å legge dem i dokumentasjonsbanken.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <Upload className="w-10 h-10 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-700 font-medium">Dra filer hit for opplasting</p>
              <p className="text-sm text-slate-500 mt-1">Støtter bilder, PDF, DOCX, video, tegninger og e-post.</p>
            </div>

            {uploads.length > 0 && (
              <div className="mt-6 space-y-3">
                {uploads.map((u) => (
                  <div key={`${u.file.name}-${u.file.lastModified}`} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{u.file.name}</div>
                      <div className="text-xs text-slate-500">{Math.round(u.file.size / 1024)} KB</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-500 w-10 text-right">
                        {u.status === "uploading" ? `${u.progress}%` : u.status === "done" ? "OK" : u.status === "error" ? "Feil" : ""}
                      </div>
                      {u.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                      {u.status === "done" && <Check className="h-4 w-4 text-emerald-600" />}
                      {u.status === "error" && <X className="h-4 w-4 text-red-600" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-6">
              <Button onClick={() => setStep(3)} disabled={!projectId}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Gå videre
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Skaderapport klar</CardTitle>
            <CardDescription>Prosjektet er opprettet. Du kan nå fylle ut seksjonene og generere PDF.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Button onClick={handleFinish} disabled={!projectId}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Åpne Skaderapport
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

