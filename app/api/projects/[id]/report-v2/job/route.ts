import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { queueReportJob } from "@/lib/reporting/report-job-store";
import { generateProjectReportPdf } from "@/lib/reporting/project-report-generator";

export const runtime = "nodejs";
export const maxDuration = 300;

async function reportDebugEvent(hypothesisId: "A" | "B" | "C" | "D" | "E", location: string, msg: string, data: Record<string, unknown>) {
  // #region debug-point E:report-job-report
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

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const startedAt = Date.now()
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // #region debug-point E:report-job-start
    await reportDebugEvent("E", "app/api/projects/[id]/report-v2/job/route.ts:start", "[DEBUG] Project report job request accepted", {
      projectId: params.id,
      hasUser: Boolean(user),
      durationMs: Date.now() - startedAt,
    })
    // #endregion

    const job = queueReportJob(`project-report:${params.id}`, async ({ update }) => {
      return generateProjectReportPdf(params.id, (progress) => {
        update({
          state: "running",
          phase: progress.phase,
          message: progress.message,
          progress: progress.progress,
        });
      });
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      statusUrl: `/api/report-jobs/${job.id}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Kunne ikke starte rapportjobben",
      },
      { status: 500 }
    );
  }
}
