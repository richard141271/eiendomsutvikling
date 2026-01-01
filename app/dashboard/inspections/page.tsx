import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function InspectionsPage() {
  const inspections = await prisma.inspectionProtocol.findMany({
    include: {
      LeaseContract: {
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          tenant: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overtakelsesprotokoller</h1>
          <p className="text-muted-foreground">
            Oversikt over inn- og utflyttingsprotokoller.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/contracts">Gå til kontrakter for å opprette</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {inspections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">Ingen protokoller funnet.</p>
            </CardContent>
          </Card>
        ) : (
          inspections.map((inspection) => (
            <Card key={inspection.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {inspection.type === "MOVE_IN" ? "Innflytting" : "Utflytting"}
                      </h3>
                      <Badge variant={inspection.signedByTenant && inspection.signedByOwner ? "default" : "outline"}>
                        {inspection.signedByTenant && inspection.signedByOwner ? "Signert" : "Utkast"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {inspection.LeaseContract.unit.property.name} - {inspection.LeaseContract.unit.name}
                    </p>
                    <p className="text-sm">
                      Leietaker: {inspection.LeaseContract.tenant.name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm text-muted-foreground">
                      {inspection.createdAt.toLocaleDateString()}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/inspections/${inspection.id}`}>
                        Se protokoll
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
