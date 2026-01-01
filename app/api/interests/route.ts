import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    const body = await request.json();
    const { unitId, name, email, phone, message } = body;

    if (!unitId || !name || !email) {
      return NextResponse.json(
        { error: "Mangler påkrevde felt (enhet, navn, e-post)" },
        { status: 400 }
      );
    }

    // Optional: If user is logged in, link the interest to their account
    let userId = null;
    if (authUser) {
       // Find our DB user id
       const dbUser = await prisma.user.findUnique({
         where: { authId: authUser.id }
       });
       if (dbUser) userId = dbUser.id;
    }

    const interest = await prisma.interest.create({
      data: {
        unitId,
        userId,
        name,
        email,
        phone,
        message,
        status: "PENDING"
      }
    });

    return NextResponse.json(interest);
  } catch (error) {
    console.error("Error creating interest:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin/owner role
    const dbUser = await prisma.user.findUnique({
        where: { authId: authUser.id }
    });

    if (!dbUser || (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN" && dbUser.role !== "MANAGER")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const interests = await prisma.interest.findMany({
      include: {
        unit: {
          include: {
            property: true
          }
        },
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(interests);
  } catch (error) {
    console.error("Error fetching interests:", error);
    return NextResponse.json(
      { error: "Intern serverfeil" },
      { status: 500 }
    );
  }
}
