"use server";

import { prisma } from "@/lib/prisma";
import { mapLegalDraftToReport } from "@/lib/reporting/legal-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { generateLegalReportPdf, generateReportPdf } from "@/lib/reporting/report-generator";

export async function generateLegalPdfFromSnapshot(reportId: string): Promise<{ success: boolean; pdfUrl: string; isNew: boolean }> {
  // 1. Fetch Report with Snapshots
  // Using 'any' cast to bypass potential stale type definitions
  const report = await (prisma as any).reportInstance.findUnique({
    where: { id: reportId },
    include: {
      project: true,
      snapshots: true
    }
  });

  if (!report) throw new Error("Rapport ikke funnet");
  if (!report.contentSnapshot) throw new Error("Mangler innholds-snapshot");

  // If PDF already exists, generate a signed URL for it (in case bucket is private)
  if (report.pdfUrl) {
    const supabase = createClient();
    let path = report.pdfUrl;
    
    // Extract path from public URL if present
    if (report.pdfUrl.includes('/project-assets/')) {
      const parts = report.pdfUrl.split('/project-assets/');
      if (parts.length > 1) {
        path = parts[1];
      }
    }

    // Attempt to sign the URL
    const { data } = await supabase.storage
      .from("project-assets")
      .createSignedUrl(path, 3600); // 1 hour

    return { 
      success: true, 
      pdfUrl: data?.signedUrl || report.pdfUrl, 
      isNew: false 
    };
  }

  // 2. Generate PDF using the centralized utility (SSOT)
  // This ensures consistent sorting, batch processing, and error handling
  try {
    const result = await generateLegalReportPdf(reportId);
    return { 
      success: result.success, 
      pdfUrl: result.url, 
      isNew: true 
    };
  } catch (error) {
    console.error("Error in generateLegalPdfFromSnapshot:", error);
    throw error;
  }
}

import { getProjectWithEvidence as getProjectWithEvidenceLib } from "@/lib/data/project";

// Helper to get project with evidence (used by legal-report-mapper or other consumers)
export async function getProjectWithEvidence(projectId: string) {
  return getProjectWithEvidenceLib(projectId);
}

export async function updateEvidenceInclusion(evidenceId: string, includeInReport: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  await (prisma as any).evidenceItem.update({
    where: { id: evidenceId },
    data: { includeInReport }
  });
}

// --- Archiving & Backup Actions ---

export async function regenerateReport(reportId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const result = await generateReportPdf(reportId);
  
  revalidatePath("/projects");
  // We can't revalidate specific project path easily without projectId, 
  // but generateLegalPdfFromSnapshot fetches the report which has projectId.
  // Ideally we should return projectId or revalidate inside generateLegalPdfFromSnapshot.
  
  return result;
}

export async function markReportAsDownloaded(reportId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await (prisma as any).reportInstance.update({
    where: { id: reportId },
    data: {
      backupDownloaded: true,
      backupDownloadedAt: new Date(),
    }
  });
  
  // Revalidate might be tricky as we don't know the project ID here directly without fetching
  // But usually the client will handle state or refresh
}

export async function archiveReport(reportId: string, projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Check if downloaded
  const report = await (prisma as any).reportInstance.findUnique({
    where: { id: reportId },
  });

  if (!report) throw new Error("Report not found");

  if (!report.backupDownloaded) {
    throw new Error("Rapporten må lastes ned før den kan arkiveres.");
  }

  // 2. Archive
  await (prisma as any).reportInstance.update({
    where: { id: reportId },
    data: {
      archived: true,
      archivedAt: new Date(),
      archivedBy: user.email, // Or user.id if preferred, schema says String?
    }
  });

  // 3. Revalidate
  // We need revalidatePath, but we need to import it.
  // Assuming the caller will handle revalidation or we return success.
}

export async function deleteReport(reportId: string, projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify ownership or admin status if needed, but for now basic auth check
  
  await (prisma as any).reportInstance.delete({
    where: { id: reportId },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/juridisk-rapport`);
}

export async function downloadProjectArchive(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // TODO: V2 - Implement ZIP generation of all legal reports
  // This function will:
  // 1. Fetch all reports for the project
  // 2. Generate PDFs for each report (using the snapshot data)
  // 3. Create a ZIP file containing all PDFs
  // 4. Mark all included reports as downloaded (backupDownloaded = true)
  // 5. Return the ZIP file stream/blob

  /* 
  const reports = await prisma.reportInstance.findMany({
    where: { projectId, archived: false }, // Should we include archived ones too? usually yes for full backup
  });

  // ... Generate ZIP logic ...

  // Update status
  await prisma.reportInstance.updateMany({
    where: { projectId },
    data: {
      backupDownloaded: true,
      backupDownloadedAt: new Date()
    }
  });
  */

  throw new Error("Project Archive Download (ZIP) is coming in V2");
}
