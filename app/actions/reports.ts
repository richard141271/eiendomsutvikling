"use server";

import { prisma } from "@/lib/prisma";
import { mapLegalReportToDocument } from "@/lib/reporting/legal-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

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

  // If PDF already exists, return it (idempotency)
  if (report.pdfUrl) {
    return { 
      success: true, 
      pdfUrl: report.pdfUrl, 
      isNew: false 
    };
  }

  // 2. Prepare Data for Mapper
  // Fetch files to get storage paths
  const snapshots = report.snapshots as any[];
  console.log(`Processing ${snapshots.length} snapshots for report ${reportId}`);

  const fileIds = snapshots.map((s: any) => s.fileId).filter(Boolean);
  
  // Using 'any' cast for file model access
  const files = await (prisma as any).file.findMany({
    where: { id: { in: fileIds } }
  });
  const fileMap = new Map(files.map((f: any) => [f.id, f]));

  const supabase = createClient();
  
  // Batch processing for signed URLs to avoid rate limits or timeouts
  const BATCH_SIZE = 5;
  const evidenceItems: any[] = [];
  
  for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
    const batch = snapshots.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(batch.map(async (s: any) => {
        const file = s.fileId ? fileMap.get(s.fileId) : null;
        let url = (file as any)?.storagePath;
        
        // Resolve public/signed URL if it's a path
        if (url && !url.startsWith('http')) {
          // Generate a signed URL valid for 1 hour
          const { data, error } = await supabase.storage
              .from("project-assets")
              .createSignedUrl(url, 3600);
              
          if (data?.signedUrl) {
              url = data.signedUrl;
          } else {
              console.error(`Failed to sign URL for file ${s.fileId}:`, error);
              // Fallback to public URL if signing fails (e.g. if bucket is public)
              const { data: publicData } = supabase.storage
                  .from("project-assets")
                  .getPublicUrl(url);
              url = publicData.publicUrl;
          }
        }
  
        return {
          id: s.evidenceItemId,
          evidenceNumber: s.evidenceNumber,
          title: s.title,
          description: s.description,
          fileId: s.fileId,
          file: file ? {
            url: url,
            contentType: (file as any).fileType || 'image/jpeg'
          } : undefined
        };
    }));
    
    evidenceItems.push(...batchResults);
  }

  // 3. Map to ReportDocument
  // contentSnapshot is JSON, cast to any
  const reportDoc = mapLegalReportToDocument({
    project: report.project,
    draft: report.contentSnapshot as any,
    evidenceItems: evidenceItems as any,
    versionNumber: report.versionNumber
  });

  // 4. Generate PDF
  const renderer = new PdfReportRenderer();
  const pdfBuffer = await renderer.render(reportDoc);

  // 5. Upload to Supabase
  const fileName = `reports/legal/${report.project.id}/${report.versionNumber}-${Date.now()}.pdf`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("project-assets")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from("project-assets")
    .getPublicUrl(fileName);

  // 6. Update ReportInstance with URL
  await (prisma as any).reportInstance.update({
    where: { id: reportId },
    data: {
      pdfUrl: publicUrl,
      pdfGeneratedAt: new Date(),
      pdfSize: pdfBuffer.length
    }
  });

  return { success: true, pdfUrl: publicUrl, isNew: true };
}

// Helper to get project with evidence (used by legal-report-mapper or other consumers)
export async function getProjectWithEvidence(projectId: string) {
  return await (prisma as any).project.findUnique({
    where: { id: projectId },
    include: {
      evidenceItems: {
        where: { deletedAt: null },
        orderBy: { evidenceNumber: 'asc' }
      } as any, // Cast to avoid strict type checks on include
      legalReportDraft: true,
      sequence: true,
      reportInstances: {
        orderBy: { versionNumber: 'desc' },
        include: { snapshots: true }
      } as any
    }
  });
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

  const result = await generateLegalPdfFromSnapshot(reportId);
  
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
