"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Filter, ArrowUpDown, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ClaimDialog } from "./claim-dialog";
import { ClaimCard } from "./claim-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClaimsClientProps {
  projectId: string;
  initialClaims: any[];
  evidenceItems: any[];
}

export default function ClaimsClient({ projectId, initialClaims, evidenceItems }: ClaimsClientProps) {
  const [claims, setClaims] = useState(initialClaims);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "contradicted">("date");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleClaimCreated = (newClaim: any) => {
    setClaims([newClaim, ...claims]);
  };

  const handleClaimUpdated = (updatedClaim: any) => {
    setClaims(claims.map(c => c.id === updatedClaim.id ? updatedClaim : c));
  };

  const handleClaimDeleted = (claimId: string) => {
    setClaims(claims.filter(c => c.id !== claimId));
  };

  const filteredClaims = claims
    .filter(claim => {
      const matchesSearch = claim.statement.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (claim.source && claim.source.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "contradicted") {
        // Count contradictions
        const countA = a.evidenceLinks.filter((l: any) => l.role === "CONTRADICTS").length;
        const countB = b.evidenceLinks.filter((l: any) => l.role === "CONTRADICTS").length;
        return countB - countA; // Descending
      }
      // Default date sort
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input 
            placeholder="Søk i påstander..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[300px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="UNVERIFIED">Uverifisert</SelectItem>
              <SelectItem value="SUPPORTED">Støttet</SelectItem>
              <SelectItem value="CONTRADICTED">Motbevist</SelectItem>
              <SelectItem value="PARTLY_TRUE">Delvis sant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
           <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sortering" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Nyeste først</SelectItem>
              <SelectItem value="contradicted">Mest motbeviste</SelectItem>
            </SelectContent>
          </Select>
          
          <ClaimDialog 
            projectId={projectId} 
            evidenceItems={evidenceItems}
            onSuccess={handleClaimCreated}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredClaims.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-slate-900">Ingen påstander funnet</h3>
            <p className="text-slate-500 mt-1">Legg til en ny påstand for å komme i gang.</p>
          </div>
        ) : (
          filteredClaims.map(claim => (
            <ClaimCard 
              key={claim.id} 
              claim={claim} 
              projectId={projectId}
              evidenceItems={evidenceItems}
              onUpdate={handleClaimUpdated}
              onDelete={handleClaimDeleted}
            />
          ))
        )}
      </div>
    </div>
  );
}
