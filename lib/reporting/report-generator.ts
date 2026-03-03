
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";
import { mapLegalDraftToReport } from "@/lib/reporting/legal-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";

export async function generateLegalReportPdf(reportId: string) {
  console.log(`Starting PDF generation for report ${reportId}`);

  // 1. Fetch Report with Snapshots and Project
  const report = await (prisma as any).reportInstance.findUnique({
    where: { id: reportId },
    include: {
      project: {
        include: {
          property: true,
          unit: true,
          participants: {
            include: {
              user: true
            }
          }
        }
      },
      snapshots: {
        orderBy: { evidenceNumber: 'asc' }
      }
    }
  });

  if (!report) {
    throw new Error("Rapport ikke funnet");
  }

  // 2. Prepare Data for Mapper
  const snapshots = report.snapshots;
  console.log(`Processing ${snapshots.length} snapshots for report ${reportId}`);

  // Fetch file paths
  const fileIds = snapshots.map((s: any) => s.fileId).filter(Boolean);
  const files = await (prisma as any).file.findMany({
    where: { id: { in: fileIds } }
  });
  const fileMap = new Map(files.map((f: any) => [f.id, f]));

  // Batch processing for signed URLs
  const BATCH_SIZE = 10;
  const evidenceItems: any[] = [];
  
  const adminSupabase = createAdminClient();
  const bucketName = "project-assets";

  for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
    const batch = snapshots.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(batch.map(async (s: any) => {
        const file = s.fileId ? fileMap.get(s.fileId) : null;
        let url = (file as any)?.storagePath;
        const fileType = (file as any)?.fileType || "";
        
        // Check if it's an image suitable for embedding
        const isImage = fileType.startsWith("image/") || 
                        (url && (url.toLowerCase().endsWith(".jpg") || 
                                 url.toLowerCase().endsWith(".jpeg") || 
                                 url.toLowerCase().endsWith(".png") ||
                                 url.toLowerCase().endsWith(".webp")));

        if (!isImage) {
           // console.log(`Skipping image URL for non-image file ${s.fileId} (${fileType})`);
           url = undefined; // Don't try to embed as image
        } else if (url && !url.startsWith('http')) {
          const { data, error } = await adminSupabase.storage
              .from(bucketName)
              .createSignedUrl(url, 3600);
          
          if (data?.signedUrl) {
              url = data.signedUrl;
          } else {
              console.error(`Failed to sign URL for file ${s.fileId}:`, error);
              // Fallback to public
              const { data: publicData } = adminSupabase.storage
                  .from(bucketName)
                  .getPublicUrl(url);
              url = publicData.publicUrl;
          }
        }

        return {
          id: s.evidenceItemId,
          evidenceNumber: s.evidenceNumber,
          evidenceCode: `B-${String(s.evidenceNumber).padStart(3, '0')}`,
          title: s.title,
          description: s.description,
          date: s.includedAt,
          fileId: s.fileId,
          imageUrl: url
        };
    }));
    
    evidenceItems.push(...batchResults);
  }

  // 3. Map to ReportDocument
  const draftSnapshot = (report.contentSnapshot as any) || {};
  
  const reportDoc = mapLegalDraftToReport(
    report.project as any,
    draftSnapshot,
    evidenceItems,
    report.versionNumber
  );

  // 4. Generate PDF Package
  const renderer = new PdfReportRenderer();
  const pkg = await renderer.renderPackage(reportDoc);

  const timestamp = Date.now();
  const mainFileName = `reports/legal/${report.project.id}/${report.versionNumber}-${timestamp}-main.pdf`;
  const mainBuffer = Buffer.from(pkg.main);
  
  // Upload Main Report
  const { error: uploadError } = await adminSupabase.storage
    .from(bucketName)
    .upload(mainFileName, mainBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: { publicUrl: mainUrl } } = adminSupabase.storage
    .from(bucketName)
    .getPublicUrl(mainFileName);

  // Upload Parts (Appendices)
  const attachments: { title: string; url: string }[] = [];
  
  for (let i = 0; i < pkg.parts.length; i++) {
    const part = pkg.parts[i];
    const partFileName = `reports/legal/${report.project.id}/${report.versionNumber}-${timestamp}-part${i+1}.pdf`;
    
    await adminSupabase.storage
      .from(bucketName)
      .upload(partFileName, Buffer.from(part.data), {
          contentType: 'application/pdf',
          upsert: true
      });

    const { data: { publicUrl: partUrl } } = adminSupabase.storage
      .from(bucketName)
      .getPublicUrl(partFileName);
      
    attachments.push({ title: part.name, url: partUrl });
  }

  // 5. Update ReportInstance
  await (prisma as any).reportInstance.update({
    where: { id: reportId },
    data: {
      pdfUrl: mainUrl,
      pdfGeneratedAt: new Date(),
      pdfSize: mainBuffer.length,
    }
  });

  return { 
    success: true, 
    url: mainUrl,
    attachments
  };
}
