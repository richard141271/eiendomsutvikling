import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const contracts = await prisma.leaseContract.findMany({
      where: { tenantId: user.id },
      include: {
        unit: {
          include: {
            property: true
          }
        },
        InspectionProtocol: {
          select: {
            id: true,
            type: true
          }
        }
      }
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
