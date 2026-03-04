
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { generateLegalReportPdf } from "@/lib/reporting/report-generator";

export const maxDuration = 300; // 5 minutes timeout for generation fallback

export async function GET(
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

    const reportId = params.id;

    // Fetch report
    let report = await (prisma as any).reportInstance.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: "Rapport ikke funnet" }, { status: 404 });
    }

    // Check project access (optional but recommended)
    // For now, assume if user is authenticated they can access project reports (or rely on row-level security elsewhere)
    // But ideally verify project membership.
    // The previous actions also checked auth but not strictly project membership beyond user context.

    // FALLBACK: If PDF is missing, generate it now!
    if (!report.pdfUrl) {
      console.log(`PDF missing for report ${reportId}, generating fallback...`);
      try {
        const result = await generateLegalReportPdf(reportId);
        if (result.success && result.url) {
           // Refresh report data
           report = await (prisma as any).reportInstance.findUnique({
              where: { id: reportId },
           });
        } else {
           throw new Error("Generering feilet ved fallback");
        }
      } catch (genError) {
        console.error("Fallback generation failed:", genError);
        return NextResponse.json({ 
          error: `Kunne ikke generere PDF (Fallback V3): ${genError instanceof Error ? genError.message : String(genError)}` 
        }, { status: 500 });
      }
    }

    if (!report?.pdfUrl) {
      console.error("PDF generation failed or returned no URL even after fallback attempt");
      return NextResponse.json({ error: "Ingen PDF generert for denne rapporten (V2)" }, { status: 404 });
    }

    // Sign the URL
    let path = report.pdfUrl;
    if (report.pdfUrl.includes('/project-assets/')) {
      const parts = report.pdfUrl.split('/project-assets/');
      if (parts.length > 1) {
        path = parts[1];
      }
    }

    const { data, error } = await supabase.storage
      .from("project-assets")
      .createSignedUrl(path, 3600, {
        download: true // Force download
      });

    if (error || !data?.signedUrl) {
      console.error("Failed to sign URL:", error);
      // Fallback to public URL if signing fails (e.g. public bucket)
      return NextResponse.redirect(report.pdfUrl);
    }

    // Mark as downloaded
    await (prisma as any).reportInstance.update({
      where: { id: reportId },
      data: {
        backupDownloaded: true,
        backupDownloadedAt: new Date(),
      }
    });

    // Redirect to signed URL
    return NextResponse.redirect(data.signedUrl);

  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Intern feil ved nedlasting" }, { status: 500 });
  }
}
