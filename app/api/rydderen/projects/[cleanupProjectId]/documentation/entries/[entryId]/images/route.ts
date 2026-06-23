import { NextResponse } from "next/server";
import { addCleanupEvidenceEntryImage } from "@/src/modules/rydderen/services";

export async function POST(request: Request, { params }: { params: { cleanupProjectId: string; entryId: string } }) {
  try {
    const formData = await request.formData();
    const imageHash = String(formData.get("imageHash") || "");
    const originalName = String(formData.get("originalName") || "");
    const sortOrderValue = Number(formData.get("sortOrder"));
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Mangler bilde for opplasting" }, { status: 400 });
    }

    const entry = await addCleanupEvidenceEntryImage(params.cleanupProjectId, params.entryId, {
      file,
      imageHash: imageHash || null,
      originalName: originalName || null,
      sortOrder: Number.isFinite(sortOrderValue) ? sortOrderValue : null,
    });

    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke laste opp dokumentasjonsbilde" },
      { status: 400 }
    );
  }
}
