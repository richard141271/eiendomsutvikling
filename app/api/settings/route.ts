import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { standardRentPerSqm: true, fikenCompanySlug: true, fikenApiToken: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { standardRentPerSqm, fikenCompanySlug, fikenApiToken } = body;

    // Ensure user exists before updating
    let user = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    if (!user) {
        // Fallback: Try to find by email
        if (authUser.email) {
            user = await prisma.user.findUnique({
                where: { email: authUser.email },
            });
            
            if (user) {
                // Link authId if found by email
                await prisma.user.update({
                    where: { id: user.id },
                    data: { authId: authUser.id }
                });
            }
        }
    }

    if (!user) {
         // Create if still not found (though unusual for settings page)
         // We need a name, let's use email prefix
         user = await prisma.user.create({
            data: {
                authId: authUser.id,
                email: authUser.email!,
                name: authUser.email?.split('@')[0] || "Ukjent bruker",
                role: "OWNER"
            }
         });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        standardRentPerSqm: standardRentPerSqm ? parseInt(standardRentPerSqm) : undefined,
        fikenCompanySlug,
        fikenApiToken
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
