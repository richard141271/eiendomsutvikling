
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
      <TabsList className="grid w-full grid-cols-3 h-14 mb-6">
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
