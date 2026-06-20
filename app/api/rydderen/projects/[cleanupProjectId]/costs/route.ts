import { NextResponse } from "next/server";
import { createCleanupCost, listCleanupCosts } from "@/src/modules/rydderen/services";

export async function GET(_: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const costs = await listCleanupCosts(params.cleanupProjectId);
    return NextResponse.json(costs);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke hente kostnader" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const body = await request.json();
    const cost = await createCleanupCost(params.cleanupProjectId, body);
    return NextResponse.json(cost);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke lagre kostnad" },
      { status: 400 }
    );
  }
}
