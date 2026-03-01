"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateProject } from "@/app/actions/projects";
import { Loader2, Gavel, Calendar } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ConvertProjectDialogProps {
  project: {
    id: string;
    title: string;
    description: string | null;
  };
}

export default function ConvertProjectDialog({ project }: ConvertProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    counterparty: "",
    caseSubject: "",
    category: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  const handleConvert = async () => {
    if (!formData.counterparty) {
        toast.error("Motpart må fylles ut");
        return;
    }

    setLoading(true);
    try {
      await updateProject(project.id, {
        reportType: "LEGAL",
        counterparty: formData.counterparty,
        caseSubject: formData.caseSubject,
        category: formData.category,
        caseStartDate: formData.startDate,
        caseEndDate: formData.endDate,
      });
      
      toast.success("Prosjekt konvertert til Juridisk modus");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Kunne ikke konvertere prosjekt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50">
          <Gavel className="w-4 h-4 mr-2" />
          Konverter til Juridisk Prosjekt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Konverter til Dokumentasjonsrapport</DialogTitle>
          <DialogDescription>
            Dette vil aktivere juridiske funksjoner som tidslinje, bevisbank og dato-overstyring.
            Eksisterende data beholdes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="counterparty">Motpart <span className="text-red-500">*</span></Label>
            <Input 
              id="counterparty" 
              placeholder="F.eks. Utleier AS / Forsikring" 
              value={formData.counterparty}
              onChange={e => setFormData({...formData, counterparty: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="caseSubject">Saken gjelder (kort)</Label>
            <Input 
              id="caseSubject" 
              placeholder="F.eks. Krav om erstatning etter lekkasje" 
              value={formData.caseSubject}
              onChange={e => setFormData({...formData, caseSubject: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Startdato</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.startDate && "text-muted-foreground")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, "PPP", { locale: nb }) : "Velg"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={formData.startDate} onSelect={d => setFormData({...formData, startDate: d})} initialFocus />
                  </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
                <Label>Sluttdato</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.endDate && "text-muted-foreground")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, "PPP", { locale: nb }) : "Velg"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={formData.endDate} onSelect={d => setFormData({...formData, endDate: d})} initialFocus />
                  </PopoverContent>
                </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Velg kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="construction">Byggteknisk</SelectItem>
                <SelectItem value="plumbing">Rør / VVS</SelectItem>
                <SelectItem value="electrical">Elektro</SelectItem>
                <SelectItem value="legal">Juridisk / Tvist</SelectItem>
                <SelectItem value="insurance">Forsikringssak</SelectItem>
                <SelectItem value="other">Annet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
          <Button onClick={handleConvert} disabled={loading || !formData.counterparty} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gavel className="mr-2 h-4 w-4" />}
            Konverter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
