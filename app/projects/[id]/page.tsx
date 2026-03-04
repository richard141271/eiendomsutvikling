
import { getProject } from "@/lib/data/project";
import { notFound, redirect } from "next/navigation";
import ProjectClient from "./project-client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils/serialization";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const project = await getProject(params.id) as any;

  if (!project) {
    notFound();
  }

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true },
  });

  return (
    <div className="container max-w-lg mx-auto p-4 pb-24">
      <div className="mb-4">
        <Link href="/projects" className="text-slate-500 hover:text-slate-900 flex items-center text-sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til oversikt
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="text-slate-500 text-sm">
           {project.property?.name || "Tilfeldig prosjekt"}
           {project.unit && ` • Enhet ${project.unit.unitNumber || project.unit.name}`}
        </p>
      </div>

      <ProjectClient project={serialize(project)} />
    </div>
  );
}
