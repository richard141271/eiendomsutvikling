import { NextResponse } from "next/server";
import { getCleanupEvidenceMap, upsertCleanupEvidenceMap } from "@/src/modules/rydderen/services";

export async function GET(_: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const map = await getCleanupEvidenceMap(params.cleanupProjectId);
    return NextResponse.json(map);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke hente kartlegging" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const body = await request.json();
    const map = await upsertCleanupEvidenceMap(params.cleanupProjectId, {
      rows: Number(body?.rows) || 3,
      columns: Number(body?.columns) || 3,
      zones: Array.isArray(body?.zones) ? body.zones.map((zone: unknown) => String(zone)) : [],
      sketch: typeof body?.sketch === "string" ? body.sketch : null,
      caseName: typeof body?.caseName === "string" ? body.caseName : null,
      address: typeof body?.address === "string" ? body.address : null,
    });
    return NextResponse.json(map);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke lagre kartlegging" },
      { status: 400 }
    );
  }
}
