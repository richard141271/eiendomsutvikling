import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
            <CardTitle>Siste Aktivitet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Ingen aktivitet registrert.</p>
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
