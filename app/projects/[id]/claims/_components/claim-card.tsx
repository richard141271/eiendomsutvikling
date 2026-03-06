"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Edit, Trash2, Calendar, FileText, ExternalLink, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { deleteClaim, updateClaim } from "@/app/actions/claims";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClaimCardProps {
  claim: any;
  projectId: string;
  evidenceItems: any[];
  onUpdate: (claim: any) => void;
  onDelete: (id: string) => void;
}

export function ClaimCard({ claim, projectId, evidenceItems, onUpdate, onDelete }: ClaimCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteClaim(claim.id, projectId);
      if (res.success) {
        toast.success("Påstand slettet");
        onDelete(claim.id);
      } else {
        toast.error(res.error || "Kunne ikke slette påstand");
      }
    } catch (error) {
      toast.error("Feil ved sletting");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await updateClaim(claim.id, { status: newStatus as any });
      if (res.success && res.data) {
        onUpdate({ ...claim, status: newStatus }); // Optimistic update
        toast.success("Status oppdatert");
      } else {
        toast.error("Kunne ikke oppdatere status");
      }
    } catch (error) {
      toast.error("Feil ved oppdatering");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UNVERIFIED": return "bg-slate-100 text-slate-700 border-slate-200";
      case "SUPPORTED": return "bg-green-100 text-green-700 border-green-200";
      case "CONTRADICTED": return "bg-red-100 text-red-700 border-red-200";
      case "PARTLY_TRUE": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-slate-100";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "UNVERIFIED": return "Uverifisert";
      case "SUPPORTED": return "Støttet";
      case "CONTRADICTED": return "Motbevist";
      case "PARTLY_TRUE": return "Delvis sant";
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "UNVERIFIED": return <HelpCircle className="w-3 h-3 mr-1" />;
      case "SUPPORTED": return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case "CONTRADICTED": return <XCircle className="w-3 h-3 mr-1" />;
      case "PARTLY_TRUE": return <AlertTriangle className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  // Group evidence by role
  const sourceEvidence = claim.evidenceLinks?.filter((l: any) => l.role === "SOURCE") || [];
  const supportingEvidence = claim.evidenceLinks?.filter((l: any) => l.role === "SUPPORTS") || [];
  const contradictingEvidence = claim.evidenceLinks?.filter((l: any) => l.role === "CONTRADICTS") || [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${getStatusColor(claim.status)} flex items-center`}>
                {getStatusIcon(claim.status)}
                {getStatusLabel(claim.status)}
              </Badge>
              {claim.sourceDate && (
                <span className="text-xs text-slate-500 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(new Date(claim.sourceDate), "d. MMM yyyy", { locale: nb })}
                </span>
              )}
            </div>
            <CardTitle className="text-lg leading-tight font-medium">
              "{claim.statement}"
            </CardTitle>
            {claim.source && (
              <CardDescription className="flex items-center text-xs">
                Kilde: {claim.source}
              </CardDescription>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Select value={claim.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNVERIFIED">Uverifisert</SelectItem>
                <SelectItem value="SUPPORTED">Støttet</SelectItem>
                <SelectItem value="CONTRADICTED">Motbevist</SelectItem>
                <SelectItem value="PARTLY_TRUE">Delvis sant</SelectItem>
              </SelectContent>
            </Select>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Meny</span>
                    <Edit className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toast.info("Redigering kommer snart")}>
                    Rediger
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-red-600">
                      Slett
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dette vil slette påstanden permanent. Bevisene som er koblet til vil ikke bli slettet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Slett
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-4 text-sm">
          {sourceEvidence.length > 0 && (
            <div className="flex flex-col gap-1 min-w-[150px]">
              <span className="text-xs font-semibold text-slate-500 uppercase">Dokumentert av</span>
              <div className="flex flex-col gap-1">
                {sourceEvidence.map((link: any) => (
                  <div key={link.id} className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs border border-blue-100">
                    <FileText className="w-3 h-3" />
                    <span>B-{link.evidence?.evidenceNumber}</span>
                    <span className="truncate max-w-[100px]">{link.evidence?.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {supportingEvidence.length > 0 && (
            <div className="flex flex-col gap-1 min-w-[150px]">
              <span className="text-xs font-semibold text-slate-500 uppercase">Støttes av</span>
              <div className="flex flex-col gap-1">
                {supportingEvidence.map((link: any) => (
                  <div key={link.id} className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-xs border border-green-100">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>B-{link.evidence?.evidenceNumber}</span>
                    <span className="truncate max-w-[100px]">{link.evidence?.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {contradictingEvidence.length > 0 && (
            <div className="flex flex-col gap-1 min-w-[150px]">
              <span className="text-xs font-semibold text-slate-500 uppercase">Motbevises av</span>
              <div className="flex flex-col gap-1">
                {contradictingEvidence.map((link: any) => (
                  <div key={link.id} className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-xs border border-red-100">
                    <XCircle className="w-3 h-3" />
                    <span>B-{link.evidence?.evidenceNumber}</span>
                    <span className="truncate max-w-[100px]">{link.evidence?.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
