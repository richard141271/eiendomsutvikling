import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { LogManager } from "@/components/property-log/log-manager";

export default async function PropertyLogPage({ params }: { params: { id: string } }) {
  const property = await (prisma as any).property.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      units: { select: { id: true, name: true } },
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

  if (!property) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Logg</h1>
          <p className="text-muted-foreground">
            <Link href={`/dashboard/properties/${property.id}`} className="hover:underline">
              {property.name}
            </Link>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/properties/${property.id}`}>Tilbake</Link>
        </Button>
      </div>

      <LogManager
        propertyId={property.id}
        initialEntries={property.logEntries}
        units={property.units}
      />
    </div>
  );
}

