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
        <div className="mt-12 max-w-4xl mx-auto pb-12">
          <h2 className="text-2xl font-bold mb-4">Rapporthistorikk</h2>
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-xs border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Versjon</th>
                  <th className="px-6 py-3 font-medium">Generert</th>
                  <th className="px-6 py-3 font-medium">Bevis</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {project.reports.map((report: any) => (
                  <tr key={report.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-primary">v{report.versionNumber}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString('nb-NO')} 
                      <span className="ml-2 text-xs opacity-70">
                        {new Date(report.createdAt).toLocaleTimeString('nb-NO', {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </td>
                    <td className="px-6 py-4">{report.totalEvidenceCount} stk</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        Låst & Generert
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
