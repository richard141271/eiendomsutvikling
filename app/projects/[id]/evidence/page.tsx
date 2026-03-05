
import { createClient } from "@/lib/supabase-server";
import { getProjectWithEvidence } from "@/lib/data/project";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import EvidenceTabs from "./_components/evidence-tabs";

export default async function EvidencePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const project = await getProjectWithEvidence(params.id);

  if (!project) notFound();

  return (
    <div className="container max-w-6xl mx-auto p-4 pb-24">
      <div className="mb-4">
        <Link href={`/projects/${project.id}`} className="text-slate-500 hover:text-slate-900 flex items-center text-sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til prosjekt
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Bevisbank & Tidslinje</h1>
        <p className="text-slate-500">
          {project.title} • {project.evidenceItems.length} bevis
        </p>
      </div>

      <EvidenceTabs initialItems={project.evidenceItems} projectId={project.id} />
    </div>
  );
}
