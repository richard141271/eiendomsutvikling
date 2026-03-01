import { ReportHistoryTable } from "@/components/report-history-table";
import { LegalReportDraftForm } from "@/components/legal-report-form";
import { getProjectWithEvidence } from "@/app/actions/reports";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function LegalReportPage({ params }: { params: { id: string } }) {
  const project = await getProjectWithEvidence(params.id) as any;
  
  if (!project) {
    notFound();
  }

  // Get draft or empty object
  const draft = project.legalReportDraft || {};
  
  // Transform evidence items for the form
  const evidenceItems = project.evidenceItems.map((item: any) => ({
    id: item.id,
    evidenceNumber: item.evidenceNumber,
    title: item.title,
    includeInReport: item.includeInReport,
  }));

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link 
          href={`/projects/${params.id}`} 
          className="text-slate-500 hover:text-slate-900 flex items-center text-sm"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> 
          Tilbake til prosjekt: {project.title}
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Juridisk Dokumentasjonsrapport</h1>
      <p className="text-muted-foreground mb-8">
        Utkast for {project.title}. Endringer lagres automatisk.
      </p>
      
      {/* Badge if locked */}
      {project.sequence?.lastReportVersion && project.sequence.lastReportVersion > 0 && (
         <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-md inline-flex items-center mb-6">
           <span className="mr-2">🔒</span>
           Rapport er tidligere generert (v{project.sequence.lastReportVersion}). 
           Nye endringer vil opprette v{project.sequence.lastReportVersion + 1}.
         </div>
      )}

      <LegalReportDraftForm 
        projectId={project.id}
        initialData={draft}
        evidenceItems={evidenceItems}
        onGenerateReport={async () => {
          "use server";
          revalidatePath(`/projects/${params.id}/juridisk-rapport`);
        }}
      />

      {/* Report History */}
      {project.reportInstances && project.reportInstances.length > 0 && (
        <ReportHistoryTable 
          reports={project.reportInstances.map((r: any) => ({
            id: r.id,
            versionNumber: r.versionNumber,
            createdAt: new Date(r.createdAt).toISOString(),
            totalEvidenceCount: r.snapshots ? r.snapshots.length : 0,
            archived: r.archived,
            backupDownloaded: r.backupDownloaded,
            backupDownloadedAt: r.backupDownloadedAt ? new Date(r.backupDownloadedAt).toISOString() : undefined,
            archivedAt: r.archivedAt ? new Date(r.archivedAt).toISOString() : undefined,
            pdfUrl: r.pdfUrl,
          }))} 
          projectId={project.id} 
        />
      )}
    </div>
  );
}
