import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id }
    });

    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Allow if admin/owner OR if requesting own profile
    if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN" && dbUser.id !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id }
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id }
    });

    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json();
    const { role, ...otherData } = body;

    // Only OWNER/ADMIN can change roles
    if (role && dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden: Only admins can change roles" }, { status: 403 });
    }
    
    // Only allow editing if admin/owner OR self
    if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN" && dbUser.id !== params.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent changing own role if not owner? (Self-demotion protection maybe, but let's allow for now or skip)
    
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...otherData,
        ...(role ? { role } : {})
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
