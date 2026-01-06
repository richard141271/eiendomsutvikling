import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

async function verifyUnitOwnership(unitId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { 
      property: {
        include: {
          owner: true
        }
      }
    }
  });

  if (!unit) {
    return { error: "Enhet ikke funnet", status: 404 };
  }

  if (unit.property.owner.authId !== user.id) {
    return { error: "Du har ikke tilgang til denne enheten", status: 403 };
  }

  return { unit };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await verifyUnitOwnership(params.id);
    if (result.error) {
       return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // We can return the unit found in verification, 
    // but the original code only included property (not owner deep include).
    // Let's stick to the original response shape or just use what we have (it has more data but that's fine).
    // Or fetch fresh to match expected output exactly.
    // The original included `property: true`.
    
    return NextResponse.json(result.unit);
  } catch (error) {
    console.error("Error fetching unit:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await verifyUnitOwnership(params.id);
    if (result.error) {
       return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const { name, unitNumber, sizeSqm, roomCount, rentAmount, depositAmount, status, imageUrl, notes } = body;

    const updatedUnit = await prisma.unit.update({
      where: { id: params.id },
      data: {
        name,
        unitNumber,
        sizeSqm: sizeSqm ? parseFloat(sizeSqm) : undefined,
        roomCount: roomCount ? parseInt(roomCount) : undefined,
        rentAmount: rentAmount ? parseFloat(rentAmount) : undefined,
        depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
        status,
        imageUrl,
        notes,
      },
    });

    return NextResponse.json(updatedUnit);
  } catch (error) {
    console.error("Error updating unit:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await verifyUnitOwnership(params.id);
    if (result.error) {
       return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await prisma.unit.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Enhet slettet" });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return NextResponse.json(
      { error: "Kunne ikke slette enhet" },
      { status: 500 }
    );
  }
}
