import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ContractDocument } from "@/components/contract-document";
import { PrintButton } from "@/components/print-button";
import { ContractActions } from "@/components/contract-actions";
import { createClient } from "@/lib/supabase-server";

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
          property: {
            include: {
              owner: true,
            },
          },
        },
      },
      tenant: true,
    },
  });

  if (!contract) {
    notFound();
  }

  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let isOwner = false;
  let isTenant = false;

  if (authUser) {
    // @ts-ignore - authId exists but types are not syncing
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id } as any
    });
    
    if (dbUser) {
      isOwner = contract.unit.property.ownerId === dbUser.id;
      isTenant = contract.tenantId === dbUser.id;
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
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
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" asChild>
             <Link href="/dashboard/contracts">Tilbake</Link>
          </Button>
          
          <ContractActions 
            contractId={contract.id} 
            status={contract.status} 
            isOwner={isOwner} 
            isTenant={isTenant} 
          />

          {isOwner && contract.status === "DRAFT" && (
             <Button variant="outline" asChild>
                <Link href={`/dashboard/contracts/${contract.id}/edit`}>Rediger</Link>
              </Button>
          )}

          <PrintButton />
        </div>
      </div>

      <div className="bg-gray-100 p-8 rounded-lg overflow-auto print:p-0 print:bg-white">
        <ContractDocument 
          contract={contract}
          owner={contract.unit.property.owner}
          tenant={contract.tenant}
          unit={contract.unit}
          property={contract.unit.property}
        />
      </div>
    </div>
  );
}
