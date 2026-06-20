import { NextResponse } from "next/server";
import { getCleanupProject, updateCleanupProject } from "@/src/modules/rydderen/services";

export async function GET(_: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const project = await getCleanupProject(params.cleanupProjectId);
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke hente ryddeprosjekt" },
      { status: 404 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { cleanupProjectId: string } }) {
  try {
    const body = await request.json();
    const project = await updateCleanupProject(params.cleanupProjectId, body);
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke oppdatere ryddeprosjekt" },
      { status: 400 }
    );
  }
}
