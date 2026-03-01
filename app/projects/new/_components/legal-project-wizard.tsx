"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProject } from "@/app/actions/projects";
import { Loader2, Gavel, Upload, Calendar, ArrowRight, Check, MoveVertical, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Step 1: Grunnstruktur
// Step 2: Bevisimport
// Step 3: Tidslinjeoversikt

export default function LegalProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Step 1 Data
  const [formData, setFormData] = useState({
    title: "",
    counterparty: "",
    caseSubject: "",
    category: "",
    description: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  // Step 2 Data (Uploads)
  const [uploads, setUploads] = useState<{
    file: File;
    status: "pending" | "uploading" | "done" | "error";
    progress: number;
    id?: string; // Evidence ID after upload
  }[]>([]);

  // Step 3 Data (Timeline)
  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);

  const handleCreateProject = async () => {
    if (!formData.title || !formData.counterparty) return;
    
    setLoading(true);
    try {
      const project = await createProject({
        title: formData.title,
        description: formData.description,
        reportType: "LEGAL", // Important!
        counterparty: formData.counterparty,
        caseSubject: formData.caseSubject,
        category: formData.category,
        caseStartDate: formData.startDate,
        caseEndDate: formData.endDate,
        // No property/unit for now in this wizard, or we could add it.
        // The user said "Sakstittel, Motpart, Saken gjelder..."
      });
      
      setProjectId(project.id);
      setStep(2);
    } catch (error) {
      console.error("Failed to create project:", error);
      // Show error toast
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (step !== 2 || !projectId) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Add to uploads list
    const newUploads = files.map(file => ({
      file,
      status: "pending" as const,
      progress: 0
    }));

    setUploads(prev => [...prev, ...newUploads]);
    
    // Trigger upload for new files
    newUploads.forEach(uploadItem => uploadFile(uploadItem.file));
  }, [step, projectId]);

  const uploadFile = async (file: File) => {
    if (!projectId) return;

    // Update status to uploading
    setUploads(prev => prev.map(u => u.file === file ? { ...u, status: "uploading" } : u));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    formData.append("lastModified", file.lastModified.toString());

    try {
      // Use XMLHttpRequest for progress
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/projects/${projectId}/evidence/upload`);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploads(prev => prev.map(u => u.file === file ? { ...u, progress } : u));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploads(prev => prev.map(u => u.file === file ? { ...u, status: "done", id: response.evidenceId } : u));
        } else {
          setUploads(prev => prev.map(u => u.file === file ? { ...u, status: "error" } : u));
        }
      };

      xhr.onerror = () => {
        setUploads(prev => prev.map(u => u.file === file ? { ...u, status: "error" } : u));
      };

      xhr.send(formData);
    } catch (error) {
      console.error("Upload error:", error);
      setUploads(prev => prev.map(u => u.file === file ? { ...u, status: "error" } : u));
    }
  };

  const handleFinish = () => {
    if (projectId) {
      router.push(`/projects/${projectId}/evidence`); // Go to new Evidence Bank / Timeline view
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper */}
      <div className="flex justify-between items-center mb-8 relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -z-10" />
        {[1, 2, 3].map((s) => (
          <div key={s} className={cn(
            "flex flex-col items-center bg-white px-4",
            step >= s ? "text-slate-900" : "text-slate-400"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 bg-white transition-colors",
              step >= s ? "border-slate-900 font-bold" : "border-slate-200",
              step > s && "bg-slate-900 text-white border-slate-900"
            )}>
              {step > s ? <Check className="w-6 h-6" /> : s}
            </div>
            <span className="text-sm font-medium">
              {s === 1 && "Grunnstruktur"}
              {s === 2 && "Bevisimport"}
              {s === 3 && "Tidslinje"}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Grunnstruktur */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Opprett Dokumentasjonsrapport</CardTitle>
            <CardDescription>
              Sett opp grunnleggende informasjon for den juridiske rapporten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Sakstittel</Label>
                <Input 
                  id="title" 
                  placeholder="F.eks. Vannskade Bad 2.etg" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counterparty">Motpart</Label>
                <Input 
                  id="counterparty" 
                  placeholder="F.eks. Utleier AS / Forsikring" 
                  value={formData.counterparty}
                  onChange={e => setFormData({...formData, counterparty: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="caseSubject">Saken gjelder (kort)</Label>
                <Input 
                  id="caseSubject" 
                  placeholder="F.eks. Krav om erstatning etter lekkasje" 
                  value={formData.caseSubject}
                  onChange={e => setFormData({...formData, caseSubject: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Startdato for hendelse</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.startDate && "text-muted-foreground")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, "PPP", { locale: nb }) : "Velg dato"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={formData.startDate} onSelect={d => setFormData({...formData, startDate: d})} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Sluttdato (valgfri)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.endDate && "text-muted-foreground")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, "PPP", { locale: nb }) : "Velg dato"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={formData.endDate} onSelect={d => setFormData({...formData, endDate: d})} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="category">Hovedkategori</Label>
                <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="construction">Byggteknisk</SelectItem>
                    <SelectItem value="plumbing">Rør / VVS</SelectItem>
                    <SelectItem value="electrical">Elektro</SelectItem>
                    <SelectItem value="legal">Juridisk / Tvist</SelectItem>
                    <SelectItem value="insurance">Forsikringssak</SelectItem>
                    <SelectItem value="other">Annet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Beskrivelse / Bakgrunn</Label>
                <Textarea 
                  id="description" 
                  placeholder="Kort beskrivelse av saken..." 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleCreateProject} disabled={loading || !formData.title || !formData.counterparty}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Opprett & Gå til Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Bevisimport */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Import av Bevis</CardTitle>
            <CardDescription>
              Dra og slipp bilder, PDF-dokumenter eller EML-filer her. De lastes opp direkte til prosjektet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">Slipp filer her</h3>
              <p className="text-slate-500 mb-4">eller klikk for å velge fra maskinen</p>
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                multiple 
                accept=".jpg,.jpeg,.png,.pdf,.eml"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                     // Manually trigger onDrop logic
                     const event = { 
                       preventDefault: () => {}, 
                       dataTransfer: { files: e.target.files } 
                     } as unknown as React.DragEvent;
                     onDrop(event);
                  }
                }}
              />
              <p className="text-xs text-slate-400">Støtter: JPG, PNG, PDF, EML (Maks 50MB)</p>
            </div>

            {uploads.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                {uploads.map((upload, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded border text-sm">
                    {upload.status === "done" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : upload.status === "error" ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    <span className="truncate flex-1">{upload.file.name}</span>
                    {upload.status === "uploading" && (
                      <span className="text-xs text-slate-500">{upload.progress}%</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)} disabled>
                Tilbake
              </Button>
              <Button onClick={() => setStep(3)} disabled={uploads.some(u => u.status === "uploading")}>
                Gå til Tidslinjeoversikt <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Tidslinje (Preview / Link) */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Tidslinjeoversikt</CardTitle>
            <CardDescription>
              Prosjektet er opprettet. Gå til bevisoversikten for å sortere og datere hendelsene.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-emerald-900 mb-2">Prosjekt opprettet!</h3>
              <p className="text-emerald-700 mb-6">
                {uploads.length} filer er importert. Du kan nå organisere tidslinjen.
              </p>
              <Button size="lg" onClick={handleFinish} className="w-full md:w-auto">
                Åpne Tidslinje / Bevisbank
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
