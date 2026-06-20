import { NextResponse } from "next/server";
import { createCleanupProject, getCleanupContextOptions, listCleanupProjects } from "@/src/modules/rydderen/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contextType = searchParams.get("contextType");
    const contextId = searchParams.get("contextId");
    const includeContextOptions = searchParams.get("includeContextOptions") === "1";

    const projects = await listCleanupProjects({
      contextType,
      contextId,
    });

    if (includeContextOptions) {
      const contextOptions = await getCleanupContextOptions();
      return NextResponse.json({ projects, contextOptions });
    }

    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke hente ryddeprosjekter" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = await createCleanupProject(body);
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke opprette ryddeprosjekt" },
      { status: 400 }
    );
  }
}
