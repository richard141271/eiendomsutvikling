
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ClaimsClient from "./_components/claims-client";

export default async function ClaimsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      claims: {
        include: {
          evidenceLinks: {
            include: {
              evidence: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      evidenceItems: true // We need this to select evidence to link
    }
  });

  if (!project) notFound();

  // Serialize dates
  const serializedProject = JSON.parse(JSON.stringify(project));

  return (
    <div className="container max-w-6xl mx-auto p-4 pb-24">
      <div className="mb-4">
        <Link href={`/projects/${project.id}`} className="text-slate-500 hover:text-slate-900 flex items-center text-sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til prosjekt
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Motparts-påstander</h1>
        <p className="text-slate-500">
          Registrer og vurder motpartens påstander med dokumentasjon.
        </p>
      </div>

      <ClaimsClient 
        projectId={project.id} 
        initialClaims={serializedProject.claims} 
        evidenceItems={serializedProject.evidenceItems}
      />
    </div>
  );
}
