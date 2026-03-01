
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { mapLegalDraftToReport } from "@/lib/reporting/legal-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id;
    console.log(`Starting generation for report ${reportId}`);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Report with Snapshots and Project
    // Use explicit include to get related data
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
      return NextResponse.json({ error: "Rapport ikke funnet" }, { status: 404 });
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
    const BATCH_SIZE = 10; // Increased batch size slightly for API route
    const evidenceItems: any[] = [];
    
    // We use the admin client for signing URLs to ensure we have permission
    // regardless of the current user's session context (though usually same bucket)
    const adminSupabase = createAdminClient();
    const bucketName = "project-assets"; // Assuming this is the bucket

    for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
      const batch = snapshots.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(batch.map(async (s: any) => {
          const file = s.fileId ? fileMap.get(s.fileId) : null;
          let url = (file as any)?.storagePath;
          
          if (url && !url.startsWith('http')) {
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
            imageUrl: url // The renderer expects 'imageUrl'
          };
      }));
      
      evidenceItems.push(...batchResults);
    }

    // 3. Map to ReportDocument
    const reportDoc = mapLegalDraftToReport(
      report.project as any,
      report.contentSnapshot as any,
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
    // We only store the main URL in the existing schema
    await (prisma as any).reportInstance.update({
      where: { id: reportId },
      data: {
        pdfUrl: mainUrl,
        pdfGeneratedAt: new Date(),
        pdfSize: mainBuffer.length,
        // We might want to store attachments in a new field later, 
        // but for now we rely on the user downloading the main report 
        // which references them (though links are not clickable yet).
        // OR we could append the attachment URLs to the 'notes' or similar if it existed.
      }
    });

    return NextResponse.json({
      success: true,
      url: mainUrl,
      attachments
    });

  } catch (error) {
    console.error("Legal Report Generation Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ukjent feil" },
      { status: 500 }
    );
  }
}
