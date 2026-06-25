import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { queueReportJob } from "@/lib/reporting/report-job-store";
import { generateProjectReportPdf } from "@/lib/reporting/project-report-generator";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
