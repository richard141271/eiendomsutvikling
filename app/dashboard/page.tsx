import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { TenantDashboard } from "./_components/tenant-dashboard"

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let dbUser = null;
  if (authUser) {
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
  }

  // Show Tenant Dashboard for Tenants
  if (dbUser && dbUser.role === 'TENANT') {
    return (
      <TenantDashboard 
        user={dbUser} 
        activeContract={dbUser.leaseContracts[0]} 
        certificate={dbUser.receivedCertificates[0]} 
      />
    );
  }

  // Admin/Owner Dashboard
  const propertyCount = await prisma.property.count();
  const unitCount = await prisma.unit.count();
  const activeContractCount = await prisma.leaseContract.count({
    where: {
      status: "SIGNED"
    }
  });
  const pendingMaintenanceCount = await prisma.maintenanceRequest.count({
    where: {
      status: {
        in: ["REPORTED", "IN_PROGRESS"]
      }
    }
  });

  const recentProperties = await prisma.property.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, address: true }
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt Eiendommer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{propertyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt Enheter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unitCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Kontrakter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContractCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vedlikehold (Pågående)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMaintenanceCount}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Siste Eiendommer</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProperties.length > 0 ? (
              <div className="space-y-4">
                {recentProperties.map((property) => (
                  <div key={property.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(property.createdAt).toLocaleDateString("no-NO")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen eiendommer registrert.</p>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
           <CardHeader>
            <CardTitle>Fiken Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Integrasjon ikke konfigurert.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
