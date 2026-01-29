
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";

export default async function NewShowcasePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  async function createShowcase(formData: FormData) {
    "use server";
    
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    
    if (!name) return;

    // Get DB user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user!.id }
    });

    if (!dbUser) throw new Error("User not found");

    // Create a new property for this showcase
    const property = await prisma.property.create({
      data: {
        name: name,
        address: address || name,
        ownerId: dbUser.id,
        status: "ACTIVE", // Or potentially a new status like 'PROSPECT'
      }
    });

    // Create a default unit for the showcase
    const unit = await prisma.unit.create({
      data: {
        name: "Skrytemappe Enhet",
        propertyId: property.id,
        status: "AVAILABLE",
        sizeSqm: 0,
        rentAmount: 0,
        depositAmount: 0,
        roomCount: 0
      }
    });

    // Create a Project entry too? The user asked for it under "Prosjekter".
    // "jeg vil kunne lage en skrytemappe... kanskje under prosjekter?"
    // If we create a project, it appears in the list.
    await prisma.project.create({
      data: {
        title: `Skrytemappe: ${name}`,
        description: "Automatisk opprettet skrytemappe-prosjekt",
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
        <h1 className="text-2xl font-bold">Ny Skrytemappe</h1>
        <p className="text-muted-foreground">Opprett en ny skrytemappe for en eiendom du ikke eier fra før.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eiendom / Objekt</CardTitle>
          <CardDescription>Vi oppretter et prosjekt og en skrytemappe for deg.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createShowcase} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Navn på objekt / overskrift</Label>
              <Input id="name" name="name" placeholder="F.eks. Storgata 12 - Visning" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Adresse (valgfritt)</Label>
              <Input id="address" name="address" placeholder="F.eks. Storgata 12, 0150 Oslo" />
            </div>

            <Button type="submit" className="w-full">
              Opprett og start veiviser
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
