import { NextResponse } from "next/server";
import { importLegacyCleanupPayload } from "@/src/modules/rydderen/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await importLegacyCleanupPayload(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke importere gammel Rydder'n-data" },
      { status: 400 }
    );
  }
}
