"use client";

import { useState } from "react";
import { archiveReport, markReportAsDownloaded } from "@/app/actions/reports";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, Archive, Lock, Check, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Report {
  id: string;
  versionNumber: number;
  createdAt: string;
  totalEvidenceCount: number;
  archived: boolean;
  backupDownloaded: boolean;
  backupDownloadedAt?: string;
  archivedAt?: string;
}

interface ReportHistoryTableProps {
  reports: Report[];
  projectId: string;
}

export function ReportHistoryTable({ reports, projectId }: ReportHistoryTableProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const router = useRouter();

  const filteredReports = reports.filter(r => 
    filter === "active" ? !r.archived : r.archived
  );

  const handleDownload = async (reportId: string) => {
    try {
      setIsProcessing(reportId);
      // Simulate download for now (in future, generate PDF blob)
      await markReportAsDownloaded(reportId);
      toast.success("Rapport markert som lastet ned");
      router.refresh();
    } catch (error) {
      toast.error("Kunne ikke markere som lastet ned");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleArchive = async (reportId: string) => {
    try {
      setIsProcessing(reportId);
      await archiveReport(reportId, projectId);
      toast.success("Rapport arkivert");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke arkivere rapport");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="mt-12 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Rapporthistorikk</h2>
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <Button 
            variant={filter === "active" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setFilter("active")}
            className="text-xs"
          >
            Aktive
          </Button>
          <Button 
            variant={filter === "archived" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setFilter("archived")}
            className="text-xs"
          >
            Arkiv
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Ingen {filter === "active" ? "aktive" : "arkiverte"} rapporter funnet.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Versjon</th>
                <th className="px-6 py-3 font-medium">Generert</th>
                <th className="px-6 py-3 font-medium">Bevis</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-primary">v{report.versionNumber}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString('nb-NO')} 
                    <span className="ml-2 text-xs opacity-70">
                      {new Date(report.createdAt).toLocaleTimeString('nb-NO', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </td>
                  <td className="px-6 py-4">{report.totalEvidenceCount} stk</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {report.archived ? (
                        <Badge variant="secondary" className="w-fit">Arkivert</Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit border-green-200 bg-green-50 text-green-800">
                          Aktiv
                        </Badge>
                      )}
                      
                      {report.backupDownloaded && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Check className="w-3 h-3 text-green-600" />
                          Lastet ned
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDownload(report.id)}
                        disabled={isProcessing === report.id}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Last ned
                      </Button>

                      {!report.archived && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Arkiver
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Arkiver juridisk rapport v{report.versionNumber}</AlertDialogTitle>
                              <AlertDialogDescription>
                                Denne rapporten vil flyttes til arkivet. Den kan ikke redigeres etter arkivering.
                                <br/><br/>
                                <strong>Krav:</strong> Du må bekrefte at du har lastet ned en kopi før arkivering.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleArchive(report.id)}
                                className={!report.backupDownloaded ? "opacity-50 cursor-not-allowed" : ""}
                                disabled={!report.backupDownloaded}
                              >
                                {report.backupDownloaded ? "Bekreft Arkivering" : "Må lastes ned først"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
