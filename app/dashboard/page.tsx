import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { createClient } from "@/lib/supabase-server"
import { TenantDashboard } from "./_components/tenant-dashboard"

export const dynamic = "force-dynamic";

async function reportDebugEvent(hypothesisId: "A" | "B" | "C" | "D" | "E", location: string, msg: string, data: Record<string, unknown>) {
  // #region debug-point B:dashboard-report
  try {
    const fs = await import("fs/promises")
    const envText = await fs.readFile(".dbg/app-speed-lag.env", "utf8").catch(() => "")
    const debugUrl = envText.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || "http://127.0.0.1:7777/event"
    const sessionId = envText.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || "app-speed-lag"
    await fetch(debugUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, runId: "pre-fix", hypothesisId, location, msg, data, ts: Date.now() }),
      cache: "no-store",
    }).catch(() => undefined)
  } catch {}
  // #endregion
}

export default async function DashboardPage() {
  const startedAt = Date.now()
  const supabase = createClient();
  const authStartedAt = Date.now()
  const { data: { user: authUser } } = await supabase.auth.getUser();
  // #region debug-point A:dashboard-auth
  await reportDebugEvent("A", "app/dashboard/page.tsx:auth:getUser", "[DEBUG] Dashboard auth resolved", {
    durationMs: Date.now() - authStartedAt,
    hasUser: Boolean(authUser),
  })
  // #endregion

  let dbUser = null;
  if (authUser) {
    const userLookupStartedAt = Date.now()
    dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
      include: {
        receivedCertificates: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        leaseContracts: {
          where: { status: 'SIGNED' },
          include: { unit: { include: { property: true } } },
          take: 1
        }
      }
    });
    // #region debug-point B:dashboard-db-user
    await reportDebugEvent("B", "app/dashboard/page.tsx:dbUser:findUnique", "[DEBUG] Dashboard dbUser lookup finished", {
      durationMs: Date.now() - userLookupStartedAt,
      role: dbUser?.role ?? null,
    })
    // #endregion
  }

  // Show Tenant Dashboard for Tenants
  if (dbUser && dbUser.role === 'TENANT') {
    const maintenanceRequests = await prisma.maintenanceRequest.findMany({
      where: { tenantId: dbUser.id },
      include: {
        Unit: {
          include: {
            property: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Hent visninger for enheten leietakeren bor i (eller har kontrakt for)
    let viewings: any[] = [];
    let contributions: any[] = [];
    const activeContract = dbUser.leaseContracts[0];
    if (activeContract) {
      viewings = await prisma.viewing.findMany({
        where: {
          unitId: activeContract.unitId,
          date: { gte: new Date() }, // Kun fremtidige visninger
        },
        orderBy: { date: 'asc' },
      });
      
      contributions = await prisma.tenantContribution.findMany({
        where: {
            tenantId: dbUser.id,
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return (
      <TenantDashboard 
        user={dbUser} 
        activeContract={activeContract} 
        certificate={dbUser.receivedCertificates[0]} 
        maintenanceRequests={maintenanceRequests}
        viewings={viewings}
        contributions={contributions}
      />
    );
  }

  // Admin/Owner Dashboard
  const adminDataStartedAt = Date.now()
  const [
    propertyCount,
    unitCount,
    activeContractCount,
    pendingMaintenanceCount,
    activeProjectCount,
    pendingLocationTaskCount,
    recentProjects,
    recentProperties,
  ] = await Promise.all([
    prisma.property.count(),
    prisma.unit.count(),
    prisma.leaseContract.count({
      where: {
        status: "SIGNED"
      }
    }),
    prisma.maintenanceRequest.count({
      where: {
        status: {
          in: ["REPORTED", "IN_PROGRESS"]
        }
      }
    }),
    prisma.project.count({
      where: { status: "ACTIVE" }
    }),
    prisma.locationTask.count({
      where: { done: false }
    }),
    prisma.project.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      where: { status: "ACTIVE" },
      include: { property: true }
    }),
    prisma.property.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true, address: true }
    }),
  ]);

  // #region debug-point B:dashboard-admin-data
  await reportDebugEvent("B", "app/dashboard/page.tsx:adminData", "[DEBUG] Dashboard admin data finished", {
    durationMs: Date.now() - adminDataStartedAt,
    totalDurationMs: Date.now() - startedAt,
    propertyCount,
    unitCount,
    activeProjectCount,
  })
  // #endregion

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/properties" className="block transition-transform hover:scale-105">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalt Eiendommer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{propertyCount}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/properties" className="block transition-transform hover:scale-105">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalt Enheter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unitCount}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/contracts" className="block transition-transform hover:scale-105">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Kontrakter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeContractCount}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/maintenance" className="block transition-transform hover:scale-105">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vedlikehold (Pågående)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingMaintenanceCount}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/projects" className="block transition-transform hover:scale-105">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Prosjekter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjectCount}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tasks" className="block transition-transform hover:scale-105">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stedsbaserte Oppgaver</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingLocationTaskCount}</div>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Siste Prosjekter</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project: any) => (
                  <div key={project.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <Link href={`/projects/${project.id}`} className="font-medium hover:underline">{project.title}</Link>
                      <p className="text-sm text-muted-foreground">{project.property?.name || project.customPropertyName || 'Ingen eiendom'}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString("no-NO")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen aktive prosjekter.</p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Siste Eiendommer</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProperties.length > 0 ? (
              <div className="space-y-4">
                {recentProperties.map((property) => (
                  <Link 
                    key={property.id} 
                    href={`/dashboard/properties/${property.id}`}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(property.createdAt).toLocaleDateString("no-NO")}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen eiendommer registrert.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
