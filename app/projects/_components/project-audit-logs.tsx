
"use client";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default function ProjectAuditLogs({ logs }: { logs: any[] }) {
  if (!logs || logs.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-8">
      <h3 className="text-lg font-bold mb-4">Aktivitetslogg (Kun Eier)</h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="text-sm border-b pb-2">
            <div className="flex justify-between text-slate-500 text-xs mb-1">
              <span>{format(new Date(log.createdAt), "dd.MM.yyyy HH:mm", { locale: nb })}</span>
              <span>{log.user.name || log.user.email}</span>
            </div>
            <div className="font-medium">
              <span className={log.action === "DELETE" ? "text-red-600" : "text-blue-600"}>{log.action}</span>: {log.details}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
