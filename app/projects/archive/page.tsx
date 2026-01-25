
import { getProjects } from "@/app/actions/projects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ChevronLeft, FolderArchive } from "lucide-react";
import Link from "next/link";

export default async function ArchivedProjectsPage() {
  const projects = await getProjects({ status: "ARCHIVED" });

  return (
    <div className="container max-w-2xl mx-auto p-4 pb-24">
      <div className="mb-4">
        <Link href="/projects" className="text-slate-500 hover:text-slate-900 flex items-center text-sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til prosjekter
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Arkiverte Prosjekter</h1>
      </div>

      <div className="grid gap-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
              <FolderArchive className="h-12 w-12 mb-4 opacity-50" />
              <p>Ingen arkiverte prosjekter</p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project: any) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:bg-slate-50 transition-colors opacity-75 hover:opacity-100">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <span className="text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded-full font-medium">
                      Arkivert
                    </span>
                  </div>
                  <CardDescription>
                    {project.property.name}
                    {project.unit && ` • Enhet ${project.unit.unitNumber || project.unit.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-4">
                      <span>{project._count.entries} loggføringer</span>
                      <span>{project._count.tasks} oppgaver</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(project.createdAt).toLocaleDateString("no-NO")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
