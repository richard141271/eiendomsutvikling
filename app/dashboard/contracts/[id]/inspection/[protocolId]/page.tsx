import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { InspectionForm } from "./inspection-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface InspectionPageProps {
  params: {
    id: string;
    protocolId: string;
  };
}

export default async function InspectionPage({ params }: InspectionPageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Logg inn for å se denne siden</div>;
  }

  const protocol = await prisma.inspectionProtocol.findUnique({
    where: { id: params.protocolId },
    include: {
      checkpoints: {
        include: {
          images: true
        },
        orderBy: [
            { roomName: 'asc' }, // Ensure consistent ordering
            { element: 'asc' }
        ]
      },
      LeaseContract: {
        include: {
          unit: {
            include: {
              property: true
            }
          }
        }
      }
    }
  });

  if (!protocol || protocol.contractId !== params.id) {
    notFound();
  }

  // Determine user role
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser) return <div>Bruker ikke funnet</div>;

  const isOwner = protocol.LeaseContract.unit.property.ownerId === dbUser.id;
  const isTenant = protocol.LeaseContract.tenantId === dbUser.id;

  if (!isOwner && !isTenant) {
    return <div>Du har ikke tilgang til denne protokollen</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/contracts/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {protocol.type === "MOVE_IN" ? "Innflyttingsprotokoll" : "Utflyttingsprotokoll"}
          </h1>
          <p className="text-muted-foreground">
            {protocol.LeaseContract.unit.property.name} - {protocol.LeaseContract.unit.name}
          </p>
        </div>
      </div>

      <InspectionForm 
        // @ts-ignore - Types mismatch due to schema update lag
        protocol={protocol} 
        isOwner={isOwner} 
        isTenant={isTenant} 
      />
    </div>
  );
}
