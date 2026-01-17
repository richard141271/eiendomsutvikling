import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    if (
      !dbUser ||
      (dbUser.role !== "OWNER" &&
        dbUser.role !== "ADMIN" &&
        dbUser.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body as { status?: "PENDING" | "CONTACTED" | "REJECTED" | "OFFERED" };

    const allowedStatuses: Array<"PENDING" | "CONTACTED" | "REJECTED" | "OFFERED"> = [
      "PENDING",
      "CONTACTED",
      "REJECTED",
      "OFFERED",
    ];

    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Ugyldig status" },
        { status: 400 }
      );
    }

    const updated = await prisma.interest.update({
      where: { id: params.id },
      data: status
        ? {
            status,
          }
        : {},
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating interest:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 }
    );
  }
}
