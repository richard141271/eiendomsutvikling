import { NextResponse } from "next/server";
import { getReportJob } from "@/lib/reporting/report-job-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { jobId: string } }) {
  const job = getReportJob(params.jobId);

  if (!job) {
    return NextResponse.json({ error: "Jobb ikke funnet" }, { status: 404 });
  }

  return NextResponse.json(job, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
