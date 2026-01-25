
import { getLocationTasks } from "@/app/actions/location-tasks";
import TasksClient from "./tasks-client";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function TasksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tasks = await getLocationTasks();

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="mb-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 flex items-center text-sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Tilbake til dashboard
        </Link>
      </div>
      <TasksClient tasks={tasks} />
    </div>
  );
}
