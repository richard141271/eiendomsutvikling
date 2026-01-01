import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, string> = {
  REPORTED: "Rapportert",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Fullført",
};

export default async function MaintenancePage() {
  const requests = await prisma.maintenanceRequest.findMany({
    include: {
      Unit: {
        include: {
          property: true,
        },
      },
      User: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vedlikehold</h1>
          <p className="text-muted-foreground">
            Oversikt over meldinger og vedlikeholdsbehov.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/maintenance/new">Ny melding</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">Ingen vedlikeholdssaker registrert.</p>
              <Button variant="outline" asChild>
                <Link href="/dashboard/maintenance/new">Registrer ny sak</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{request.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {request.Unit.property.name} - {request.Unit.name}
                    </p>
                    <p className="text-sm">
                      {request.description}
                    </p>
                    <div className="text-xs text-muted-foreground pt-2">
                      Rapportert av: {request.User.name} ({request.createdAt.toLocaleDateString()})
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge 
                      variant={
                        request.status === "COMPLETED" ? "secondary" : 
                        request.status === "IN_PROGRESS" ? "default" : "destructive"
                      }
                    >
                      {statusMap[request.status] || request.status}
                    </Badge>
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
