
import { prisma } from "@/lib/prisma";
import { ShowcaseWizard } from "./showcase-wizard";
import { notFound } from "next/navigation";

export default async function ShowcasePage({ params }: { params: { id: string } }) {
  const unit = await prisma.unit.findUnique({
    where: { id: params.id },
    include: {
      property: true,
      roomDetails: {
        include: {
          images: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });

  if (!unit) {
    return notFound();
  }

  return (
    <div className="container max-w-lg mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Skrytemappe Generator</h1>
      <ShowcaseWizard unit={unit} />
    </div>
  );
}
