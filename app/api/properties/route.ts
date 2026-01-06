import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { z } from "zod";

const propertySchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  address: z.string().min(1, "Adresse er påkrevd"),
  gnr: z.string().optional(),
  bnr: z.string().optional(),
  snr: z.string().optional(),
  parentId: z.string().optional().nullable(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    });

    if (!dbUser) {
      // Return empty if user not synced yet, or 404? 
      // Empty list is safer.
      return NextResponse.json([]);
    }

    const properties = await prisma.property.findMany({
      where: { ownerId: dbUser.id },
      include: {
        units: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(properties);
  } catch (error) {
    console.error("Fetch properties error:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate body with Zod
    const result = propertySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Ugyldig data", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, address, gnr, bnr, snr, parentId, notes, imageUrl } = result.data;

    // Get DB user
    let dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    });

    if (!dbUser) {
        // Fallback: Try to sync/create user if not found
        // This handles cases where user registered but sync didn't happen yet
        const email = user.email;
        if (email) {
            const normalizedEmail = email.toLowerCase();
             // Check if email already exists
            const existingUserByEmail = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (existingUserByEmail) {
                 dbUser = await prisma.user.update({
                    where: { id: existingUserByEmail.id },
                    data: { authId: user.id },
                });
            } else {
                 dbUser = await prisma.user.create({
                    data: {
                        authId: user.id,
                        email: normalizedEmail,
                        name: user.user_metadata?.name || normalizedEmail.split('@')[0],
                        role: "OWNER",
                    },
                });
            }
        }
    }

    if (!dbUser) {
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
        snr,
        parentId: parentId === "none" ? null : parentId,
        notes,
        imageUrl,
        ownerId: dbUser.id,
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
