
"use client";

import { addProjectTask, toggleProjectTask, deleteProjectTask } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  task: string;
  done: boolean;
}

interface ProjectTasksProps {
  projectId: string;
  tasks: Task[];
}

export default function ProjectTasks({ projectId, tasks }: ProjectTasksProps) {
  const router = useRouter();
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!newTask.trim()) return;
    setLoading(true);
    try {
      await addProjectTask(projectId, newTask);
      setNewTask("");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleProjectTask(id, !current);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (confirm("Er du sikker på at du vil slette denne oppgaven?")) {
      try {
        await deleteProjectTask(id);
        router.refresh();
      } catch (error) {
        alert("Kunne ikke slette oppgave");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input 
          placeholder="Ny oppgave..." 
          value={newTask} 
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={loading || !newTask.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-center text-slate-500 py-4">Ingen oppgaver enda.</p>}
        
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors group",
              task.done ? "bg-slate-50 border-slate-100" : "bg-white border-slate-200"
            )}
          >
            <Checkbox 
              checked={task.done} 
              onCheckedChange={() => handleToggle(task.id, task.done)}
              className="w-5 h-5"
            />
            <span className={cn("flex-1", task.done && "text-slate-400 line-through")}>
              {task.task}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDelete(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
