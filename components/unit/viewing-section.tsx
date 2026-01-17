"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar as CalendarIcon, CheckSquare, Plus, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createViewing, updateViewingChecklist, deleteViewing } from "@/app/actions/viewing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Viewing {
  id: string;
  unitId: string;
  date: Date;
  notes: string | null;
  checklist: any;
  createdAt: Date;
}

interface ViewingSectionProps {
  unitId: string;
  viewings: Viewing[];
}

export function ViewingSection({ unitId, viewings: initialViewings }: ViewingSectionProps) {
  const [viewings, setViewings] = useState<Viewing[]>(initialViewings);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedViewing, setSelectedViewing] = useState<Viewing | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [selectedInterestId, setSelectedInterestId] = useState<string>("none");

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const res = await fetch(`/api/interests?unitId=${unitId}`);
        if (res.ok) {
          const data = await res.json();
          setInterests(data);
        }
      } catch (e) {
        console.error("Failed to fetch interests for viewings", e);
      }
    };
    fetchInterests();
  }, [unitId]);

  const handleCreate = async () => {
    if (!date) return;
    setLoading(true);
    let finalNotes = notes;
    const interest =
      selectedInterestId !== "none"
        ? interests.find((i) => i.id === selectedInterestId)
        : null;

    if (interest) {
      const autoNote = `Interessent: ${interest.name} (${interest.email})`;
      finalNotes = finalNotes ? `${finalNotes} – ${autoNote}` : autoNote;
    }

    const res = await createViewing({ unitId, date, notes: finalNotes });
    if (res.success && res.data) {
      setViewings([res.data as unknown as Viewing, ...viewings]);
      setIsCreateOpen(false);
      setNotes("");
      setDate(new Date());
      setSelectedInterestId("none");
    }
    setLoading(false);
  };

  const handleCheck = async (viewingId: string, item: string, checked: boolean) => {
    // Optimistic update
    const updatedViewings = viewings.map(v => {
      if (v.id === viewingId) {
        const newChecklist = { ...(v.checklist || {}), [item]: checked };
        return { ...v, checklist: newChecklist };
      }
      return v;
    });
    setViewings(updatedViewings);
    
    // Update selected viewing if open
    if (selectedViewing && selectedViewing.id === viewingId) {
        setSelectedViewing({
            ...selectedViewing,
            checklist: { ...(selectedViewing.checklist || {}), [item]: checked }
        });
    }

    const viewing = updatedViewings.find(v => v.id === viewingId);
    if (viewing) {
      await updateViewingChecklist(viewingId, viewing.checklist);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne visningen?")) return;
    const res = await deleteViewing(id, unitId);
    if (res.success) {
        setViewings(viewings.filter(v => v.id !== id));
        if (selectedViewing?.id === id) setSelectedViewing(null);
    }
  };

  const handleCopy = (viewing: Viewing, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const dateStr = format(new Date(viewing.date), "d. MMMM yyyy", { locale: nb });
    let text = `Visning: ${dateStr}\n`;
    if (viewing.notes) text += `Notater: ${viewing.notes}\n`;
    text += `\nSjekkliste:\n`;
    
    if (viewing.checklist) {
        Object.entries(viewing.checklist).forEach(([item, checked]) => {
            text += `[${checked ? 'x' : ' '}] ${item}\n`;
        });
    }

    navigator.clipboard.writeText(text);
    setCopiedId(viewing.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getProgress = (checklist: any) => {
    if (!checklist) return { completed: 0, total: 0 };
    const items = Object.values(checklist);
    const completed = items.filter(Boolean).length;
    return { completed, total: items.length };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Visninger & Sjekklister</CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Ny visning
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Planlegg ny visning</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Dato</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: nb }) : <span>Velg dato</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Notater</Label>
                <Input 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="F.eks. Visning for studentpar"
                />
              </div>
              {interests.length > 0 && (
                <div className="space-y-2">
                  <Label>Interessent (valgfritt)</Label>
                  <Select
                    value={selectedInterestId}
                    onValueChange={setSelectedInterestId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg interessent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen valgt</SelectItem>
                      {interests.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({new Date(i.createdAt).toLocaleDateString("no-NO")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleCreate} disabled={loading} className="w-full">
                {loading ? "Lagrer..." : "Opprett"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {viewings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen planlagte visninger.</p>
        ) : (
          <div className="space-y-2">
            {viewings.map((viewing) => {
              const { completed, total } = getProgress(viewing.checklist);
              const isDone = total > 0 && completed === total;

              return (
                <div 
                  key={viewing.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedViewing(viewing)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isDone ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        <CheckSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(viewing.date), "d. MMMM yyyy", { locale: nb })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {viewing.notes || "Ingen notater"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-2">
                        <span className={`text-xs font-medium ${isDone ? 'text-green-600' : 'text-slate-500'}`}>
                            {completed}/{total} sjekkpunkter
                        </span>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        onClick={(e) => handleCopy(viewing, e)}
                        title="Kopier sjekkliste"
                    >
                        {copiedId === viewing.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={!!selectedViewing} onOpenChange={(open) => !open && setSelectedViewing(null)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Sjekkliste for visning</span>
                        {selectedViewing && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="mr-6"
                                onClick={() => handleCopy(selectedViewing)}
                            >
                                {copiedId === selectedViewing.id ? (
                                    <>
                                        <Check className="h-3 w-3 mr-2" />
                                        Kopiert
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3 mr-2" />
                                        Kopier
                                    </>
                                )}
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>
                {selectedViewing && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-3 rounded-md text-sm">
                            <p className="font-medium">Dato: {format(new Date(selectedViewing.date), "d. MMMM yyyy", { locale: nb })}</p>
                            {selectedViewing.notes && <p className="text-slate-500 mt-1">{selectedViewing.notes}</p>}
                        </div>
                        
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm text-slate-900">Forberedelser</h4>
                            {selectedViewing.checklist && Object.entries(selectedViewing.checklist).map(([item, checked]) => (
                                <div key={item} className="flex items-center space-x-2 p-2 rounded hover:bg-slate-50">
                                    <Checkbox 
                                        id={item} 
                                        checked={checked as boolean}
                                        onCheckedChange={(c) => handleCheck(selectedViewing.id, item, c as boolean)}
                                    />
                                    <Label 
                                        htmlFor={item} 
                                        className={`flex-1 cursor-pointer ${checked ? 'line-through text-slate-400' : ''}`}
                                    >
                                        {item}
                                    </Label>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between pt-4 border-t">
                             <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(selectedViewing.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Slett visning
                             </Button>
                             <Button onClick={() => setSelectedViewing(null)}>
                                Lukk
                             </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
