import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Auth check should be here
    
    const body = await request.json();
    const { name, sizeSqm, roomCount, rentAmount, depositAmount, propertyId, imageUrl } = body;

    if (!name || !propertyId) {
      return NextResponse.json(
        { error: "Mangler påkrevde felt" },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        sizeSqm: Number(sizeSqm),
        roomCount: Number(roomCount),
        rentAmount: Number(rentAmount),
        depositAmount: Number(depositAmount),
        propertyId,
        status: "AVAILABLE",
        imageUrl,
      },
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Create unit error:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 }
    );
  }
}
