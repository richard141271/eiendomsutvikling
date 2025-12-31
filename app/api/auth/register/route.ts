import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log("Register API called");
  try {
    const body = await request.json();
    console.log("Register API body:", body);
    const { 
      id, 
      email, 
      name, 
      role, 
      phone, 
      address, 
      postalCode, 
      city, 
      hasTenantCertificate 
    } = body;

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
          phone,
          address,
          postalCode,
          city,
          hasTenantCertificate: hasTenantCertificate || false,
          role: role || existingUser.role, // Update role if provided, else keep existing
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          authId: id,
          email,
          name,
          phone,
          address,
          postalCode,
          city,
          hasTenantCertificate: hasTenantCertificate || false,
          role: role || "OWNER", 
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
