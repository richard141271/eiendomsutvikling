"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Clock, Lock, Save, Trash2, FileText, Image as ImageIcon, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateEvidenceItem } from "@/app/actions/evidence";
import { toast } from "sonner";
import Image from "next/image";

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
    url?: string;
    originalName?: string;
  };
  createdAt: Date;
}

interface EditPanelProps {
  item: EvidenceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: EvidenceItem) => void;
}

export function EditPanel({ item, isOpen, onClose, onSave }: EditPanelProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [legalDate, setLegalDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("12:00");
  const [category, setCategory] = useState("");
  const [includeInReport, setIncludeInReport] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setCategory(item.category || "");
      setIncludeInReport(item.includeInReport);
      
      if (item.legalDate) {
        setLegalDate(item.legalDate);
        setTime(format(item.legalDate, "HH:mm"));
      } else {
        setLegalDate(undefined);
        setTime("12:00");
      }
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    try {
      setIsSaving(true);
      
      let newDate = legalDate;
      if (newDate && time) {
        const [hours, minutes] = time.split(":").map(Number);
        newDate = new Date(newDate);
        newDate.setHours(hours, minutes);
      }

      await updateEvidenceItem(item.id, {
        title,
        description,
        legalDate: newDate,
        includeInReport,
        category: category || undefined
      });

      onSave({
        ...item,
        title,
        description,
        legalDate: newDate || null,
        includeInReport,
        category: category || null
      });
      
      toast.success("Endringer lagret");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Kunne ikke lagre endringer");
    } finally {
      setIsSaving(false);
    }
  };

  if (!item) return null;

  const isImage = item.file.fileType.startsWith("image/");

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Rediger Bevis #{item.evidenceNumber}</SheetTitle>
          <SheetDescription>
            Endre detaljer for beviset. Hendelsesdato styrer plassering i tidslinjen.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-6 py-6">
          {/* Preview */}
          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border relative group">
            {isImage ? (
               item.file.url || item.file.storagePath ? (
                 <div className="relative w-full h-full">
                   <Image 
                     src={item.file.url || item.file.storagePath} 
                     alt={item.title}
                     fill
                     className="object-contain"
                   />
                 </div>
               ) : (
                 <div className="flex flex-col items-center text-slate-400">
                   <ImageIcon className="h-12 w-12 mb-2" />
                   <span className="text-xs">Ingen bilde-URL tilgjengelig</span>
                 </div>
               )
            ) : (
              <div className="flex flex-col items-center text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => (item.file.url || item.file.storagePath) && window.open(item.file.url || item.file.storagePath, '_blank')}>
                <FileText className="h-12 w-12 mb-2" />
                <span className="text-xs font-medium">{item.file.originalName || "Dokument"}</span>
                <span className="text-[10px] mt-1 text-slate-500 uppercase">{item.file.fileType.split('/')[1] || "FIL"}</span>
              </div>
            )}
          </div>

          {/* Title & Description */}
          <div className="grid gap-2">
            <Label htmlFor="title">Tittel</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Kategori</Label>
            <Input 
              id="category" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              placeholder="F.eks. Skade, Utbedring, Befaring"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Hendelsesdato</Label>
              <DatePicker
                date={legalDate}
                setDate={setLegalDate}
                placeholder="Velg dato"
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Klokkeslett</Label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Read-only Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground bg-slate-50 p-3 rounded-md">
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <Lock className="w-3 h-3 mr-1" /> Registrert
              </span>
              {format(item.createdAt, "dd.MM.yyyy HH:mm")}
            </div>
            <div 
              className={cn(
                "group relative transition-colors rounded p-1 -m-1",
                item.originalDate && "hover:bg-blue-50 cursor-pointer"
              )}
              onClick={() => {
                if (item.originalDate) {
                  setLegalDate(item.originalDate);
                  setTime(format(item.originalDate, "HH:mm"));
                  toast.success("Dato og tid kopiert fra fil");
                }
              }}
              title={item.originalDate ? "Klikk for å bruke denne datoen" : undefined}
            >
              <span className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <Lock className="w-3 h-3 mr-1" /> Fil-dato
                {item.originalDate && (
                  <Copy className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                )}
              </span>
              {item.originalDate ? format(item.originalDate, "dd.MM.yyyy HH:mm") : "-"}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include" 
              checked={includeInReport} 
              onCheckedChange={(c) => setIncludeInReport(!!c)} 
            />
            <Label htmlFor="include">Inkluder i juridisk rapport</Label>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Lagrer..." : "Lagre endringer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
