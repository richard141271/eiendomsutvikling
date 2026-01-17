import Link from "next/link"
import { MobileNav } from "./components/mobile-nav"
import { UserNav } from "./components/user-nav"
import { createClient } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { Users, UserPlus } from "lucide-react"
import { getDevNotesCounts } from "@/app/actions/dev-notes"
import { getMaintenanceCounts } from "@/app/actions/maintenance"
import { Badge } from "@/components/ui/badge"

import Image from "next/image"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let role = "TENANT";
  let dbUser: { id: string; role: string; name: string | null } | null = null;
  if (authUser) {
    dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { id: true, role: true, name: true }
    });

    if (!dbUser && authUser.email) {
      const email = authUser.email;

      const existingByEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, name: true, authId: true }
      });

      if (existingByEmail) {
        const updated = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: existingByEmail.authId ? {} : { authId: authUser.id },
          select: { id: true, role: true, name: true }
        });
        dbUser = updated;
      } else {
        const created = await prisma.user.create({
          data: {
            authId: authUser.id,
            email,
            name: (authUser.user_metadata as any)?.name || email.split("@")[0] || "Ukjent bruker",
            role: "TENANT"
          },
          select: { id: true, role: true, name: true }
        });
        dbUser = created;
      }
    }

    if (dbUser) role = dbUser.role;
  }

  const isAdmin = role === "OWNER" || role === "ADMIN" || role === "MANAGER";
  const isTenant = role === "TENANT" || role === "PROSPECT";

  let unresolvedNotesCount = 0;
  let maintenanceCount = 0;
  if (isAdmin) {
    const result = await getDevNotesCounts();
    if (result.success) {
      // Logic to determine which badge to show
      // Jørn (Dev) sees "forDev" (user requests)
      // Pål-Martin (Admin) sees "forAdmin" (system notifications/resolved by dev)
      const isJorn = dbUser?.name?.toLowerCase().includes("jørn");
      unresolvedNotesCount = isJorn ? result.counts.forDev : result.counts.forAdmin;
    }

    const maintResult = await getMaintenanceCounts();
    if (maintResult.success) {
      maintenanceCount = maintResult.count;
    }
  }

  return (
    <div className="flex h-screen w-full">
      <div className="hidden w-64 flex-col border-r bg-gray-100/40 lg:flex dark:bg-gray-800/40 print:hidden">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span>Eiendomssystem</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <div className="grid items-start px-4 text-sm font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-900 transition-all hover:text-gray-900/50 dark:text-gray-50 dark:hover:text-gray-50/50"
            >
              Dashboard
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/dashboard/properties"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  Eiendommer
                </Link>
                <Link
                  href="/dashboard/contracts"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  Kontrakter
                </Link>
                <Link
                  href="/dashboard/interests"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Interessenter
                </Link>
                <Link
                  href="/dashboard/users"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  <Users className="h-4 w-4" />
                  Brukere
                </Link>
              </>
            )}

            <Link
              href="/dashboard/maintenance"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 justify-between"
            >
              <span className="flex items-center gap-3">Vedlikehold</span>
              {maintenanceCount > 0 && (
                <Badge variant="destructive" className="ml-auto rounded-full px-2 h-5 min-w-5 flex items-center justify-center">
                  {maintenanceCount}
                </Badge>
              )}
            </Link>
            <Link
              href="/dashboard/messages"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              Meldinger
            </Link>
            
            {isAdmin && (
              <Link
                href="/dashboard/inspections"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                Overtakelse
              </Link>
            )}

            <Link
              href="/dashboard/available"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              Ledige boliger
            </Link>

            {isTenant && (
              <>
                <Link
                  href="/dashboard/my-contracts"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  Mine kontrakter
                </Link>
                <Link
                  href="/dashboard/certificate"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  Leietakerbevis
                </Link>
              </>
            )}
            
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 justify-between"
            >
              <span>Innstillinger</span>
              {unresolvedNotesCount > 0 && (
                <Badge variant="destructive" className="ml-auto rounded-full px-2 h-5 min-w-5 flex items-center justify-center">
                  {unresolvedNotesCount}
                </Badge>
              )}
            </Link>
          </div>
        </nav>
      </div>
      <div className="flex flex-col w-full">

        <header className="flex h-14 items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40 print:hidden">
          <MobileNav unresolvedNotesCount={unresolvedNotesCount} maintenanceCount={maintenanceCount} isAdmin={isAdmin} isTenant={isTenant} />
          <div className="w-full flex-1">
             {/* Breadcrumb or Search */}
          </div>
           <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
