"use client";

import { useState, useMemo } from "react";
import { format, isValid, parseISO, isSameDay } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar as CalendarIcon, GripVertical, FileText, Image as ImageIcon, Loader2, Check, AlertCircle, Clock, AlertTriangle, Music, Film, Mail, MessageSquare, Landmark, Ruler, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateEvidenceItem } from "@/app/actions/evidence";
import { toast } from "sonner";
import { EditPanel } from "./edit-panel";
import { Card } from "@/components/ui/card";

interface EvidenceItem {
  id: string;
  evidenceNumber: number;
  title: string;
  description: string | null;
  fileId: string;
  legalDate: Date | string | null;
  originalDate: Date | string | null;
  includeInReport: boolean;
  legalPriority: number | null;
  category: string | null;
  sourceType: string | null;
  reliabilityLevel: string | null;
  missingLink?: boolean;
  missingLinkNote?: string | null;
  missingLinkResolved?: boolean;
  linkedEvidenceId?: string | null;
  file: {
    fileType: string;
    storagePath: string;
    url?: string;
  };
  createdAt: Date | string;
}

interface ClaimItem {
  id: string;
  statement: string;
  sourceDate: Date | string | null;
  status: "UNVERIFIED" | "SUPPORTED" | "CONTRADICTED" | "PARTLY_TRUE";
}

type TimelineItem = 
  | { type: 'evidence', data: EvidenceItem }
  | { type: 'claim', data: ClaimItem };

interface TimelineViewProps {
  items: EvidenceItem[];
  allItems: EvidenceItem[];
  claims?: ClaimItem[];
  onUpdateItem: (item: EvidenceItem) => void;
}

