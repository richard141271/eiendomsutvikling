import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import WitnessList from "./_components/witness-list";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function WitnessPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const project = await (prisma as any).project.findUnique({
    where: { id: params.id },
    include: {
      people: {
        include: {
          witnessObservations: {
            include: {
              event: true
            },
            orderBy: {
              date: 'desc'
            }
          }
        }
      },
      events: {
        orderBy: {
          date: 'desc'
        }
      }
    }
  });

  if (!project) {
    return <div>Prosjekt ikke funnet</div>;
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vitner og Observasjoner</h1>
          <p className="text-muted-foreground">Administrer vitner og koble observasjoner til hendelser.</p>
        </div>
      </div>

      <WitnessList project={project} />
    </div>
  );
}
