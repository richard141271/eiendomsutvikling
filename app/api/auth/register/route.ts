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

    // Check if user exists by email (e.g. invited tenant)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    let user;

    if (existingUser) {
      // If user exists, update with authId and ensure name is set
      user = await prisma.user.update({
        where: { email },
        data: {
          authId: id, // Link Supabase ID
          name: name, // Update name if changed
          // We don't change role if it's already set (e.g. TENANT)
          // unless it's explicitly OWNER registration?
          // For now, assume if they exist, they are tenants.
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          authId: id,
          email,
          name,
          role: role || "OWNER", // Default to OWNER if self-registering without invite? 
          // Actually, if self-registering, they might be OWNER. 
          // If invited, they exist.
        },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: `Feil ved opprettelse av bruker: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
