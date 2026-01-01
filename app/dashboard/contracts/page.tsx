import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, string> = {
  DRAFT: "Utkast",
  SENT: "Sendt",
  SIGNED: "Signert",
  TERMINATED: "Avsluttet",
};

export default async function ContractsPage() {
  // Fetch contracts with relations
  // Note: This will fail if DB is not connected, but code is correct.
  const contracts = await prisma.leaseContract.findMany({
    include: {
      unit: {
        include: {
          property: true,
        },
      },
      tenant: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leiekontrakter</h1>
          <p className="text-muted-foreground">
            Oversikt over alle aktive og tidligere kontrakter.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/contracts/new">Ny kontrakt</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {contracts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">Ingen kontrakter funnet.</p>
              <Button variant="outline" asChild>
                <Link href="/dashboard/contracts/new">Opprett din første kontrakt</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">
                      {contract.unit.property.name} - {contract.unit.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Leietaker: {contract.tenant.name} ({contract.tenant.email})
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Periode: {contract.startDate.toLocaleDateString()} -{" "}
                      {contract.endDate ? contract.endDate.toLocaleDateString() : "Løpende"}
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={contract.status === "SIGNED" ? "default" : "secondary"}>
                        {statusMap[contract.status] || contract.status}
                      </Badge>
                      <div className="font-medium md:hidden">
                        {contract.rentAmount} NOK / mnd
                      </div>
                    </div>
                    <div className="font-medium hidden md:block">
                      {contract.rentAmount} NOK / mnd
                    </div>
                    <Button variant="outline" size="sm" asChild className="w-full md:w-auto">
                      <Link href={`/dashboard/contracts/${contract.id}`}>
                        Se detaljer
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
