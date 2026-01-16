import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const units = await prisma.unit.findMany({
      where: {
        OR: [
          { status: "AVAILABLE" },
          { status: "RESERVED" } // Maybe some are just reserved but might become available
        ]
      },
      include: {
        property: true
      }
    });

    return NextResponse.json(units);
  } catch (error) {
    console.error("Failed to fetch available units:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
