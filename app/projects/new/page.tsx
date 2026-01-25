
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ProjectForm from "./project-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewProjectPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch properties owned by user
  const properties = await prisma.property.findMany({
    where: { owner: { authId: user.id } },
    select: {
      id: true,
      name: true,
      units: {
        select: { id: true, name: true, unitNumber: true }
      }
    }
  });

  return (
    <div className="container max-w-lg mx-auto p-4">
      <div className="mb-6">
        <Link href="/projects" className="text-slate-500 hover:text-slate-900 flex items-center mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til oversikt
        </Link>
        <h1 className="text-2xl font-bold">Nytt Prosjekt</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ProjectForm properties={properties} />
        </CardContent>
      </Card>
    </div>
  );
}
