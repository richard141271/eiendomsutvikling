import { NextResponse } from "next/server";
import { updateCleanupItem } from "@/src/modules/rydderen/services";

export async function PATCH(
  request: Request,
  { params }: { params: { cleanupProjectId: string; itemId: string } }
) {
  try {
    const body = await request.json();
    const item = await updateCleanupItem(params.cleanupProjectId, params.itemId, body);
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke oppdatere objekt" },
      { status: 400 }
    );
  }
}
