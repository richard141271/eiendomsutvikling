import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contract = await prisma.leaseContract.findUnique({
      where: { id: params.id },
      include: {
        unit: { include: { property: true } },
        tenant: true
      }
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json(contract);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { startDate, endDate, rentAmount, depositAmount } = body;

    const contract = await prisma.leaseContract.update({
      where: { id: params.id },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null, // Allow clearing end date
        rentAmount: rentAmount ? Number(rentAmount) : undefined,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
      },
    });

    return NextResponse.json(contract);
  } catch (error) {
    console.error("Update error", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
