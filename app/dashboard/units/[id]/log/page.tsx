import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { LogManager } from "@/components/property-log/log-manager";

export default async function UnitLogPage({ params }: { params: { id: string } }) {
  const unit = await (prisma as any).unit.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      propertyId: true,
      property: { select: { id: true, name: true } },
      roomDetails: { select: { id: true, name: true } },
      logEntries: {
        include: {
          attachments: true,
          unit: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, name: true } },
          performedByUser: { select: { id: true, name: true } },
        },
        orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!unit) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Logg</h1>
          <p className="text-muted-foreground">
            <Link href={`/dashboard/units/${unit.id}`} className="hover:underline">
              {unit.name}
            </Link>
            {" • "}
            <Link href={`/dashboard/properties/${unit.propertyId}`} className="hover:underline">
              {unit.property.name}
            </Link>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/units/${unit.id}`}>Tilbake</Link>
        </Button>
      </div>

      <LogManager
        propertyId={unit.propertyId}
        unitId={unit.id}
        rooms={unit.roomDetails}
        initialEntries={unit.logEntries}
      />
    </div>
  );
}

