
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { format, isValid, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar as CalendarIcon, GripVertical, Save, FileText, Image as ImageIcon, File, Loader2, ArrowUp, ArrowDown, Layers, CalendarDays, CheckSquare, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { updateEvidenceItem, updateEvidenceOrder, updateEvidenceItems } from "@/app/actions/evidence";
import { toast } from "sonner";

interface EvidenceItem {
  id: string;
  evidenceNumber: number;
  title: string;
  description: string | null;
  fileId: string;
  legalDate: Date | null;
  originalDate: Date | null;
  legalPriority: number | null;
  createdAt: Date;
  file: {
    fileType: string;
    storagePath: string;
  };
}

interface TimelineEditorProps {
  project: {
    id: string;
    evidenceItems: any[];
  };
}

export default function TimelineEditor({ project }: TimelineEditorProps) {
  // Initialize state
  const [items, setItems] = useState<EvidenceItem[]>(() => 
    project.evidenceItems.map((item: any) => ({
      ...item,
      legalDate: item.legalDate ? new Date(item.legalDate) : null,
      originalDate: item.originalDate ? new Date(item.originalDate) : null,
      createdAt: new Date(item.createdAt),
      legalPriority: item.legalPriority ?? item.evidenceNumber
    }))
  );

  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Group items by date
  const groupedItems = useMemo(() => {
    const groups: { date: string | null; dateObj: Date | null; items: EvidenceItem[] }[] = [];
    const noDateItems: EvidenceItem[] = [];

    // Sort by Date then Priority
    const sorted = [...items].sort((a, b) => {
      const dateA = a.legalDate ? a.legalDate.getTime() : 0;
      const dateB = b.legalDate ? b.legalDate.getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return (a.legalPriority || 0) - (b.legalPriority || 0);
    });

    sorted.forEach(item => {
      if (!item.legalDate) {
        noDateItems.push(item);
      } else {
        const dateStr = format(item.legalDate, "yyyy-MM-dd");
        let group = groups.find(g => g.date === dateStr);
        if (!group) {
          group = { date: dateStr, dateObj: item.legalDate, items: [] };
          groups.push(group);
        }
        group.items.push(item);
      }
    });

    // Add "Udatert" group at the beginning if exists
    if (noDateItems.length > 0) {
      groups.unshift({ date: null, dateObj: null, items: noDateItems });
    }

    return groups;
  }, [items]);

  // Drag & Drop Handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    
    // Determine what is being dragged
    let draggedIds = [id];
    if (selectedIds.has(id)) {
      draggedIds = Array.from(selectedIds);
    }
    
    e.dataTransfer.setData("application/json", JSON.stringify(draggedIds));
    setDraggedItemIndex(items.findIndex(i => i.id === id));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Handle dropping on a group header (Change Date Only)
  const onGroupDrop = async (e: React.DragEvent, dateStr: string | null) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    
    const draggedIds: string[] = JSON.parse(data);
    if (draggedIds.length === 0) return;
    
    // Determine new date
    let newDate: Date | null = null;
    if (dateStr) {
      const group = groupedItems.find(g => g.date === dateStr);
      if (group && group.dateObj) newDate = group.dateObj;
      else newDate = parseISO(dateStr);
    }

    // Filter items that actually need updating
    const updates: { id: string; legalDate: Date | undefined }[] = [];
    const newItems = [...items];
    
    draggedIds.forEach(id => {
        const item = newItems.find(i => i.id === id);
        if (item) {
             const oldDateStr = item.legalDate ? format(item.legalDate, "yyyy-MM-dd") : null;
             if (oldDateStr !== dateStr) {
                 item.legalDate = newDate;
                 updates.push({ id, legalDate: newDate || undefined });
             }
        }
    });

    if (updates.length === 0) return;

    // Optimistic Update
    setItems(newItems);
    setDraggedItemIndex(null);

    try {
        await updateEvidenceItems(updates);
        toast.success(`${updates.length} elementer flyttet`);
    } catch (error) {
        toast.error("Feil ved flytting");
        // Revert logic would be complex, maybe reload page
    }
  };

  // Handle dropping on a specific item (Reorder + Change Date if needed)
  const onItemDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to group drop
    
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    
    const draggedIds: string[] = JSON.parse(data);
    if (draggedIds.length === 0 || draggedIds.includes(targetId)) return;

    const targetItem = items.find(i => i.id === targetId);
    if (!targetItem) return;

    // Calculate new state
    const newItems = [...items];
    
    // 1. Remove dragged items from their old positions
    // We need to keep track of the items to re-insert
    const itemsToMove: EvidenceItem[] = [];
    
    // Process in reverse order to avoid index shifting issues when removing? 
    // Actually, filter is easier.
    const remainingItems = newItems.filter(i => {
        if (draggedIds.includes(i.id)) {
            itemsToMove.push(i);
            return false;
        }
        return true;
    });
    
    // Sort itemsToMove to maintain their relative order? 
    // Or just keep them in the order they were in the original list?
    // The filter above removes them in order, so itemsToMove is in original order.
    
    // 2. Find insertion index
    const targetIdx = remainingItems.findIndex(i => i.id === targetId);
    if (targetIdx === -1) return; // Should not happen
    
    // 3. Update dates for moved items to match target
    itemsToMove.forEach(item => {
        item.legalDate = targetItem.legalDate;
    });

    // 4. Insert at new position (before target)
    remainingItems.splice(targetIdx, 0, ...itemsToMove);
    
    // 5. Re-index priorities
    const updates = remainingItems.map((item, index) => ({
      id: item.id,
      legalPriority: index + 1,
      legalDate: item.legalDate
    }));

    // Optimistic Update
    setItems(remainingItems);
    setDraggedItemIndex(null);

    try {
      // Bulk update both priority and date
      await updateEvidenceItems(updates.map(u => ({ 
          id: u.id, 
          legalDate: u.legalDate || undefined,
          legalPriority: u.legalPriority 
      })));
      
      toast.success("Flyttet og oppdatert");
    } catch (error) {
      console.error(error);
      toast.error("Feil ved flytting");
    }
  };

  // Actions
  const saveOrder = async () => {
    setSaving(true);
    try {
      const updates = items.map((item, index) => ({
        id: item.id,
        legalPriority: index + 1
      }));
      setItems(prev => prev.map((item, index) => ({ ...item, legalPriority: index + 1 })));
      await updateEvidenceOrder(updates);
      toast.success("Rekkefølge lagret");
    } catch (error) {
      toast.error("Kunne ikke lagre rekkefølge");
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = async (id: string, date: Date | undefined) => {
    // Optimistic update
    setItems(prev => prev.map(item => item.id === id ? { ...item, legalDate: date || null } : item));
    
    try {
      await updateEvidenceItem(id, { legalDate: date });
      toast.success("Dato oppdatert");
    } catch (error) {
      toast.error("Feil ved lagring av dato");
    }
  };

  const handleBulkDateChange = async (date: Date | undefined) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Vil du sette datoen for ${selectedIds.size} elementer?`)) return;

    setSaving(true);
    const updates = Array.from(selectedIds).map(id => ({ id, legalDate: date }));
    
    // Optimistic
    setItems(prev => prev.map(item => selectedIds.has(item.id) ? { ...item, legalDate: date || null } : item));

    try {
      await updateEvidenceItems(updates);
      toast.success(`${selectedIds.size} elementer oppdatert`);
      setSelectedIds(new Set()); // Clear selection
    } catch (error) {
      toast.error("Kunne ikke oppdatere elementer");
    } finally {
      setSaving(false);
    }
  };

  const handleTitleChange = (id: string, newTitle: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, title: newTitle } : item));
  };

  const handleTitleBlur = async (id: string, newTitle: string) => {
    try {
      await updateEvidenceItem(id, { title: newTitle });
    } catch (error) {
        // toast.error("Feil ved lagring av tittel");
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.id)));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-slate-500" />;
  };

  return (
    <div className="space-y-4 relative">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg border shadow-sm gap-4 sticky top-4 z-10">
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === "grouped" ? "default" : "outline"} 
            size="sm"
            onClick={() => setViewMode("grouped")}
          >
            <CalendarDays className="mr-2 h-4 w-4" /> Gruppert
          </Button>
          <Button 
            variant={viewMode === "list" ? "default" : "outline"} 
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <Layers className="mr-2 h-4 w-4" /> Liste
          </Button>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-md">
            <span className="text-sm font-medium">{selectedIds.size} valgt</span>
            <div className="h-4 w-px bg-slate-300 mx-2" />
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="secondary">
                  <CalendarIcon className="mr-2 h-4 w-4" /> Sett dato
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  onSelect={(date) => handleBulkDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={selectAll}>
             {selectedIds.size === items.length ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
             Velg alle
           </Button>
           {viewMode === "list" && (
             <Button onClick={saveOrder} disabled={saving} size="sm">
               {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
               Lagre rekkefølge
             </Button>
           )}
        </div>
      </div>

      {/* Grouped View */}
      {viewMode === "grouped" && (
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <div 
              key={group.date || "nodate"} 
              className={cn(
                "border rounded-lg overflow-hidden transition-colors",
                group.date ? "bg-white border-slate-200" : "bg-slate-50 border-dashed border-slate-300"
              )}
              onDragOver={(e) => onDragOver(e)}
              onDrop={(e) => onGroupDrop(e, group.date)}
            >
              <div className={cn(
                "px-4 py-3 font-medium flex items-center justify-between",
                group.date ? "bg-slate-50 border-b" : "bg-slate-100 border-b border-dashed"
              )}>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-slate-500" />
                  <span>
                    {group.dateObj 
                      ? format(group.dateObj, "d. MMMM yyyy", { locale: nb }) 
                      : "Udaterte hendelser (Dra hit for å fjerne dato)"}
                  </span>
                  <span className="text-xs text-slate-400 font-normal ml-2">
                    ({group.items.length} bevis)
                  </span>
                </div>
                {group.dateObj && (
                   <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 text-xs">Endre dato for gruppen</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={group.dateObj}
                        onSelect={async (d) => {
                          if (d) {
                             if(!confirm("Endre dato for alle elementer i denne gruppen?")) return;
                             const ids = group.items.map(i => i.id);
                             const updates = ids.map(id => ({ id, legalDate: d }));
                             // Optimistic
                             setItems(prev => prev.map(item => ids.includes(item.id) ? { ...item, legalDate: d } : item));
                             try {
                               await updateEvidenceItems(updates);
                               toast.success("Gruppe oppdatert");
                             } catch(e) { toast.error("Feil"); }
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              
              <div className="divide-y">
                {group.items.map((item) => (
                  <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.id)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onItemDrop(e, item.id)}
                    className="flex items-center p-3 hover:bg-slate-50 group/item bg-white transition-all duration-200"
                  >
                    <div className="mr-3 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    
                    <div className="mr-3">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="w-16 font-mono text-xs text-slate-500">
                      B-{String(item.evidenceNumber).padStart(3, '0')}
                    </div>

                    <div className="mr-4">
                       {getFileIcon(item.file?.fileType || "")}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Input 
                        value={item.title} 
                        onChange={(e) => handleTitleChange(item.id, e.target.value)}
                        onBlur={(e) => handleTitleBlur(item.id, e.target.value)}
                        className="h-8 text-sm font-medium border-transparent hover:border-slate-200 focus:border-blue-500 px-2 -ml-2 w-full"
                      />
                      <div className="text-xs text-slate-400 truncate">
                        Original: {format(item.originalDate || item.createdAt, "dd.MM.yyyy HH:mm")} • {item.file?.storagePath}
                      </div>
                    </div>
                  </div>
                ))}
                {group.items.length === 0 && (
                   <div className="p-8 text-center text-slate-400 text-sm border-dashed">
                      Dra elementer hit for å legge til i denne datoen
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View (Classic) */}
      {viewMode === "list" && (
        <div className="bg-white border rounded-lg shadow-sm divide-y">
          {items.map((item, index) => (
             <div 
               key={item.id}
               draggable
               onDragStart={(e) => onDragStart(e, item.id)}
               onDragOver={onDragOver}
               onDrop={(e) => onItemDrop(e, item.id)}
               className={cn(
                   "grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors",
                   draggedItemIndex === index && "opacity-50 bg-slate-100"
               )}
             >
               <div className="col-span-1 flex justify-center cursor-grab text-slate-400 hover:text-slate-600">
                 <GripVertical className="h-5 w-5" />
               </div>
               <div className="col-span-1 flex justify-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
               </div>
               <div className="col-span-1 font-mono text-sm font-medium text-slate-700">
                 B-{String(item.evidenceNumber).padStart(3, '0')}
               </div>
               <div className="col-span-2">
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button variant={"outline"} size="sm" className={cn("w-full justify-start text-left font-normal h-8", !item.legalDate && "text-muted-foreground")}>
                       <CalendarIcon className="mr-2 h-4 w-4" />
                       {item.legalDate ? format(item.legalDate, "dd.MM.yyyy") : <span>Velg dato</span>}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0">
                     <Calendar mode="single" selected={item.legalDate || undefined} onSelect={(date) => handleDateChange(item.id, date)} initialFocus />
                   </PopoverContent>
                 </Popover>
               </div>
               <div className="col-span-1 flex justify-center">
                  {getFileIcon(item.file?.fileType || "")}
               </div>
               <div className="col-span-6">
                 <Input 
                   value={item.title} 
                   onChange={(e) => handleTitleChange(item.id, e.target.value)}
                   onBlur={(e) => handleTitleBlur(item.id, e.target.value)}
                   className="h-8 text-sm font-medium"
                 />
               </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
