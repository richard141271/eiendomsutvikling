import { readFileSync } from "fs";
import { NextResponse } from "next/server";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";
import { mapCleanupDocumentationToReport } from "@/lib/reporting/cleanup-documentation-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";
import { getCleanupEvidenceMap, getCleanupProject, listCleanupEvidenceEntries } from "@/src/modules/rydderen/services";

export const runtime = "nodejs";
export const maxDuration = 300;

let debugServerUrl = "http://127.0.0.1:7777/event";
let debugSessionId = "pdf-report-500";

function loadDebugConfig() {
  try {
    const env = readFileSync(".dbg/pdf-report-500.env", "utf8");
    debugServerUrl = env.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || debugServerUrl;
    debugSessionId = env.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || debugSessionId;
  } catch {}
}

function reportDebugEvent(
  runId: string,
  hypothesisId: string,
  location: string,
  msg: string,
  data: Record<string, unknown>,
  traceId: string
) {
  loadDebugConfig();
  fetch(debugServerUrl, {
    method: "POST",
    body: JSON.stringify({
      sessionId: debugSessionId,
      runId,
      hypothesisId,
      location,
      msg,
      data,
      traceId,
      ts: Date.now(),
    }),
  }).catch(() => {});
}

function getStatusCode(error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return 401;
  }
  return 500;
}

async function generateDocumentationReport(cleanupProjectId: string, search: string, traceId: string) {
  // #region debug-point C:route-enter
  reportDebugEvent("pre-fix", "C", "documentation/report/route.ts:generateDocumentationReport:start", "[DEBUG] Starting documentation report generation", {
    cleanupProjectId,
    searchLength: search.length,
  }, traceId);
  // #endregion

  const [project, map, entries] = await Promise.all([
    getCleanupProject(cleanupProjectId),
    getCleanupEvidenceMap(cleanupProjectId),
    listCleanupEvidenceEntries(cleanupProjectId),
  ]);

  // #region debug-point C:data-loaded
  reportDebugEvent("pre-fix", "C", "documentation/report/route.ts:generateDocumentationReport:data-loaded", "[DEBUG] Loaded documentation report source data", {
    projectId: project.id,
    projectSlug: project.slug,
    hasMap: Boolean(map),
    entryCount: entries.length,
    imageCount: entries.reduce((sum, entry) => sum + entry.images.length, 0),
  }, traceId);
  // #endregion

  const reportDocument = mapCleanupDocumentationToReport({
    project,
    map,
    entries,
    search,
  });

  // #region debug-point C:document-mapped
  reportDebugEvent("pre-fix", "C", "documentation/report/route.ts:generateDocumentationReport:document-mapped", "[DEBUG] Mapped documentation report document", {
    documentType: reportDocument.metadata.documentType,
    sectionCount: reportDocument.sections.length,
    evidenceCount: reportDocument.evidenceIndex.length,
    documentationEntries: reportDocument.metadata.documentationReport?.entries.length ?? 0,
    summaryCards: reportDocument.metadata.documentationReport?.summaryCards.length ?? 0,
  }, traceId);
  // #endregion

  const renderer = new PdfReportRenderer();

  // #region debug-point E:before-render
  reportDebugEvent("pre-fix", "E", "documentation/report/route.ts:generateDocumentationReport:before-render", "[DEBUG] Rendering documentation PDF package", {
    documentType: reportDocument.metadata.documentType,
    evidenceCount: reportDocument.evidenceIndex.length,
  }, traceId);
  // #endregion
  const pkg = await renderer.renderPackage(reportDocument);

  // #region debug-point E:after-render
  reportDebugEvent("pre-fix", "E", "documentation/report/route.ts:generateDocumentationReport:after-render", "[DEBUG] Rendered documentation PDF package", {
    mainBytes: pkg.main.byteLength,
    partCount: pkg.parts.length,
  }, traceId);
  // #endregion

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

  // #region debug-point D:before-upload
  reportDebugEvent("pre-fix", "D", "documentation/report/route.ts:generateDocumentationReport:before-upload", "[DEBUG] Uploading generated documentation PDF", {
    bucketName,
    mainFileName,
    partCount: pkg.parts.length,
  }, traceId);
  // #endregion

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

  // #region debug-point D:upload-complete
  reportDebugEvent("pre-fix", "D", "documentation/report/route.ts:generateDocumentationReport:upload-complete", "[DEBUG] Uploaded main documentation PDF", {
    mainUrl,
  }, traceId);
  // #endregion

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

  return {
    url: mainUrl,
    fileName: mainFileName.split("/").pop(),
    attachments,
  };
}

export async function GET(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  const traceId = `get-${params.cleanupProjectId}-${Date.now()}`;
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    // #region debug-point C:get-route
    reportDebugEvent("pre-fix", "C", "documentation/report/route.ts:GET:start", "[DEBUG] GET documentation report request received", {
      cleanupProjectId: params.cleanupProjectId,
      searchLength: search.length,
    }, traceId);
    // #endregion
    const result = await generateDocumentationReport(params.cleanupProjectId, search, traceId);
    return NextResponse.redirect(result.url);
  } catch (error) {
    // #region debug-point E:get-route-error
    reportDebugEvent("pre-fix", "E", "documentation/report/route.ts:GET:error", "[DEBUG] GET documentation report failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: getStatusCode(error),
    }, traceId);
    // #endregion
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Kunne ikke generere dokumentasjonsrapport",
      },
      { status: getStatusCode(error) }
    );
  }
}

export async function POST(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  const traceId = `post-${params.cleanupProjectId}-${Date.now()}`;
  try {
    const payload = await request.json().catch(() => ({}));
    const search = typeof payload?.search === "string" ? payload.search : "";
    // #region debug-point C:post-route
    reportDebugEvent("pre-fix", "C", "documentation/report/route.ts:POST:start", "[DEBUG] POST documentation report request received", {
      cleanupProjectId: params.cleanupProjectId,
      searchLength: search.length,
    }, traceId);
    // #endregion
    const result = await generateDocumentationReport(params.cleanupProjectId, search, traceId);
    return NextResponse.json(result);
  } catch (error) {
    // #region debug-point E:post-route-error
    reportDebugEvent("pre-fix", "E", "documentation/report/route.ts:POST:error", "[DEBUG] POST documentation report failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: getStatusCode(error),
    }, traceId);
    // #endregion
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Kunne ikke generere dokumentasjonsrapport",
      },
      { status: getStatusCode(error) }
    );
  }
}
