import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import UnitImageArchive from "@/components/unit/unit-image-archive";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface UnitDetailsPageProps {
  params: {
    id: string;
  };
}

const statusMap: Record<string, string> = {
  AVAILABLE: "Ledig",
  RESERVED: "Reservert",
  RENTED: "Utleid",
  SOLD: "Solgt",
};

const contractStatusMap: Record<string, string> = {
  DRAFT: "Utkast",
  SENT: "Sendt",
  SIGNED: "Signert",
  TERMINATED: "Avsluttet",
};

const contractStatusColor: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  SIGNED: "bg-green-500",
  TERMINATED: "bg-red-500",
};

export default async function UnitDetailsPage({ params }: UnitDetailsPageProps) {
  const unit = await prisma.unit.findUnique({
    where: { id: params.id },
    include: {
      property: true,
      leaseContracts: {
        include: { tenant: true },
        orderBy: { createdAt: "desc" },
      },
      unitImages: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!unit) {
    notFound();
  }

  const activeContract = unit.leaseContracts.find(c => c.status === "SIGNED");

  return (
    <div className="flex flex-col gap-6">
      {unit.imageUrl && (
        <div className="relative w-full h-64 md:h-96 bg-gray-100 rounded-lg overflow-hidden shadow-sm">
          <Image
            src={unit.imageUrl}
            alt={unit.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{unit.name}</h1>
          <p className="text-muted-foreground">
             <Link href={`/dashboard/properties/${unit.propertyId}`} className="hover:underline">
               {unit.property.name}
             </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/units/${unit.id}/edit`}>
            <Button variant="outline">Rediger enhet</Button>
          </Link>
          {!activeContract && (
            <Link href={`/dashboard/units/${unit.id}/invite`}>
               <Button>Inviter leietaker</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusMap[unit.status] || unit.status}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unit.rentAmount} NOK</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Størrelse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unit.sizeSqm} m²</div>
          </CardContent>
        </Card>
        <Link href={`/dashboard/units/${unit.id}/rooms`}>
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Rom & 3D</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">Administrer</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <UnitImageArchive unitId={unit.id} images={unit.unitImages} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Leiehistorikk</h2>
            <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/units/${unit.id}/invite`}>
                    Opprett kontrakt
                </Link>
            </Button>
        </div>
        
        <div className="rounded-md border bg-white">
           {unit.leaseContracts.length === 0 ? (
             <div className="p-4 text-muted-foreground text-sm text-center">
               Ingen leiehistorikk registrert.
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Leietaker</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Periode</TableHead>
                   <TableHead>Opprettet</TableHead>
                   <TableHead className="text-right">Leie</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {unit.leaseContracts.map((contract) => (
                   <TableRow key={contract.id}>
                     <TableCell className="font-medium">
                       {contract.tenant ? (
                         <Link 
                           href={`/dashboard/tenants/${contract.tenant.id}`}
                           className="text-blue-600 hover:underline hover:text-blue-800"
                         >
                           {contract.tenant.name}
                         </Link>
                       ) : (
                         <span className="text-muted-foreground">Ikke registrert</span>
                       )}
                     </TableCell>
                     <TableCell>
                       <Badge variant="secondary" className={`${contractStatusColor[contract.status]} text-white hover:text-white`}>
                         {contractStatusMap[contract.status] || contract.status}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       {contract.startDate ? format(contract.startDate, 'dd.MM.yyyy') : '-'} 
                       {' - '}
                       {contract.endDate ? format(contract.endDate, 'dd.MM.yyyy') : 'Løpende'}
                     </TableCell>
                     <TableCell>
                       {format(contract.createdAt, 'dd.MM.yyyy', { locale: nb })}
                     </TableCell>
                     <TableCell className="text-right">
                       {contract.rentAmount} NOK
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
        </div>
      </div>
    </div>
  );
}
