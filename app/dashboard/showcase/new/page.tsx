
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewShowcaseForm } from "./new-showcase-form";

export default async function NewShowcasePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  async function createShowcase(formData: FormData) {
    "use server";
    
    const requestId = randomUUID();
    const now = new Date();

    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    
    console.log("createShowcase invoked", {
      requestId,
      timestamp: now.toISOString(),
      userId: user!.id,
      name,
    });

    if (!name) return;

    const dbUser = await prisma.user.findUnique({
      where: { authId: user!.id }
    });

    if (!dbUser) {
      console.log("createShowcase user not found", {
        requestId,
        authId: user!.id,
      });
      throw new Error("User not found");
    }

    const title = `Prospekt: ${name}`;
    const tenSecondsAgo = new Date(Date.now() - 10_000);

    const recentProject = await prisma.project.findFirst({
      where: {
        title,
        createdAt: {
          gte: tenSecondsAgo,
        },
        property: {
          ownerId: dbUser.id,
        },
      },
    });

    if (recentProject) {
      console.log("createShowcase duplicate title within 10 seconds, redirecting to existing", {
        requestId,
        projectId: recentProject.id,
        unitId: recentProject.unitId,
      });

      if (recentProject.unitId) {
        redirect(`/dashboard/units/${recentProject.unitId}/showcase`);
      } else {
        redirect("/projects");
      }
    }

    console.log("createShowcase creating new showcase entities", {
      requestId,
    });

    const property = await prisma.property.create({
      data: {
        name,
        address: address || name,
        ownerId: dbUser.id,
        status: "ACTIVE",
      }
    });

    const unit = await prisma.unit.create({
      data: {
        name: "Prospekt Enhet",
        propertyId: property.id,
        status: "AVAILABLE",
        sizeSqm: 0,
        rentAmount: 0,
        depositAmount: 0,
        roomCount: 0
      }
    });

    await prisma.project.create({
      data: {
        title,
        description: "Automatisk opprettet prospekt-prosjekt",
        status: "ACTIVE",
        propertyId: property.id,
        unitId: unit.id
      }
    });

    redirect(`/dashboard/units/${unit.id}/showcase`);
  }

  return (
    <div className="container max-w-lg mx-auto p-4">
      <div className="mb-6">
        <Link href="/projects" className="text-slate-500 hover:text-slate-900 flex items-center mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til prosjekter
        </Link>
        <h1 className="text-2xl font-bold">Nytt prospekt</h1>
        <p className="text-muted-foreground">Opprett et nytt prospekt for en eiendom du ikke eier fra før.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eiendom / Objekt</CardTitle>
          <CardDescription>Vi oppretter et prosjekt og et prospekt for deg.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewShowcaseForm createShowcase={createShowcase} />
        </CardContent>
      </Card>
    </div>
  );
}
