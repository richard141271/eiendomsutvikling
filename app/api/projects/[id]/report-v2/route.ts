import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { mapProjectToReport } from "@/lib/reporting/project-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";

export const runtime = "nodejs";

async function getTransformedImageUrl(
  imageUrl: string
): Promise<string | null> {
  try {
    const url = new URL(imageUrl);
    const path = url.pathname.replace("/storage/v1/object/public/", "");
    const [bucket, ...objectParts] = path.split("/");
    const objectName = objectParts.join("/");

    if (!bucket || !objectName) return imageUrl;

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase.storage
      .from(bucket)
      .createSignedUrl(objectName, 60 * 60, {
        transform: {
          width: 1200,
          quality: 75,
        },
      });

    if (error || !data?.signedUrl) {
      return imageUrl;
    }

    return data.signedUrl;
  } catch {
    return imageUrl;
  }
}

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

    const entriesWithTransformedUrls = await Promise.all(
      project.entries.map(async (entry) => {
        if (!entry.imageUrl) return entry;
        const transformed = await getTransformedImageUrl(entry.imageUrl);
        return {
          ...entry,
          imageUrl: transformed || entry.imageUrl,
        };
      })
    );

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
