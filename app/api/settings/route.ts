import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase";
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

    const user = await prisma.user.update({
      where: { authId: authUser.id },
      data: {
        standardRentPerSqm: standardRentPerSqm ? parseInt(standardRentPerSqm) : undefined,
        fikenCompanySlug,
        fikenApiToken
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
