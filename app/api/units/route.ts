import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { z } from "zod";

const unitSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  propertyId: z.string().min(1, "Eiendom er påkrevd"),
  unitNumber: z.string().optional(),
  sizeSqm: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  roomCount: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  rentAmount: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  depositAmount: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const result = unitSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Ugyldig data", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, unitNumber, sizeSqm, roomCount, rentAmount, depositAmount, propertyId, imageUrl, notes } = result.data;

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { owner: true }
    });

    if (!property) {
      return NextResponse.json(
        { error: "Eiendom ikke funnet" },
        { status: 404 }
      );
    }

    // Check if the authenticated user is the owner
    // We need to check authId against user.id
    if (property.owner.authId !== user.id) {
       return NextResponse.json(
        { error: "Du har ikke tilgang til denne eiendommen" },
        { status: 403 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        unitNumber,
        sizeSqm,
        roomCount,
        rentAmount,
        depositAmount,
        propertyId,
        status: "AVAILABLE",
        imageUrl,
        notes,
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
