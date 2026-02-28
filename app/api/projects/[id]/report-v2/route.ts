import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { mapProjectToReport } from "@/lib/reporting/project-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";

export const runtime = "nodejs";

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

    const project = await prisma.project.findUnique({
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
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Prosjekt ikke funnet" },
        { status: 404 }
      );
    }

    const entriesWithTransformedUrls = project.entries.map((entry) => {
      if (!entry.imageUrl) return entry;
      console.log("TRANSFORMED URL:", entry.imageUrl);
      return entry;
    });

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
        attachments: attachments as any, // Cast to any or InputJsonValue if needed
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
