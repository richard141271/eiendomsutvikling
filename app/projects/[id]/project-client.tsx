
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckSquare, Info, MapPin } from "lucide-react";
import ProjectLog from "../_components/project-log";
import ProjectTasks from "../_components/project-tasks";
import ProjectOverview from "../_components/project-overview";
import ProjectAuditLogs from "../_components/project-audit-logs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ProjectClientProps {
  project: any; // Full project object with relations
  auditLogs: any[];
}

export default function ProjectClient({ project, auditLogs }: ProjectClientProps) {
  return (
    <Tabs defaultValue="log" className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-14 mb-6">
        <TabsTrigger value="log" className="flex flex-col gap-1 py-2">
          <FileText className="h-4 w-4" />
          <span className="text-xs">Logg</span>
        </TabsTrigger>
        <TabsTrigger value="tasks" className="flex flex-col gap-1 py-2">
          <CheckSquare className="h-4 w-4" />
          <span className="text-xs">Sjekkliste</span>
        </TabsTrigger>
        <TabsTrigger value="overview" className="flex flex-col gap-1 py-2">
          <Info className="h-4 w-4" />
          <span className="text-xs">Oversikt</span>
        </TabsTrigger>
        <Link href={`/tasks?projectId=${project.id}`} className="w-full">
          <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-background/50 hover:text-accent-foreground h-full w-full flex-col gap-1">
            <MapPin className="h-4 w-4" />
            <span className="text-xs">Stedsbaserte</span>
          </div>
        </Link>
      </TabsList>
      
      <TabsContent value="log">
        <ProjectLog projectId={project.id} entries={project.entries} />
      </TabsContent>
      
      <TabsContent value="tasks">
        <ProjectTasks projectId={project.id} tasks={project.tasks} />
      </TabsContent>
      
      <TabsContent value="overview">
        <ProjectOverview project={project} />
        <div className="mt-8">
          <ProjectAuditLogs logs={auditLogs} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