export default function TimelineView({ items, allItems, claims = [], onUpdateItem }: TimelineViewProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<EvidenceItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Group items by date
  const groupedItems = useMemo(() => {
    const groups: { dateStr: string; dateObj: Date | null; items: TimelineItem[] }[] = [];
    const noDateItems: TimelineItem[] = [];

    // Process Evidence Items
    items.forEach(item => {
      const timelineItem: TimelineItem = { type: 'evidence', data: item };
      if (!item.legalDate) {
        noDateItems.push(timelineItem);
      } else {
        const dateObj = new Date(item.legalDate);
        const dateStr = format(dateObj, "yyyy-MM-dd");
        let group = groups.find(g => g.dateStr === dateStr);
        if (!group) {
          group = { dateStr, dateObj: dateObj, items: [] };
          groups.push(group);
        }
        group.items.push(timelineItem);
      }
    });

    // Process Claims
    claims.forEach(claim => {
      const timelineItem: TimelineItem = { type: 'claim', data: claim };
      if (!claim.sourceDate) {
        noDateItems.push(timelineItem);
      } else {
        const dateObj = new Date(claim.sourceDate);
        const dateStr = format(dateObj, "yyyy-MM-dd");
        let group = groups.find(g => g.dateStr === dateStr);
        if (!group) {
          group = { dateStr, dateObj: dateObj, items: [] };
          groups.push(group);
        }
        group.items.push(timelineItem);
      }
    });

    // Sort groups by date (descending)
    groups.sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));

    // Sort items within groups
    groups.forEach(group => {
      group.items.sort((a, b) => {
        // Priority: Claims first, then Evidence by priority/number
        if (a.type !== b.type) {
          return a.type === 'claim' ? -1 : 1;
        }
        
        if (a.type === 'evidence' && b.type === 'evidence') {
          const priA = a.data.legalPriority ?? a.data.evidenceNumber;
          const priB = b.data.legalPriority ?? b.data.evidenceNumber;
          return priA - priB;
        }
        
        return 0;
      });
    });

    // Add "Udatert" group at the top if exists
    if (noDateItems.length > 0) {
      groups.unshift({ dateStr: "udatert", dateObj: null, items: noDateItems });
    }

    return groups;
  }, [items, claims]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const getFileUrl = (path: string) => {
    if (path.startsWith("http") || path.startsWith("blob:")) return path;
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "project-assets";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return path; // Fallback
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };

  const handleDropOnDate = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    const item = items.find(i => i.id === id);
    if (!item) return;

    // Determine new date
    let newDate: Date | null = null;
    if (targetDateStr !== "udatert") {
      newDate = parseISO(targetDateStr);
      // Keep original time if possible, otherwise noon
      if (item.legalDate) {
        const current = new Date(item.legalDate);
        newDate.setHours(current.getHours(), current.getMinutes());
      } else {
        newDate.setHours(12, 0, 0, 0);
      }
    }

    // Check if date actually changed
    const currentLegalDate = item.legalDate ? new Date(item.legalDate) : null;
    if (
      (newDate === null && currentLegalDate === null) ||
      (newDate && currentLegalDate && isSameDay(newDate, currentLegalDate))
    ) {
      setDraggedItemId(null);
      return;
    }

    // Ask for confirmation via toast
    const dateDisplay = newDate ? format(newDate, "d. MMMM yyyy", { locale: nb }) : "Udatert";
    
    toast("Endre dato?", {
      description: `Vil du flytte "${item.title}" til ${dateDisplay}?`,
      action: {
        label: "Ja, flytt",
        onClick: async () => {
          try {
            setIsUpdating(true);
            await updateEvidenceItem(item.id, { legalDate: newDate || undefined });
            onUpdateItem({ ...item, legalDate: newDate });
            toast.success("Dato oppdatert");
          } catch (error) {
            toast.error("Kunne ikke oppdatere dato");
          } finally {
            setIsUpdating(false);
          }
        }
      },
    });
    
    setDraggedItemId(null);
  };

  return (
    <div className="space-y-8 pb-20">
      {groupedItems.map((group) => (
        <div 
          key={group.dateStr} 
          className={cn(
            "relative pl-8 border-l-2 border-slate-200 transition-colors",
            draggedItemId && "border-dashed border-slate-300 bg-slate-50/50 rounded-r-lg"
          )}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnDate(e, group.dateStr)}
        >
          {/* Date Header */}
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white ring-1 ring-slate-200" />
          
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
            {group.dateObj ? (
              <span className="capitalize">{format(group.dateObj, "d. MMMM yyyy", { locale: nb })}</span>
            ) : (
              <span className="text-amber-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Udatert bevis
              </span>
            )}
            <span className="ml-3 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {group.items.length}
            </span>
          </h3>

          <div className="space-y-3">
            {group.items.map((item) => {
              if (item.type === 'claim') {
                const claim = item.data;
                const statusStyles = {
                  "UNVERIFIED": "bg-slate-100 text-slate-700 border-slate-200",
                  "SUPPORTED": "bg-emerald-50 text-emerald-700 border-emerald-200",
                  "CONTRADICTED": "bg-red-50 text-red-700 border-red-200",
                  "PARTLY_TRUE": "bg-amber-50 text-amber-700 border-amber-200"
                }[claim.status] || "bg-slate-100 text-slate-700 border-slate-200";

                const statusLabel = {
                  "UNVERIFIED": "Uverifisert",
                  "SUPPORTED": "Støttet",
                  "CONTRADICTED": "Motbevist",
                  "PARTLY_TRUE": "Delvis sant"
                }[claim.status] || claim.status;

                return (
                  <div
                    key={`claim-${claim.id}`}
                    className="group relative bg-white border rounded-lg p-3 shadow-sm flex items-center gap-4"
                  >
                    {/* Placeholder for alignment with evidence drag handle */}
                    <div className="w-5" />

                    {/* Icon */}
                    <div className={cn("h-10 w-10 rounded-md flex items-center justify-center border shrink-0", statusStyles)}>
                      <Quote className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 truncate">
                          Motpartens påstand
                        </span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 h-5 font-normal border", statusStyles)}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="truncate max-w-[400px] text-slate-600 italic">
                          &quot;{claim.statement}&quot;
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              const evidence = item.data;
              return (
                <div
                  key={evidence.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, evidence.id)}
                  className="group relative bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-move flex items-center gap-4"
                >
                  {/* Drag Handle */}
                  <div className="text-slate-300 group-hover:text-slate-500 cursor-move">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Icon */}
                  <div className="h-10 w-10 bg-slate-50 rounded-md flex items-center justify-center border text-slate-500 shrink-0 overflow-hidden cursor-pointer" onClick={() => window.open(getFileUrl(evidence.file.url || evidence.file.storagePath), '_blank')}>
                    {evidence.file.fileType.startsWith("image/") ? (
                      <img 
                        src={getFileUrl(evidence.file.url || evidence.file.storagePath)} 
                        alt="Bevis" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (evidence.sourceType === "audio" || evidence.file.fileType.startsWith("audio/")) ? (
                      <Music className="w-5 h-5" />
                    ) : (evidence.sourceType === "video" || evidence.file.fileType.startsWith("video/")) ? (
                      <Film className="w-5 h-5" />
                    ) : (evidence.sourceType === "email" || evidence.file.fileType === "message/rfc822") ? (
                      <Mail className="w-5 h-5" />
                    ) : (evidence.sourceType === "sms") ? (
                      <MessageSquare className="w-5 h-5" />
                    ) : (evidence.sourceType === "public_document") ? (
                      <Landmark className="w-5 h-5" />
                    ) : (evidence.sourceType === "measurement") ? (
                      <Ruler className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0" onClick={() => setSelectedItem(evidence)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 truncate">
                        {evidence.title}
                      </span>
                      {evidence.missingLink && (
                        <div className="text-amber-600" title={evidence.missingLinkNote || "Mangler bevislink"}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                      {evidence.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal bg-slate-100 text-slate-600 border-slate-200">
                          {evidence.category}
                        </Badge>
                      )}
                      {!evidence.includeInReport && (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal text-slate-400 border-dashed">
                          Ikke i rapport
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      {evidence.legalDate && (
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(evidence.legalDate), "HH:mm")}
                        </span>
                      )}
                      {evidence.description && (
                        <span className="truncate max-w-[300px] text-slate-400">
                          {evidence.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedItem(evidence)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-900"
                  >
                    Rediger
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <EditPanel 
        item={selectedItem}
        availableEvidence={allItems}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={(updated) => {
          onUpdateItem({
            ...updated,
            createdAt: new Date(updated.createdAt),
            legalDate: updated.legalDate ? new Date(updated.legalDate) : null,
            originalDate: updated.originalDate ? new Date(updated.originalDate) : null,
          } as EvidenceItem);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}
