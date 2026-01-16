import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No auth user" });
  }

  const prismaUserByAuth = await prisma.user.findUnique({
    where: { authId: authUser.id }
  });

  const allMariaUsers = await prisma.user.findMany({
    where: {
      name: { contains: "Maria", mode: 'insensitive' }
    }
  });

  return NextResponse.json({
    auth: {
      id: authUser.id,
      email: authUser.email,
      metadata: authUser.user_metadata
    },
    prismaUserByAuth,
    potentialMatches: allMariaUsers
  });
}
