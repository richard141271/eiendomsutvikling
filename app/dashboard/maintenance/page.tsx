import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateMaintenanceStatus } from "@/app/actions/maintenance";
import { createClient } from "@/lib/supabase-server";

const statusMap: Record<string, string> = {
  REPORTED: "Rapportert",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Fullført",
};

export default async function MaintenancePage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) {
    return <div>Du må være logget inn for å se denne siden.</div>;
  }

  const dbUser = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });

  if (!dbUser) {
    return <div>Bruker ikke funnet.</div>;
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      ...(dbUser.role === "TENANT" ? { tenantId: dbUser.id } : {}),
    },
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
                      Rapportert av: {request.User.name} ({request.createdAt.toLocaleDateString("no-NO")})
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
                    {request.status === "REPORTED" && (
                      <form action={updateMaintenanceStatus}>
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="status" value="IN_PROGRESS" />
                        <Button size="sm" variant="outline" className="mt-1">
                          Marker som pågår
                        </Button>
                      </form>
                    )}
                    {request.status !== "COMPLETED" && (
                      <form action={updateMaintenanceStatus}>
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="status" value="COMPLETED" />
                        <Button size="sm" variant="outline" className="mt-1">
                          Marker som fullført
                        </Button>
                      </form>
                    )}
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
