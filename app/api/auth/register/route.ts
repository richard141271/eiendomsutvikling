import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log("Register API called");
  try {
    const body = await request.json();
    console.log("Register API body:", body);
    const { id, email, name, role } = body;

    if (!id || !email || !name) {
      return NextResponse.json(
        { error: "Mangler påkrevde felt" },
        { status: 400 }
      );
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        role: role || "OWNER",
      },
      create: {
        id,
        email,
        name,
        role: role || "OWNER",
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: `Feil ved opprettelse av bruker: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
