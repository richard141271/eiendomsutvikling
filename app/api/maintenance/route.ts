import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, unitId, tenantId } = body;

    if (!title || !description || !unitId || !tenantId) {
      return NextResponse.json(
        { error: "Mangler påkrevde felt" },
        { status: 400 }
      );
    }

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        title,
        description,
        unitId,
        tenantId,
        status: "REPORTED",
      },
    });

    return NextResponse.json(maintenanceRequest);
  } catch (error) {
    console.error("Create maintenance error:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 }
    );
  }
}
