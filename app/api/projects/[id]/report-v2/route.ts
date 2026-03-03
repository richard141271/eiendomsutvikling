import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { mapProjectToReport } from "@/lib/reporting/project-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes timeout for large reports

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client for storage operations
    const adminSupabase = createAdminClient();
    
    // Ensure bucket exists
    const bucketName = 'reports-v3'; // Fresh start with 500MB limit
    await ensureBucketExists(bucketName);

    const project = await (prisma as any).project.findUnique({
      where: { id: params.id },
      include: {
        property: true,
        unit: true,
        entries: {
          where: { includeInReport: true },
          orderBy: { createdAt: "asc" },
        },
        tasks: {
          orderBy: { createdAt: "asc" },
        },
        evidenceItems: {
          select: {
            id: true,
            evidenceNumber: true,
            originalEntryId: true,
            title: true,
            description: true,
          }
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Prosjekt ikke funnet" },
        { status: 404 }
      );
    }

    const entriesWithTransformedUrls = await Promise.all(project.entries.map(async (entry: any) => {
      if (!entry.imageUrl) return entry;
      
      // Filter out non-image types to prevent pdf-lib crash
      const isDocument = (entry as any).type === "DOCUMENT" || 
                         entry.imageUrl.toLowerCase().includes(".pdf") ||
                         entry.imageUrl.toLowerCase().includes(".doc") ||
                         entry.imageUrl.toLowerCase().includes(".xls") ||
                         entry.imageUrl.toLowerCase().includes(".msg") ||
                         entry.imageUrl.toLowerCase().includes(".eml");

      if (isDocument) {
        console.log("Skipping image rendering for document entry:", entry.id);
        return { ...entry, imageUrl: null };
      }

      // If it's a public URL, use it directly
      if (entry.imageUrl.startsWith("http")) {
         return entry;
      }

      // Otherwise try to sign it (fallback for legacy/private paths)
      try {
        const { data } = await adminSupabase.storage
          .from("project-assets") 
          .createSignedUrl(entry.imageUrl, 3600);
          
        if (data?.signedUrl) {
           return { ...entry, imageUrl: data.signedUrl };
        }
      } catch (e) {
        console.error("Failed to sign URL:", e);
      }
      
      return { ...entry, imageUrl: null }; // Fallback: no image if signing fails
    }));

    const projectForReport = {
      ...project,
      entries: entriesWithTransformedUrls,
    } as any;

    const reportDocument = mapProjectToReport(projectForReport);

    const renderer = new PdfReportRenderer();
    const pkg = await renderer.renderPackage(reportDocument);

    const timestamp = Date.now();
    const mainFileName = `project-report-v3-${project.id}-${timestamp}-main.pdf`;
    const mainBuffer = Buffer.from(pkg.main);
    
    const fileSizeMB = mainBuffer.length / (1024 * 1024);
    console.log(`Generated Main PDF size: ${fileSizeMB.toFixed(2)} MB`);

    // Upload Main Report to Supabase Storage
    const { error: uploadError } = await adminSupabase.storage
      .from(bucketName)
      .upload(`reports/${mainFileName}`, mainBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error (Main):", uploadError);
      throw new Error(`Kunne ikke laste opp hovedrapport (${fileSizeMB.toFixed(2)} MB) til skyen: ${uploadError.message}`);
    }

    // Get public URL for Main Report
    const { data: { publicUrl: mainUrl } } = adminSupabase
      .storage
      .from(bucketName)
      .getPublicUrl(`reports/${mainFileName}`);

    // Upload Parts (Appendices)
    const attachments: { title: string; url: string }[] = [];
    
    for (let i = 0; i < pkg.parts.length; i++) {
      const part = pkg.parts[i];
      const partFileName = `project-report-v3-${project.id}-${timestamp}-part-${i+1}.pdf`;
      const partBuffer = Buffer.from(part.data);
      
      const partSizeMB = partBuffer.length / (1024 * 1024);
      console.log(`Generated Part ${i+1} size: ${partSizeMB.toFixed(2)} MB`);

      const { error: partUploadError } = await adminSupabase.storage
        .from(bucketName)
        .upload(`reports/${partFileName}`, partBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (partUploadError) {
        console.error(`Supabase upload error (Part ${i+1}):`, partUploadError);
        throw new Error(`Kunne ikke laste opp vedlegg ${i+1} (${partSizeMB.toFixed(2)} MB): ${partUploadError.message}`);
      }

      const { data: { publicUrl: partUrl } } = adminSupabase
        .storage
        .from(bucketName)
        .getPublicUrl(`reports/${partFileName}`);
        
      attachments.push({
        title: part.name,
        url: partUrl
      });
    }

    // Save to DB
    console.log("Saving report v3 package to DB:", mainUrl, attachments);
    await prisma.projectReport.create({
      data: {
        projectId: project.id,
        pdfUrl: mainUrl,
        // @ts-ignore
        attachments: attachments, 
      },
    });

    // Return JSON with URL and attachments
    return NextResponse.json({
      url: mainUrl,
      fileName: mainFileName,
      attachments: attachments
    });
  } catch (error) {
    console.error("Error generating v2 report:", error);
    return NextResponse.json(
      {
        error: "Intern serverfeil",
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
