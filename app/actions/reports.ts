"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

export async function getProjectWithEvidence(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      evidenceItems: {
        where: { deletedAt: null },
        orderBy: { evidenceNumber: 'asc' }
      },
      legalReportDraft: true,
      sequence: true, // Check for lock status if needed
      reports: {
        orderBy: { versionNumber: 'desc' },
        include: { snapshots: true }
      }
    }
  });

  return project;
}

export async function updateEvidenceInclusion(evidenceId: string, includeInReport: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  await prisma.evidenceItem.update({
    where: { id: evidenceId },
    data: { includeInReport }
  });
}

// --- Archiving & Backup Actions ---

export async function markReportAsDownloaded(reportId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.reportInstance.update({
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
  const report = await prisma.reportInstance.findUnique({
    where: { id: reportId },
  });

  if (!report) throw new Error("Report not found");

  if (!report.backupDownloaded) {
    throw new Error("Rapporten må lastes ned før den kan arkiveres.");
  }

  // 2. Archive
  await prisma.reportInstance.update({
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
