import { NextResponse } from "next/server";
import { updateCleanupEvidenceEntry } from "@/src/modules/rydderen/services";

export async function PATCH(request: Request, { params }: { params: { cleanupProjectId: string; entryId: string } }) {
  try {
    const body = await request.json();
    const entry = await updateCleanupEvidenceEntry(params.cleanupProjectId, params.entryId, {
      category: typeof body?.category === "string" ? body.category : body?.category === null ? null : undefined,
      description: typeof body?.description === "string" ? body.description : body?.description === null ? null : undefined,
      comment: typeof body?.comment === "string" ? body.comment : body?.comment === null ? null : undefined,
      zone: typeof body?.zone === "string" ? body.zone : body?.zone === null ? null : undefined,
      count: typeof body?.count === "number" ? body.count : undefined,
      risk: typeof body?.risk === "string" ? body.risk : body?.risk === null ? null : undefined,
      createdDate: typeof body?.createdDate === "string" ? body.createdDate : body?.createdDate === null ? null : undefined,
      createdTime: typeof body?.createdTime === "string" ? body.createdTime : body?.createdTime === null ? null : undefined,
      metadata: body && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : undefined,
    });
    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke oppdatere dokumentasjonsfunn" },
      { status: 400 }
    );
  }
}
