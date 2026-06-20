import { NextResponse } from "next/server";
import { getCleanupReport } from "@/src/modules/rydderen/services";

export async function GET(_: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const report = await getCleanupReport(params.cleanupProjectId);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke hente rapport" },
      { status: 500 }
    );
  }
}
