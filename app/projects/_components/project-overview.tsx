
"use client";

import { archiveProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, FileText, Download, Loader2, MapPin } from "lucide-react";
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

          {project.reports && project.reports.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium text-slate-500">Tidligere rapporter</h4>
              {project.reports.map((report: any) => (
                <a 
                  key={report.id} 
                  href={`/api/projects/reports/${report.id}`}
                  target="_blank"
                  className="flex items-center p-3 rounded-lg border hover:bg-slate-50 transition-colors text-sm"
                >
                  <FileText className="w-4 h-4 mr-2 text-slate-400" />
                  <span className="flex-1">Rapport {new Date(report.createdAt).toLocaleString("no-NO")}</span>
                  <Download className="w-4 h-4 text-slate-400" />
                </a>
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
