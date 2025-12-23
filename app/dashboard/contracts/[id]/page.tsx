import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const statusMap: Record<string, string> = {
  DRAFT: "Utkast",
  SENT: "Sendt",
  SIGNED: "Signert",
  TERMINATED: "Avsluttet",
};

interface ContractDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function ContractDetailsPage({ params }: ContractDetailsPageProps) {
  const contract = await prisma.leaseContract.findUnique({
    where: { id: params.id },
    include: {
      unit: {
        include: {
          property: true,
        },
      },
      tenant: true,
    },
  });

  if (!contract) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Leiekontrakt</h1>
            <Badge variant={contract.status === "SIGNED" ? "default" : "secondary"}>
              {statusMap[contract.status] || contract.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {contract.unit.property.name} - {contract.unit.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
             <Link href="/dashboard/contracts">Tilbake</Link>
          </Button>
          {contract.status === "DRAFT" && (
            <Button>Send til signering</Button>
          )}
          {contract.status === "SENT" && (
             <Button variant="secondary">Marker som signert</Button>
          )}
          {contract.status === "SIGNED" && (
            <Button variant="outline">Last ned PDF</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leietaker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-1">
              <span className="font-medium text-muted-foreground">Navn:</span>
              <span className="col-span-2">{contract.tenant.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-medium text-muted-foreground">E-post:</span>
              <span className="col-span-2">{contract.tenant.email}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-medium text-muted-foreground">Telefon:</span>
              <span className="col-span-2">{contract.tenant.phone || "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vilkår</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-1">
              <span className="font-medium text-muted-foreground">Husleie:</span>
              <span className="col-span-2">{contract.rentAmount} NOK / mnd</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-medium text-muted-foreground">Depositum:</span>
              <span className="col-span-2">{contract.depositAmount} NOK</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-medium text-muted-foreground">Startdato:</span>
              <span className="col-span-2">{contract.startDate.toLocaleDateString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-medium text-muted-foreground">Sluttdato:</span>
              <span className="col-span-2">
                {contract.endDate ? contract.endDate.toLocaleDateString() : "Løpende"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kontraktstekst</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md text-sm font-mono whitespace-pre-wrap">
            {/* Placeholder for actual contract text generation */}
            HERVED INNGÅS LEIEAVTALE MELLOM...
            
            1. UTLEIER: {contract.unit.property.ownerId} (Navn kommer her)
            2. LEIETAKER: {contract.tenant.name}
            3. OBJEKT: {contract.unit.property.address}, {contract.unit.name}
            
            ... (Standardtekst fra Husleieloven vil genereres her) ...
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
           <div className="text-xs text-muted-foreground">
             Opprettet: {contract.createdAt.toLocaleString()}
           </div>
        </CardFooter>
      </Card>
    </div>
  );
}
