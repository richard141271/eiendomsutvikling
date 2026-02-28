
"use client";

import { archiveProject } from "@/app/actions/projects";
import { regenerateReport } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, FileText, Download, Loader2, MapPin, Paperclip, Gavel, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProjectOverviewProps {
  project: any;
  canTestNewReport: boolean;
}

export default function ProjectOverview({ project, canTestNewReport }: ProjectOverviewProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [generatingV2, setGeneratingV2] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  async function handleArchive() {
    if (confirm("Er du sikker på at du vil arkivere prosjektet? Det vil bli låst for endringer.")) {
      await archiveProject(project.id);
      router.push("/projects");
    }
  }

  async function handleGenerateReport() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/report`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.details || "Generering feilet");
      }
      
      // Handle PDF blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      
      // Clean up URL after use
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(`Kunne ikke generere rapport: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateReportV2() {
    setGeneratingV2(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/report-v2`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.details || "Generering feilet");
      }

      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("Kunne ikke hente rapport-URL");
      }
      
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(`Kunne ikke generere rapport (ny motor): ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setGeneratingV2(false);
    }
  }

  async function handleRegenerate(reportId: string) {
    if (!confirm("Vil du forsøke å generere PDF på nytt?")) return;
    setRegeneratingId(reportId);
    try {
        await regenerateReport(reportId);
        router.refresh();
    } catch (error) {
        console.error(error);
        alert("Feilet: " + (error instanceof Error ? error.message : String(error)));
    } finally {
        setRegeneratingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Prosjektdetaljer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <span className="text-sm font-medium text-slate-500 block">Tittel</span>
            <span className="text-lg">{project.title}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500 block">Beskrivelse</span>
            <p className="text-slate-700 whitespace-pre-wrap">{project.description || "-"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <span className="text-sm font-medium text-slate-500 block">Eiendom</span>
                <span>{project.property?.name || project.customPropertyName || "Tilfeldig prosjekt"}</span>
             </div>
             {project.unit && (
               <div>
                  <span className="text-sm font-medium text-slate-500 block">Enhet</span>
                  <span>{project.unit.unitNumber || project.unit.name}</span>
               </div>
             )}
             <div>
                <span className="text-sm font-medium text-slate-500 block">Opprettet</span>
                <span>{new Date(project.createdAt).toLocaleDateString("no-NO")}</span>
             </div>
             <div>
                <span className="text-sm font-medium text-slate-500 block">Status</span>
                <span className={project.status === "ACTIVE" ? "text-emerald-600 font-bold" : "text-slate-500"}>
                  {project.status === "ACTIVE" ? "Aktiv" : "Arkivert"}
                </span>
             </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rapporter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateReport} disabled={generating} className="w-full" variant="outline">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            Generer Prosjektrapport (PDF)
          </Button>

          <Link href={`/projects/${project.id}/juridisk-rapport`} className="block w-full">
            <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white">
              <Gavel className="w-4 h-4 mr-2" />
              Opprett Dokumentasjonsrapport
            </Button>
          </Link>

          {canTestNewReport && (
            <Button
              onClick={handleGenerateReportV2}
              disabled={generatingV2}
              className="w-full"
              variant="outline"
            >
              {generatingV2 ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Test ny rapportmotor
            </Button>
          )}

          {project.reportInstances && project.reportInstances.length > 0 && (
            <div className="space-y-4 mt-6">
              <h4 className="text-sm font-medium text-slate-500 border-b pb-2">Juridiske Rapporter</h4>
              {project.reportInstances.map((report: any) => (
                <div key={report.id} className="border rounded-lg p-3 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center text-slate-700 font-medium">
                    <Gavel className="w-4 h-4 mr-2 text-slate-400" />
                    <span className="flex-1">
                      {report.reportType === "LEGAL" ? "Juridisk Rapport" : "Rapport"} v{report.versionNumber} 
                      <span className="text-slate-400 font-normal ml-2">
                        {new Date(report.createdAt).toLocaleString("no-NO")}
                      </span>
                    </span>
                  </div>
                  
                  {report.pdfUrl ? (
                    <a 
                      href={report.pdfUrl}
                      target="_blank"
                      className="flex items-center text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      <Download className="w-3 h-3 mr-1" /> Last ned
                    </a>
                  ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-600">Genererer PDF...</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => handleRegenerate(report.id)}
                            disabled={regeneratingId === report.id}
                            title="Prøv å generere på nytt"
                        >
                            {regeneratingId === report.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3 w-3" />
                            )}
                        </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {project.reports && project.reports.length > 0 && (
            <div className="space-y-4 mt-6">
              <h4 className="text-sm font-medium text-slate-500 border-b pb-2">Tidligere rapporter</h4>
              {project.reports.map((report: any) => (
                <div key={report.id} className="border rounded-lg p-3 text-sm hover:bg-slate-50 transition-colors">
                  <a 
                    href={report.pdfUrl}
                    target="_blank"
                    className="flex items-center text-slate-700 hover:text-blue-600 font-medium"
                  >
                    <FileText className="w-4 h-4 mr-2 text-slate-400" />
                    <span className="flex-1">Rapport {new Date(report.createdAt).toLocaleString("no-NO")}</span>
                    <Download className="w-4 h-4 text-slate-400" />
                  </a>
                  
                  {report.attachments && Array.isArray(report.attachments) && report.attachments.length > 0 && (
                    <div className="mt-3 pl-2 space-y-2 border-l-2 border-slate-200 ml-2">
                      {report.attachments.map((att: any, i: number) => (
                        <a 
                          key={i} 
                          href={att.url} 
                          target="_blank" 
                          className="flex items-center text-slate-500 hover:text-blue-600 text-xs py-1"
                        >
                          <Paperclip className="w-3 h-3 mr-2" /> 
                          {att.title || `Vedlegg ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="pt-8 border-t">
        <Button variant="destructive" className="w-full" onClick={handleArchive}>
          <Archive className="w-4 h-4 mr-2" /> Arkiver Prosjekt
        </Button>
        <p className="text-xs text-center text-slate-500 mt-2">
          Arkiverte prosjekter låses for redigering men kan fortsatt leses.
        </p>
      </div>
    </div>
  );
}
