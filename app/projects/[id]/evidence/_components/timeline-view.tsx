"use client";

import { useState, useMemo } from "react";
import { format, isValid, parseISO, isSameDay } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar as CalendarIcon, GripVertical, FileText, Image as ImageIcon, Loader2, Check, AlertCircle, Clock } from "lucide-react";
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
  legalDate: Date | null;
  originalDate: Date | null;
  includeInReport: boolean;
  legalPriority: number | null;
  category: string | null;
  file: {
    fileType: string;
    storagePath: string;
  };
  createdAt: Date;
}

interface TimelineViewProps {
  items: EvidenceItem[];
  onUpdateItem: (item: EvidenceItem) => void;
}

export default function TimelineView({ items, onUpdateItem }: TimelineViewProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<EvidenceItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Group items by date
  const groupedItems = useMemo(() => {
    const groups: { dateStr: string; dateObj: Date | null; items: EvidenceItem[] }[] = [];
    const noDateItems: EvidenceItem[] = [];

    // Sort items: Legal Date -> Priority -> Evidence Number
    const sorted = [...items].sort((a, b) => {
      const dateA = a.legalDate ? a.legalDate.getTime() : 0;
      const dateB = b.legalDate ? b.legalDate.getTime() : 0;
      if (dateA !== dateB) return dateB - dateA; // Newest first
      
      const priA = a.legalPriority ?? a.evidenceNumber;
      const priB = b.legalPriority ?? b.evidenceNumber;
      return priA - priB;
    });

    sorted.forEach(item => {
      if (!item.legalDate) {
        noDateItems.push(item);
      } else {
        const dateStr = format(item.legalDate, "yyyy-MM-dd");
        let group = groups.find(g => g.dateStr === dateStr);
        if (!group) {
          group = { dateStr, dateObj: item.legalDate, items: [] };
          groups.push(group);
        }
        group.items.push(item);
      }
    });

    // Add "Udatert" group at the top if exists
    if (noDateItems.length > 0) {
      groups.unshift({ dateStr: "udatert", dateObj: null, items: noDateItems });
    }

    return groups;
  }, [items]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
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
        newDate.setHours(item.legalDate.getHours(), item.legalDate.getMinutes());
      } else {
        newDate.setHours(12, 0, 0, 0);
      }
    }

    // Check if date actually changed
    if (
      (newDate === null && item.legalDate === null) ||
      (newDate && item.legalDate && isSameDay(newDate, item.legalDate))
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
            {group.items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                className="group relative bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-move flex items-center gap-4"
              >
                {/* Drag Handle */}
                <div className="text-slate-300 group-hover:text-slate-500 cursor-move">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Icon */}
                <div className="h-10 w-10 bg-slate-50 rounded-md flex items-center justify-center border text-slate-500 shrink-0">
                  {item.file.fileType.startsWith("image/") ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0" onClick={() => setSelectedItem(item)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 truncate">
                      {item.title}
                    </span>
                    {item.category && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal bg-slate-100 text-slate-600 border-slate-200">
                        {item.category}
                      </Badge>
                    )}
                    {!item.includeInReport && (
                      <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal text-slate-400 border-dashed">
                        Ikke i rapport
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    {item.legalDate && (
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(item.legalDate, "HH:mm")}
                      </span>
                    )}
                    {item.description && (
                      <span className="truncate max-w-[300px] text-slate-400">
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedItem(item)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-900"
                >
                  Rediger
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <EditPanel 
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={(updated) => {
          onUpdateItem(updated);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}
