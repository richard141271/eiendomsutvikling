
import { getProjects } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Folder, FolderArchive, Calendar, ChevronLeft, ChevronDown, Gavel, FileText, Home } from "lucide-react";
import Link from "next/link";

export default async function ProjectsPage() {
  const projects = await getProjects({ status: "ACTIVE" });

  return (
    <div className="container max-w-2xl mx-auto p-4 pb-24">
      <div className="mb-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 flex items-center text-sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til dashboard
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Prosjekter</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nytt prosjekt <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Velg type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/projects/new">
                <DropdownMenuItem>
                  <Folder className="mr-2 h-4 w-4" /> Standard Prosjekt
                </DropdownMenuItem>
              </Link>
              <Link href="/projects/new?type=legal">
                <DropdownMenuItem>
                  <Gavel className="mr-2 h-4 w-4" /> Dokumentasjonsrapport
                </DropdownMenuItem>
              </Link>
              <Link href="/projects/new?type=brag">
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" /> Skryterapport
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <Link href="/dashboard/showcase/new">
                <DropdownMenuItem>
                  <Home className="mr-2 h-4 w-4" /> Nytt Prospekt
                </DropdownMenuItem>
              </Link>
              <Link href="/dashboard/showcase/new?type=sales">
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" /> Salgsoppgave
                </DropdownMenuItem>
              </Link>
              <Link href="/dashboard/showcase/new?type=rental">
                <DropdownMenuItem>
                  <Home className="mr-2 h-4 w-4" /> Utleieprospekt
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Folder className="h-12 w-12 mb-4 opacity-50" />
              <p>Ingen aktive prosjekter</p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project: any) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:bg-slate-50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-medium">
                      Aktiv
                    </span>
                  </div>
                  <CardDescription>
                    {project.property?.name || "Tilfeldig prosjekt"}
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
      
      <div className="mt-8 text-center">
        <Link href="/projects/archive" className="text-slate-500 hover:text-slate-900 text-sm flex items-center justify-center gap-2">
          <FolderArchive className="h-4 w-4" /> Se arkiverte prosjekter
        </Link>
      </div>
    </div>
  );
}
