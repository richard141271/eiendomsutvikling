import { NextResponse } from "next/server";
import { createCleanupEvidenceEntry, listCleanupEvidenceEntries } from "@/src/modules/rydderen/services";

export async function GET(_: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const entries = await listCleanupEvidenceEntries(params.cleanupProjectId);
    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke hente dokumentasjonsfunn" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const formData = await request.formData();
    const entryType = String(formData.get("entryType") || "");
    const category = String(formData.get("category") || "");
    const description = String(formData.get("description") || "");
    const comment = String(formData.get("comment") || "");
    const zone = String(formData.get("zone") || "");
    const countValue = Number(formData.get("count") || 1);
    const risk = String(formData.get("risk") || "");
    const createdDate = String(formData.get("createdDate") || "");
    const createdTime = String(formData.get("createdTime") || "");
    const gpsRaw = String(formData.get("gps") || "");
    const imageHashes = formData.getAll("imageHash").map((value) => String(value || ""));
    const files = formData.getAll("images").filter((value): value is File => value instanceof File);
    const gps = gpsRaw ? JSON.parse(gpsRaw) : null;

    const entry = await createCleanupEvidenceEntry(params.cleanupProjectId, {
      entryType,
      category: category || null,
      description: description || null,
      comment: comment || null,
      zone: zone || null,
      count: Number.isFinite(countValue) ? countValue : 1,
      risk: risk || null,
      gps,
      createdDate: createdDate || null,
      createdTime: createdTime || null,
      images: files.map((file, index) => ({
        file,
        imageHash: imageHashes[index] || null,
        originalName: file.name || null,
      })),
    });

    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke lagre dokumentasjonsfunn" },
      { status: 400 }
    );
  }
}
