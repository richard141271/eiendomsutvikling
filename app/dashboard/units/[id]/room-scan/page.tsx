import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import RoomScanManager from "./room-scan-manager";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface RoomScanPageProps {
  params: {
    id: string; // This is unitId based on folder structure [id]
  };
}

export default async function RoomScanPage({ params }: RoomScanPageProps) {
  const unit = await prisma.unit.findUnique({
    where: { id: params.id },
    include: {
      roomScans: {
        orderBy: { createdAt: "desc" },
      },
      property: true,
    },
  });

  if (!unit) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/dashboard/properties" className="hover:text-foreground">
          Eiendommer
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/dashboard/properties/${unit.propertyId}`} className="hover:text-foreground">
          {unit.property.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/dashboard/units/${unit.id}`} className="hover:text-foreground">
          {unit.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">3D-visning & Rom-skanner</span>
      </div>

      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">3D-visning & Rom-skanner</h1>
        <p className="text-muted-foreground">
          Administrer 3D-modeller og romskanninger for {unit.name}.
        </p>
      </div>

      <RoomScanManager 
        unitId={unit.id} 
        initialScans={unit.roomScans} 
      />
    </div>
  );
}
