"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { createClaim, linkEvidenceToClaim } from "@/app/actions/claims";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface EvidenceItem {
  id: string;
  title: string;
  evidenceNumber: number;
  originalDate?: string;
}

interface ClaimDialogProps {
  projectId: string;
  evidenceItems: EvidenceItem[];
  onSuccess: (claim: any) => void;
}

export function ClaimDialog({ projectId, evidenceItems, onSuccess }: ClaimDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [statement, setStatement] = useState("");
  const [source, setSource] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  
  const [selectedEvidence, setSelectedEvidence] = useState<{id: string, role: string}[]>([]);
  const [evidenceSearch, setEvidenceSearch] = useState("");

  const handleSave = async () => {
    if (!statement) {
      toast.error("Påstand må fylles ut");
      return;
    }

    // Validation: At least 1 source evidence
    const hasSource = selectedEvidence.some(e => e.role === "SOURCE");
    if (!hasSource) {
      toast.error("Du må velge minst ett bevis som KILDE (Dokumenterer påstand)");
      return;
    }

    try {
      setLoading(true);
      
      // 1. Create Claim
      const res = await createClaim({
        projectId,
        statement,
        source,
        sourceDate: sourceDate ? new Date(sourceDate) : null,
        status: "UNVERIFIED"
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Kunne ikke opprette påstand");
      }

      const newClaimId = res.data.id;

      // 2. Link Evidence
      for (const link of selectedEvidence) {
        await linkEvidenceToClaim(newClaimId, link.id, link.role as any, projectId);
      }

      toast.success("Påstand opprettet");
      
      // Construct the claim object for optimistic update (or refresh)
      // The parent will re-fetch or we can construct it here.
      // For now, let's just close and refresh via router in parent or here?
      // The parent passed onSuccess which likely updates local state.
      // But we need the full object with links.
      // Let's just refresh page? No, better UX to add to list.
      // But we don't have the full object structure here easily (evidence details).
      // Let's just reload the page for simplicity in this iteration, or fetch the new claim.
      
      // Actually, onSuccess expects a claim object.
      // Let's just pass the basic object and let the parent re-fetch if needed.
      // Or make onSuccess accept void and trigger router.refresh() in parent?
      // The parent `handleClaimCreated` adds to state.
      // If we want to show the links immediately, we need to construct them.
      
      const fullClaim = {
        ...res.data,
        evidenceLinks: selectedEvidence.map(link => ({
          evidenceId: link.id,
          role: link.role,
          evidence: evidenceItems.find(e => e.id === link.id)
        }))
      };
      
      onSuccess(fullClaim);
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStatement("");
    setSource("");
    setSourceDate("");
    setSelectedEvidence([]);
  };

  const toggleEvidence = (evidenceId: string, role: string) => {
    // If already selected with same role, remove.
    // If selected with different role, update.
    // If not selected, add.
    
    const existing = selectedEvidence.find(e => e.id === evidenceId);
    if (existing) {
      if (existing.role === role) {
        setSelectedEvidence(prev => prev.filter(e => e.id !== evidenceId));
      } else {
        setSelectedEvidence(prev => prev.map(e => e.id === evidenceId ? { ...e, role } : e));
      }
    } else {
      setSelectedEvidence(prev => [...prev, { id: evidenceId, role }]);
    }
  };

  const filteredEvidence = evidenceItems.filter(e => 
    e.title.toLowerCase().includes(evidenceSearch.toLowerCase()) || 
    e.evidenceNumber.toString().includes(evidenceSearch)
  );

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ny påstand
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrer ny påstand</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Påstand (hva hevder motparten?)</Label>
            <Textarea 
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="F.eks. 'Det var ikke vasket ved utflytting'"
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kilde (hvor står dette?)</Label>
              <Input 
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="F.eks. E-post fra leietaker"
              />
            </div>
            <div className="space-y-2">
              <Label>Dato for påstand</Label>
              <Input 
                type="date"
                value={sourceDate}
                onChange={(e) => setSourceDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Koble til bevis (Minst 1 kildebevis påkrevd)</Label>
            <div className="border rounded-md p-3 bg-slate-50 min-h-[200px]">
              <div className="relative mb-3">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Søk etter bevis..." 
                  value={evidenceSearch}
                  onChange={(e) => setEvidenceSearch(e.target.value)}
                  className="pl-8 bg-white"
                />
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {filteredEvidence.map(item => {
                  const selection = selectedEvidence.find(e => e.id === item.id);
                  return (
                    <div key={item.id} className="flex flex-col gap-2 p-2 bg-white rounded border hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="font-mono text-xs bg-slate-100 px-1 rounded">B-{item.evidenceNumber}</span>
                          <span className="truncate text-sm font-medium" title={item.title}>{item.title}</span>
                        </div>
                        {selection && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => setSelectedEvidence(prev => prev.filter(e => e.id !== item.id))}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button 
                          variant={selection?.role === "SOURCE" ? "default" : "outline"} 
                          size="sm" 
                          className={`flex-1 h-7 text-[10px] ${selection?.role === "SOURCE" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                          onClick={() => toggleEvidence(item.id, "SOURCE")}
                        >
                          Kilde
                        </Button>
                        <Button 
                          variant={selection?.role === "SUPPORTS" ? "default" : "outline"} 
                          size="sm" 
                          className={`flex-1 h-7 text-[10px] ${selection?.role === "SUPPORTS" ? "bg-green-600 hover:bg-green-700" : ""}`}
                          onClick={() => toggleEvidence(item.id, "SUPPORTS")}
                        >
                          Støtter
                        </Button>
                        <Button 
                          variant={selection?.role === "CONTRADICTS" ? "default" : "outline"} 
                          size="sm" 
                          className={`flex-1 h-7 text-[10px] ${selection?.role === "CONTRADICTS" ? "bg-red-600 hover:bg-red-700" : ""}`}
                          onClick={() => toggleEvidence(item.id, "CONTRADICTS")}
                        >
                          Motbeviser
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Selected Summary */}
            {selectedEvidence.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedEvidence.map(sel => {
                  const ev = evidenceItems.find(e => e.id === sel.id);
                  if (!ev) return null;
                  let color = "bg-slate-100 text-slate-700";
                  if (sel.role === "SOURCE") color = "bg-blue-100 text-blue-800 border-blue-200";
                  if (sel.role === "SUPPORTS") color = "bg-green-100 text-green-800 border-green-200";
                  if (sel.role === "CONTRADICTS") color = "bg-red-100 text-red-800 border-red-200";
                  
                  return (
                    <div key={sel.id} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${color}`}>
                      <span className="font-bold">{sel.role === "SOURCE" ? "KILDE" : sel.role === "SUPPORTS" ? "STØTTER" : "MOTBEVISER"}:</span>
                      <span>B-{ev.evidenceNumber}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Lagrer..." : "Lagre påstand"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
