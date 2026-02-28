import { ReportHistoryTable } from "@/components/report-history-table";
import { LegalReportDraftForm } from "@/components/legal-report-form";
import { getProjectWithEvidence } from "@/app/actions/reports";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

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
      {project.reports && project.reports.length > 0 && (
        <ReportHistoryTable reports={project.reports} projectId={project.id} />
      )}
    </div>
  );
}
