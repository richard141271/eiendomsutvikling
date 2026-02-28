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
    const bucketName = 'reports-large'; // New bucket to bypass old limits
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
    const pdfBytes = await renderer.render(reportDocument);

    const fileName = `project-report-v2-${project.id}-${Date.now()}.pdf`;
    const pdfBuffer = Buffer.from(pdfBytes);
    
    const fileSizeMB = pdfBuffer.length / (1024 * 1024);
    console.log(`Generated PDF size: ${fileSizeMB.toFixed(2)} MB`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from(bucketName)
      .upload(`reports/${fileName}`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error(`Kunne ikke laste opp rapport (${fileSizeMB.toFixed(2)} MB) til skyen: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = adminSupabase
      .storage
      .from(bucketName)
      .getPublicUrl(`reports/${fileName}`);

    // Save to DB
    console.log("Saving report v2 to DB:", publicUrl);
    await prisma.projectReport.create({
      data: {
        projectId: project.id,
        pdfUrl: publicUrl,
        // pdfHash is optional and we don't have it from the new renderer yet, 
        // but we could generate one if needed. For now, leaving it undefined.
      },
    });

    // Return JSON with URL to avoid Vercel response payload limits (4.5MB)
    return NextResponse.json({
      url: publicUrl,
      fileName: fileName
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
