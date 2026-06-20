import { NextResponse } from "next/server";
import { createCapturedCleanupItem, ensureCleanupStorageBucket } from "@/src/modules/rydderen/services";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    await ensureCleanupStorageBucket();

    const formData = await request.formData();
    const file = formData.get("file");
    const category = String(formData.get("category") || "");
    const action = String(formData.get("action") || "") as "kast" | "selg" | "behold";
    const imageHash = String(formData.get("imageHash") || "");
    const comment = String(formData.get("comment") || "");
    const condition = String(formData.get("condition") || "");
    const note = String(formData.get("note") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Bildefil mangler" }, { status: 400 });
    }

    if (!category || !action) {
      return NextResponse.json({ error: "Kategori og handling må velges" }, { status: 400 });
    }

    const item = await createCapturedCleanupItem(params.cleanupProjectId, {
      file,
      category,
      action,
      imageHash: imageHash || null,
      comment: comment || null,
      condition: condition || null,
      note: note || null,
    });

    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke laste opp objekt" },
      { status: 400 }
    );
  }
}
