import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Helper to verify ownership
async function verifyOwnership(propertyId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { owner: true }
  });

  if (!property) {
    return { error: "Eiendom ikke funnet", status: 404 };
  }

  // Check if user is owner
  if (property.owner.authId !== user.id) {
     return { error: "Du har ikke tilgang til denne eiendommen", status: 403 };
  }

  return { property };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await verifyOwnership(params.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    
    // Fetch again with units if needed, or just use the result.property
    // The previous implementation included units.
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        units: true,
      }
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error("Error fetching property:", error);
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
    const result = await verifyOwnership(params.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const { name, address, gnr, bnr, snr, parentId, notes, imageUrl, status } = body;

    const updatedProperty = await prisma.property.update({
      where: { id: params.id },
      data: {
        name,
        address,
        gnr,
        bnr,
        snr,
        parentId,
        notes,
        imageUrl,
        status,
      },
    });

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error("Error updating property:", error);
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
    const result = await verifyOwnership(params.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await prisma.property.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Eiendom slettet" });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { error: "Kunne ikke slette eiendom" },
      { status: 500 }
    );
  }
}
