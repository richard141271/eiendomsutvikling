"use client";

import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateContributionStatus } from "@/app/actions/contribution";
import { ContributionStatus, ContributionType } from "@prisma/client";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ExternalLink } from "lucide-react";

interface AdminContributionListProps {
  initialContributions: any[];
}

export function AdminContributionList({ initialContributions }: AdminContributionListProps) {
  const [contributions, setContributions] = useState(initialContributions);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdate = async (id: string, updates: { status?: ContributionStatus, stars?: number }) => {
    setUpdatingId(id);
    try {
      // Find current contribution to get current values if not provided
      const current = contributions.find(c => c.id === id);
      if (!current) return;

      const res = await updateContributionStatus(
        id, 
        updates.status || current.status, 
        updates.stars
      );

      if (res.success && res.data) {
        // Update with the actual returned data from server (which includes auto-awarded stars)
        // @ts-ignore - Prisma return type mismatch with simple state
        setContributions(contributions.map(c => 
          c.id === id ? { ...c, ...res.data } : c
        ));
      } else {
        alert(res.error || "Kunne ikke oppdatere");
      }
    } catch (error) {
      console.error(error);
      alert("En feil oppstod");
    } finally {
      setUpdatingId(null);
    }
  };

  const getTypeLabel = (type: ContributionType) => {
    switch (type) {
      case "IMPROVEMENT_UNIT": return "Forbedring (Leilighet)";
      case "IMPROVEMENT_PROPERTY": return "Forbedring (Uteområde)";
      case "OWN_INITIATIVE": return "Eget initiativ";
      default: return type;
    }
  };

  const getStatusColor = (status: ContributionStatus) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "REVIEWED": return "bg-blue-100 text-blue-800";
      case "COMPLETED": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Innsendte bidrag</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dato</TableHead>
              <TableHead>Leietaker</TableHead>
              <TableHead>Eiendom / Enhet</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Beskrivelse</TableHead>
              <TableHead>Bilde</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contributions.map((contribution) => (
              <TableRow key={contribution.id}>
                <TableCell>
                  {format(new Date(contribution.createdAt), "dd.MM.yyyy", { locale: nb })}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{contribution.tenant.name}</span>
                    <span className="text-xs text-muted-foreground">{contribution.tenant.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{contribution.unit.property.name}</span>
                    <span className="text-xs text-muted-foreground">{contribution.unit.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getTypeLabel(contribution.type)}</Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <Dialog>
                    <DialogTrigger asChild>
                      <span className="truncate block cursor-pointer hover:underline" title="Klikk for å lese hele beskrivelsen">
                        {contribution.description}
                      </span>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Beskrivelse av bidrag</DialogTitle>
                        <DialogDescription>
                          Fra {contribution.tenant.name} - {getTypeLabel(contribution.type)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 whitespace-pre-wrap">
                        {contribution.description}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell>
                  {contribution.imageUrl && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <div className="relative w-full h-[60vh]">
                          <Image 
                            src={contribution.imageUrl} 
                            alt="Documentation" 
                            fill 
                            className="object-contain" 
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={String(contribution.starsAwarded || 0)}
                    onValueChange={(val) => handleUpdate(contribution.id, { stars: parseInt(val) })}
                    disabled={updatingId === contribution.id}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 ★</SelectItem>
                      <SelectItem value="1">1 ★</SelectItem>
                      <SelectItem value="2">2 ★</SelectItem>
                      <SelectItem value="3">3 ★</SelectItem>
                      <SelectItem value="4">4 ★</SelectItem>
                      <SelectItem value="5">5 ★</SelectItem>
                      <SelectItem value="6">6 ★</SelectItem>
                      <SelectItem value="7">7 ★</SelectItem>
                      <SelectItem value="8">8 ★</SelectItem>
                      <SelectItem value="9">9 ★</SelectItem>
                      <SelectItem value="10">10 ★</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select 
                    value={contribution.status} 
                    onValueChange={(val) => handleUpdate(contribution.id, { status: val as ContributionStatus })}
                    disabled={updatingId === contribution.id}
                  >
                    <SelectTrigger className={`w-[130px] ${getStatusColor(contribution.status)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Ny</SelectItem>
                      <SelectItem value="REVIEWED">Vurdert</SelectItem>
                      <SelectItem value="COMPLETED">Utført</SelectItem>
                    </SelectContent>
                  </Select>
                  {updatingId === contribution.id && <Loader2 className="w-3 h-3 animate-spin absolute ml-[-15px] mt-[10px]" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
