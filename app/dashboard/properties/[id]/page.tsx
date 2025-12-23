import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PropertyDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function PropertyDetailsPage({
  params,
}: PropertyDetailsPageProps) {
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      units: {
        include: {
          leaseContracts: {
            where: { status: "SIGNED" },
            include: { tenant: true },
          },
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  const propertyStatusMap: Record<string, string> = {
    ACTIVE: "Aktiv",
    INACTIVE: "Inaktiv",
    ARCHIVED: "Arkivert",
  };

  const unitStatusMap: Record<string, string> = {
    AVAILABLE: "Ledig",
    RESERVED: "Reservert",
    RENTED: "Utleid",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <p className="text-muted-foreground">{property.address}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/properties/${property.id}/edit`}>
            <Button variant="outline">Rediger eiendom</Button>
          </Link>
          <Link href={`/dashboard/properties/${property.id}/units/new`}>
            <Button>Legg til enhet</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{propertyStatusMap[property.status] || property.status}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totalt antall enheter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{property.units.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Belegg</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {property.units.filter((u) => u.status === "RENTED").length} /{" "}
              {property.units.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Enheter</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Størrelse (kvm)</TableHead>
                <TableHead>Rom</TableHead>
                <TableHead>Leie (NOK)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leietaker</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {property.units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Ingen enheter lagt til ennå.
                  </TableCell>
                </TableRow>
              ) : (
                property.units.map((unit) => {
                   const activeContract = unit.leaseContracts[0];
                   const tenantName = activeContract?.tenant?.name || "-";
                   
                   return (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell>{unit.sizeSqm}</TableCell>
                    <TableCell>{unit.rooms}</TableCell>
                    <TableCell>{unit.rentAmount}</TableCell>
                    <TableCell>{unitStatusMap[unit.status] || unit.status}</TableCell>
                    <TableCell>{tenantName}</TableCell>
                    <TableCell className="text-right">
                       <Link href={`/dashboard/units/${unit.id}`}>
                        <Button variant="ghost" size="sm">
                          Administrer
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
