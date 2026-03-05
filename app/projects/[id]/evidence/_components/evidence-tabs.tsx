"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, LayoutList, Table as TableIcon, AlertTriangle } from "lucide-react";
import TimelineView from "./timeline-view";
import EvidenceBankView from "./evidence-bank-view";
import NewEvidenceDialog from "./new-evidence-dialog";
import { toast } from "sonner";

interface EvidenceItem {
  id: string;
  evidenceNumber: number;
  title: string;
  description: string | null;
  fileId: string;
  legalDate: Date | null;
  originalDate: Date | null;
  includeInReport: boolean;
  legalPriority: number | null;
  category: string | null;
  sourceType: string | null;
  reliabilityLevel: string | null;
  missingLink?: boolean;
  missingLinkNote?: string | null;
  linkedEvidenceId?: string | null;
  file: {
    fileType: string;
    storagePath: string;
    url?: string;
  };
  createdAt: Date;
}

interface EvidenceTabsProps {
  initialItems: any[]; // Raw from DB
  projectId: string;
}

export default function EvidenceTabs({ initialItems, projectId }: EvidenceTabsProps) {
  // Transform initial items to ensure Dates are Dates
  const [items, setItems] = useState<EvidenceItem[]>(() => 
    initialItems.map(item => ({
      ...item,
      legalDate: item.legalDate ? new Date(item.legalDate) : null,
      originalDate: item.originalDate ? new Date(item.originalDate) : null,
      createdAt: new Date(item.createdAt),
      legalPriority: item.legalPriority ?? item.evidenceNumber,
      category: item.category ?? null,
      includeInReport: item.includeInReport ?? true // Default to true if missing
    }))
  );

  useEffect(() => {
    setItems(initialItems.map(item => ({
      ...item,
      legalDate: item.legalDate ? new Date(item.legalDate) : null,
      originalDate: item.originalDate ? new Date(item.originalDate) : null,
      createdAt: new Date(item.createdAt),
      legalPriority: item.legalPriority ?? item.evidenceNumber,
      category: item.category ?? null,
      includeInReport: item.includeInReport ?? true // Default to true if missing
    })));
  }, [initialItems]);

  const [filter, setFilter] = useState("all");

  const missingLinkCount = items.filter(i => i.missingLink).length;

  const filteredItems = items.filter(item => {
    if (filter === "all") return true;
    if (filter === "report") return item.includeInReport;
    if (filter === "image") return item.file.fileType.startsWith("image/");
    if (filter === "no-date") return !item.legalDate;
    if (filter === "missing-link") return item.missingLink;
    if (filter === "no-category") return !item.category;
    return true;
  });

  const handleUpdateItem = (updatedItem: EvidenceItem) => {
    setItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Tabs defaultValue="timeline" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <LayoutList className="w-4 h-4" />
                Tidslinje
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-2">
                <TableIcon className="w-4 h-4" />
                Bevisbank
              </TabsTrigger>
            </TabsList>
            
            <NewEvidenceDialog projectId={projectId} />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-2 mb-4 p-1 bg-slate-50/50 rounded-lg border border-slate-100">
            <Button variant={filter === "all" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("all")} className="text-xs h-8">Vis alle</Button>
            <Button variant={filter === "report" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("report")} className="text-xs h-8">Kun rapport</Button>
            <Button variant={filter === "image" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("image")} className="text-xs h-8">Kun bilder</Button>
            <Button variant={filter === "no-date" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("no-date")} className="text-xs h-8">Uten dato</Button>
            <Button variant={filter === "missing-link" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("missing-link")} className="text-xs h-8 text-amber-700 hover:text-amber-800 hover:bg-amber-50">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Mangler link
              {missingLinkCount > 0 && (
                <span className="ml-1.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border border-amber-200">
                  {missingLinkCount}
                </span>
              )}
            </Button>
            <Button variant={filter === "no-category" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("no-category")} className="text-xs h-8">Uten kategori</Button>
          </div>

          {filter === "missing-link" && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="bg-amber-100 p-2 rounded-full text-amber-600 shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-900">Ufullstendige koblinger</h3>
                <p className="text-sm text-amber-800 mt-1">
                  Her er en oversikt over bevis som refererer til annen dokumentasjon som ennå ikke er koblet.
                  Last opp manglende dokumentasjon og koble dem sammen for å fullføre beviskjeden.
                </p>
              </div>
            </div>
          )}

          <TabsContent value="timeline" className="mt-0">
             <div className="bg-slate-50/50 min-h-[500px] rounded-lg p-6 border border-dashed border-slate-200">
               <TimelineView items={filteredItems} allItems={items} onUpdateItem={handleUpdateItem} />
             </div>
          </TabsContent>

          <TabsContent value="bank" className="mt-0">
            <EvidenceBankView items={filteredItems} allItems={items} onUpdateItem={handleUpdateItem} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
