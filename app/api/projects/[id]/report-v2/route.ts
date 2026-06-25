import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { generateProjectReportPdf } from "@/lib/reporting/project-report-generator";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes timeout for large reports

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

    const result = await generateProjectReportPdf(params.id);

    return NextResponse.json(result);
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
