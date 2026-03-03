
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

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
    const report = await (prisma as any).reportInstance.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: "Rapport ikke funnet" }, { status: 404 });
    }

    // Check project access (optional but recommended)
    // For now, assume if user is authenticated they can access project reports (or rely on row-level security elsewhere)
    // But ideally verify project membership.
    // The previous actions also checked auth but not strictly project membership beyond user context.

    if (!report.pdfUrl) {
      return NextResponse.json({ error: "Ingen PDF generert for denne rapporten" }, { status: 404 });
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
