import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: params.id },
      include: {
        property: true,
      }
    });

    if (!unit) {
      return NextResponse.json(
        { error: "Enhet ikke funnet" },
        { status: 404 }
      );
    }

    return NextResponse.json(unit);
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
    const body = await request.json();
    const { name, sizeSqm, roomCount, rentAmount, depositAmount, status } = body;

    const updatedUnit = await prisma.unit.update({
      where: { id: params.id },
      data: {
        name,
        sizeSqm: sizeSqm ? parseFloat(sizeSqm) : undefined,
        roomCount: roomCount ? parseInt(roomCount) : undefined,
        rentAmount: rentAmount ? parseFloat(rentAmount) : undefined,
        depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
        status,
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
