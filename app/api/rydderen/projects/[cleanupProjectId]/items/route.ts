import { NextResponse } from "next/server";
import { createCleanupItem, listCleanupItems } from "@/src/modules/rydderen/services";

export async function GET(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const items = await listCleanupItems(params.cleanupProjectId, { action });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke hente objekter" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const body = await request.json();
    const item = await createCleanupItem(params.cleanupProjectId, body);
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke opprette objekt" },
      { status: 400 }
    );
  }
}
