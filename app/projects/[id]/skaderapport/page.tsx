import { ReportHistoryTable } from "@/components/report-history-table";
import { DamageReportDraftForm } from "@/components/damage-report-form";
import { getProjectWithEvidence } from "@/lib/data/project";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { serialize } from "@/lib/utils/serialization";

export default async function DamageReportPage({ params }: { params: { id: string } }) {
  try {
    const rawProject = (await getProjectWithEvidence(params.id)) as any;

    if (!rawProject) {
      notFound();
    }

    const project = serialize(rawProject);
    const draft = project.damageReportDraft || {};

    const evidenceItems = (project.evidenceItems || []).map((item: any) => ({
      id: item.id,
      evidenceNumber: item.evidenceNumber,
      title: item.title,
      description: item.description,
      includeInReport: item.includeInReport,
      sourceType: item.sourceType,
      legalDate: item.legalDate,
      fileType: item.file?.fileType,
      fileUrl: item.file?.url || item.file?.storagePath,
    }));

    const events = (project.events || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      evidenceItems: (e.evidenceItems || []).map((link: any) => ({
        id: link.evidence?.id,
        evidenceNumber: link.evidence?.evidenceNumber,
        title: link.evidence?.title,
      })),
    }));

    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={`/projects/${params.id}`} className="text-slate-500 hover:text-slate-900 flex items-center text-sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake til prosjekt: {project.title}
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Skaderapport</h1>
        <p className="text-muted-foreground mb-8">Utkast for {project.title}. Endringer lagres automatisk.</p>

        {project.sequence?.lastReportVersion && project.sequence.lastReportVersion > 0 && (
          <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-md inline-flex items-center mb-6">
            <span className="mr-2">🔒</span>
            Rapport er tidligere generert (v{project.sequence.lastReportVersion}). Nye endringer vil opprette v{project.sequence.lastReportVersion + 1}.
          </div>
        )}

        <DamageReportDraftForm
          projectId={project.id}
          initialData={draft}
          evidenceItems={evidenceItems}
          initialEvents={events}
          onGenerateReport={async () => {
            "use server";
            revalidatePath(`/projects/${params.id}/skaderapport`);
          }}
        />

        {project.reportInstances && project.reportInstances.length > 0 && (
          <ReportHistoryTable
            reports={project.reportInstances
              .filter((r: any) => r.reportType === "DAMAGE")
              .map((r: any) => ({
                id: r.id,
                versionNumber: r.versionNumber,
                createdAt: r.createdAt,
                totalEvidenceCount: r.snapshots ? r.snapshots.length : 0,
                archived: r.archived,
                backupDownloaded: r.backupDownloaded,
                backupDownloadedAt: r.backupDownloadedAt,
                archivedAt: r.archivedAt,
                pdfUrl: r.pdfUrl,
              }))}
            projectId={project.id}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error("Error loading DamageReportPage:", error);
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Noe gikk galt</h1>
        <p className="text-slate-600 mb-4">Kunne ikke laste skaderapport side.</p>
        <pre className="bg-slate-100 p-4 rounded text-left inline-block max-w-full overflow-auto text-xs">
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <div className="mt-8">
          <Link href={`/projects/${params.id}`} className="text-blue-600 hover:underline">
            Gå tilbake til prosjektet
          </Link>
        </div>
      </div>
    );
  }
}

