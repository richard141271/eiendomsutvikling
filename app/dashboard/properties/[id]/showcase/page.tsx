
import { prisma } from "@/lib/prisma";
import { ShowcaseWizard } from "@/app/dashboard/units/[id]/showcase/showcase-wizard";
import { notFound } from "next/navigation";

export default async function PropertyShowcasePage({ params }: { params: { id: string } }) {
  const property = await prisma.property.findUnique({
    where: { id: params.id },
  });

  if (!property) return notFound();

  // Find or create "Hele Eiendommen" unit for showcase purposes
  // We use a specific name to identify it. 
  // Ideally this would be a separate model or a flag on Unit, but this is a safe non-breaking way.
  let showcaseUnit = await prisma.unit.findFirst({
    where: {
      propertyId: property.id,
      name: "Hele Eiendommen (Skrytemappe)"
    }
  });

  if (!showcaseUnit) {
    showcaseUnit = await prisma.unit.create({
      data: {
        name: "Hele Eiendommen (Skrytemappe)",
        propertyId: property.id,
        status: "AVAILABLE",
        sizeSqm: 0,
        rentAmount: 0,
        depositAmount: 0,
        roomCount: 0
      }
    });
  }

  // Fetch with full includes needed for wizard
  const fullUnit = await prisma.unit.findUnique({
    where: { id: showcaseUnit.id },
    include: {
      property: true,
      roomDetails: {
        include: { images: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!fullUnit) return notFound();

  return (
    <div className="container max-w-lg mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Skrytemappe Generator</h1>
        <p className="text-muted-foreground">For hele eiendommen: {property.name}</p>
      </div>
      <ShowcaseWizard unit={fullUnit} />
    </div>
  );
}
