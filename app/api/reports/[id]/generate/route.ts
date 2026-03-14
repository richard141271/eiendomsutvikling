
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { generateReportPdf } from "@/lib/reporting/report-generator";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await generateReportPdf(reportId);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
