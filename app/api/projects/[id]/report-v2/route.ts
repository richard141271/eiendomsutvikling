import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
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

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
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
