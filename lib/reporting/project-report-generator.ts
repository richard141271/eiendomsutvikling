import { prisma } from "@/lib/prisma";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";
import { mapProjectToReport } from "@/lib/reporting/project-report-mapper";
import { PdfReportRenderer } from "@/lib/reporting/pdf-renderer";

type ProgressCallback = (state: { phase: string; message: string; progress: number }) => void;

async function reportDebugEvent(hypothesisId: "A" | "B" | "C" | "D" | "E", location: string, msg: string, data: Record<string, unknown>) {
  // #region debug-point E:project-report-report
  try {
    const fs = await import("fs/promises")
    const envText = await fs.readFile(".dbg/app-speed-lag.env", "utf8").catch(() => "")
    const debugUrl = envText.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || "http://127.0.0.1:7777/event"
    const sessionId = envText.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || "app-speed-lag"
    await fetch(debugUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, runId: "pre-fix", hypothesisId, location, msg, data, ts: Date.now() }),
      cache: "no-store",
    }).catch(() => undefined)
  } catch {}
  // #endregion
}

export async function generateProjectReportPdf(projectId: string, onProgress?: ProgressCallback) {
  const startedAt = Date.now()
  const adminSupabase = createAdminClient();
  const bucketName = "reports-v3";

  onProgress?.({
    phase: "Henter bilder",
    message: "Samler prosjektdata og klargjor bilder.",
    progress: 25,
  });

  await ensureBucketExists(bucketName);

  const projectLookupStartedAt = Date.now()
  const project = await (prisma as any).project.findUnique({
    where: { id: projectId },
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
        },
      },
    },
  });

  if (!project) {
    throw new Error("Prosjekt ikke funnet");
  }

  // #region debug-point E:project-report-project
  await reportDebugEvent("E", "lib/reporting/project-report-generator.ts:project:findUnique", "[DEBUG] Project report base data loaded", {
    projectId,
    durationMs: Date.now() - projectLookupStartedAt,
    entryCount: project.entries.length,
  })
  // #endregion

  const signedUrlStartedAt = Date.now()
  const entriesWithTransformedUrls = await Promise.all(
    project.entries.map(async (entry: any) => {
      if (!entry.imageUrl) return entry;

      const isDocument =
        (entry as any).type === "DOCUMENT" ||
        entry.imageUrl.toLowerCase().includes(".pdf") ||
        entry.imageUrl.toLowerCase().includes(".doc") ||
        entry.imageUrl.toLowerCase().includes(".xls") ||
        entry.imageUrl.toLowerCase().includes(".msg") ||
        entry.imageUrl.toLowerCase().includes(".eml");

      if (isDocument) {
        return { ...entry, imageUrl: null };
      }

      if (entry.imageUrl.startsWith("http")) {
        return entry;
      }

      try {
        const { data } = await adminSupabase.storage.from("project-assets").createSignedUrl(entry.imageUrl, 3600);
        if (data?.signedUrl) {
          return { ...entry, imageUrl: data.signedUrl };
        }
      } catch {
        // Fall through to null image below.
      }

      return { ...entry, imageUrl: null };
    })
  );

  // #region debug-point E:project-report-signed-urls
  await reportDebugEvent("E", "lib/reporting/project-report-generator.ts:signedUrls", "[DEBUG] Project report signed URL phase finished", {
    projectId,
    durationMs: Date.now() - signedUrlStartedAt,
    imageEntryCount: entriesWithTransformedUrls.filter((entry: any) => Boolean(entry.imageUrl)).length,
  })
  // #endregion

  onProgress?.({
    phase: "Bygger PDF",
    message: "Setter sammen rapporten.",
    progress: 60,
  });

  const projectForReport = {
    ...project,
    entries: entriesWithTransformedUrls,
  } as any;

  const reportDocument = mapProjectToReport(projectForReport);
  const renderer = new PdfReportRenderer();
  const renderStartedAt = Date.now()
  const pkg = await renderer.renderPackage(reportDocument);

  // #region debug-point E:project-report-render
  await reportDebugEvent("E", "lib/reporting/project-report-generator.ts:renderPackage", "[DEBUG] Project report render finished", {
    projectId,
    durationMs: Date.now() - renderStartedAt,
    partCount: pkg.parts.length,
    totalDurationMs: Date.now() - startedAt,
  })
  // #endregion

  onProgress?.({
    phase: "Laster opp",
    message: "Lagrer PDF og vedlegg.",
    progress: 85,
  });

  const timestamp = Date.now();
  const mainFileName = `project-report-v3-${project.id}-${timestamp}-main.pdf`;
  const mainBuffer = Buffer.from(pkg.main);

  const uploadStartedAt = Date.now()
  const { error: uploadError } = await adminSupabase.storage.from(bucketName).upload(`reports/${mainFileName}`, mainBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Kunne ikke laste opp hovedrapport: ${uploadError.message}`);
  }

  const {
    data: { publicUrl: mainUrl },
  } = adminSupabase.storage.from(bucketName).getPublicUrl(`reports/${mainFileName}`);

  const attachments: { title: string; url: string }[] = [];

  for (let i = 0; i < pkg.parts.length; i += 1) {
    const part = pkg.parts[i];
    const partFileName = `project-report-v3-${project.id}-${timestamp}-part-${i + 1}.pdf`;

    const { error: partUploadError } = await adminSupabase.storage
      .from(bucketName)
      .upload(`reports/${partFileName}`, Buffer.from(part.data), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (partUploadError) {
      throw new Error(`Kunne ikke laste opp vedlegg ${i + 1}: ${partUploadError.message}`);
    }

    const {
      data: { publicUrl: partUrl },
    } = adminSupabase.storage.from(bucketName).getPublicUrl(`reports/${partFileName}`);

    attachments.push({
      title: part.name,
      url: partUrl,
    });
  }

  // #region debug-point E:project-report-upload
  await reportDebugEvent("E", "lib/reporting/project-report-generator.ts:upload", "[DEBUG] Project report upload finished", {
    projectId,
    durationMs: Date.now() - uploadStartedAt,
    attachmentCount: attachments.length,
    totalDurationMs: Date.now() - startedAt,
  })
  // #endregion

  await prisma.projectReport.create({
    data: {
      projectId: project.id,
      pdfUrl: mainUrl,
      attachments: attachments as any,
    },
  });

  return {
    url: mainUrl,
    fileName: mainFileName,
    attachments,
  };
}
