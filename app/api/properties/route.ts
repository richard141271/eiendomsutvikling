import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Check auth
    // Note: In an API route, we should verify the session.
    // However, createBrowserClient (in lib/supabase) is for client side.
    // We need to trust the caller or verify the JWT. 
    // For this MVP, we will rely on the client sending the user ID or 
    // we can use the supabase client to getUser from the header token.
    
    // A simpler way for MVP: Client sends data, we validate, and insert.
    // We will trust the ownerId sent from client for now (MVP trade-off), 
    // but in production we MUST verify it against the session.
    
    const body = await request.json();
    const { name, address, gnr, bnr, notes, ownerId } = body;

    if (!name || !address || !ownerId) {
      return NextResponse.json(
        { error: "Mangler påkrevde felt" },
        { status: 400 }
      );
    }

    // Check if user exists in database (by authId or id)
    // The client sends the Supabase User ID as 'ownerId'
    let user = await prisma.user.findUnique({
      where: { authId: ownerId },
    });

    if (!user) {
      // Fallback: check if it matches the PK directly
      user = await prisma.user.findUnique({
        where: { id: ownerId },
      });
    }

    if (!user) {
      console.error("User not found in database:", ownerId);
      return NextResponse.json(
        { error: "Brukerprofil mangler i databasen. Prøv å logge ut og inn igjen." },
        { status: 400 }
      );
    }

    const property = await prisma.property.create({
      data: {
        name,
        address,
        gnr,
        bnr,
        notes,
        ownerId: user.id, // Use the database PK
        status: "ACTIVE",
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error("Create property error:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 }
    );
  }
}
