import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface InspectionPageProps {
  params: {
    id: string;
  };
}

export default async function InspectionPage({ params }: InspectionPageProps) {
  const inspection = await prisma.inspectionProtocol.findUnique({
    where: { id: params.id },
    include: {
      checkpoints: true,
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
  });

  if (!inspection) {
    notFound();
  }

  const isSigned = inspection.signedByTenant && inspection.signedByOwner;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {inspection.type === "MOVE_IN" ? "Innflyttingsprotokoll" : "Utflyttingsprotokoll"}
            </h1>
            <Badge variant={isSigned ? "default" : "outline"}>
              {isSigned ? "Signert" : "Utkast"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {inspection.LeaseContract.unit.property.name} - {inspection.LeaseContract.unit.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/inspections">Tilbake</Link>
          </Button>
          {!isSigned && (
             <Button>Signer protokoll</Button>
          )}
          {isSigned && (
             <Button variant="outline">Last ned PDF</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="font-medium text-muted-foreground">Dato:</span>
              <span>{inspection.createdAt.toLocaleDateString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="font-medium text-muted-foreground">Leietaker:</span>
              <span>{inspection.LeaseContract.tenant.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="font-medium text-muted-foreground">Utleier:</span>
              <span>{inspection.LeaseContract.unit.property.ownerId} (Eier)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signeringer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center">
               <span className="text-sm">Leietaker:</span>
               <Badge variant={inspection.signedByTenant ? "default" : "secondary"}>
                 {inspection.signedByTenant ? "Signert" : "Venter"}
               </Badge>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-sm">Utleier:</span>
               <Badge variant={inspection.signedByOwner ? "default" : "secondary"}>
                 {inspection.signedByOwner ? "Signert" : "Venter"}
               </Badge>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Merknader og tilstand</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none text-sm">
             <h3 className="text-base font-semibold">Generelle merknader</h3>
             <p className="whitespace-pre-wrap bg-muted/50 p-4 rounded-md mb-6">
               {inspection.notes || "Ingen merknader registrert."}
             </p>
             
             <h3 className="text-base font-semibold mb-4">Sjekkpunkter</h3>
             {inspection.checkpoints.length > 0 ? (
               <div className="border rounded-md">
                 <div className="grid grid-cols-12 gap-4 p-3 font-medium border-b bg-muted/50 text-xs sm:text-sm">
                   <div className="col-span-3">Rom</div>
                   <div className="col-span-3">Element</div>
                   <div className="col-span-2">Status</div>
                   <div className="col-span-4">Merknad</div>
                 </div>
                 {inspection.checkpoints.map((cp) => (
                   <div key={cp.id} className="grid grid-cols-12 gap-4 p-3 border-b last:border-0 text-sm items-center">
                     <div className="col-span-3 font-medium">{cp.roomName}</div>
                     <div className="col-span-3">{cp.element}</div>
                     <div className="col-span-2">
                        <Badge variant={cp.status === 'OK' ? 'outline' : 'destructive'} className="whitespace-nowrap">
                          {cp.status}
                        </Badge>
                     </div>
                     <div className="col-span-4 text-muted-foreground">{cp.notes || "-"}</div>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-muted-foreground italic">Ingen sjekkpunkter registrert.</p>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
