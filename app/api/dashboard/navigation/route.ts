import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { getDevNotesCounts } from "@/app/actions/dev-notes";
import { getMaintenanceCounts } from "@/app/actions/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NavigationPayload = {
  isAdmin: boolean;
  isTenant: boolean;
  unresolvedNotesCount: number;
  maintenanceCount: number;
};

async function resolveDbUser() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  let dbUser = await prisma.user.findUnique({
    where: { authId: authUser.id },
    select: { id: true, role: true, name: true, authId: true, email: true },
  });

  if (!dbUser && authUser.email) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: authUser.email },
      select: { id: true, role: true, name: true, authId: true, email: true },
    });

    if (existingByEmail) {
      dbUser = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: existingByEmail.authId ? {} : { authId: authUser.id },
        select: { id: true, role: true, name: true, authId: true, email: true },
      });
    } else {
      dbUser = await prisma.user.create({
        data: {
          authId: authUser.id,
          email: authUser.email,
          name: (authUser.user_metadata as { name?: string } | null)?.name || authUser.email.split("@")[0] || "Ukjent bruker",
          role: "TENANT",
        },
        select: { id: true, role: true, name: true, authId: true, email: true },
      });
    }
  }

  return dbUser;
}

export async function GET() {
  const startedAt = Date.now();

  try {
    const dbUser = await resolveDbUser();
    const role: string = dbUser?.role || "TENANT";
    const isAdmin = role === "OWNER" || role === "ADMIN" || role === "MANAGER";
    const isTenant = role === "TENANT" || role === "PROSPECT";

    let unresolvedNotesCount = 0;
    let maintenanceCount = 0;

    if (isAdmin) {
      const [devNotesResult, maintenanceResult] = await Promise.all([getDevNotesCounts(), getMaintenanceCounts()]);
      if (devNotesResult.success) {
        const isJorn = dbUser?.name?.toLowerCase().includes("jørn");
        unresolvedNotesCount = isJorn ? devNotesResult.counts.forDev : devNotesResult.counts.forAdmin;
      }
      if (maintenanceResult.success) {
        maintenanceCount = maintenanceResult.count;
      }
    }

    const payload: NavigationPayload = {
      isAdmin,
      isTenant,
      unresolvedNotesCount,
      maintenanceCount,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        "Server-Timing": `dashboard-nav;dur=${Date.now() - startedAt}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        isAdmin: false,
        isTenant: false,
        unresolvedNotesCount: 0,
        maintenanceCount: 0,
        error: error instanceof Error ? error.message : "Kunne ikke laste menydata",
      },
      { status: 500 }
    );
  }
}
