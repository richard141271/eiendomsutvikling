import { NextResponse } from "next/server";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";
import { mapCleanupDocumentationToReport } from "@/lib/reporting/cleanup-documentation-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";
import { getCleanupEvidenceMap, getCleanupProject, listCleanupEvidenceEntries } from "@/src/modules/rydderen/services";

export const runtime = "nodejs";
export const maxDuration = 300;

function getStatusCode(error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return 401;
  }
  return 500;
}

export async function POST(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const payload = await request.json().catch(() => ({}));
    const search = typeof payload?.search === "string" ? payload.search : "";

    const [project, map, entries] = await Promise.all([
      getCleanupProject(params.cleanupProjectId),
      getCleanupEvidenceMap(params.cleanupProjectId),
      listCleanupEvidenceEntries(params.cleanupProjectId),
    ]);

    const reportDocument = mapCleanupDocumentationToReport({
      project,
      map,
      entries,
      search,
    });

    const renderer = new PdfReportRenderer();
    const pkg = await renderer.renderPackage(reportDocument);

    const adminSupabase = createAdminClient();
    const bucketName = "reports-v3";
    await ensureBucketExists(bucketName);

    const timestamp = Date.now();
    const safeSlug = (project.slug || project.name || project.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || project.id;

    const basePath = `reports/rydderen-documentation/${project.id}/${timestamp}-${safeSlug}`;
    const mainFileName = `${basePath}-main.pdf`;

    const { error: uploadError } = await adminSupabase.storage
      .from(bucketName)
      .upload(mainFileName, Buffer.from(pkg.main), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Kunne ikke laste opp PDF: ${uploadError.message}`);
    }

    const {
      data: { publicUrl: mainUrl },
    } = adminSupabase.storage.from(bucketName).getPublicUrl(mainFileName);

    const attachments: { title: string; url: string }[] = [];

    for (let index = 0; index < pkg.parts.length; index += 1) {
      const part = pkg.parts[index];
      const partFileName = `${basePath}-part-${index + 1}.pdf`;

      const { error: partUploadError } = await adminSupabase.storage
        .from(bucketName)
        .upload(partFileName, Buffer.from(part.data), {
          contentType: "application/pdf",
          upsert: true,
        });

      if (partUploadError) {
        throw new Error(`Kunne ikke laste opp vedlegg ${index + 1}: ${partUploadError.message}`);
      }

      const {
        data: { publicUrl: partUrl },
      } = adminSupabase.storage.from(bucketName).getPublicUrl(partFileName);

      attachments.push({
        title: part.name,
        url: partUrl,
      });
    }

    return NextResponse.json({
      url: mainUrl,
      fileName: mainFileName.split("/").pop(),
      attachments,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Kunne ikke generere dokumentasjonsrapport",
      },
      { status: getStatusCode(error) }
    );
  }
}
