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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, ExternalLink } from "lucide-react";

interface AdminContributionListProps {
  initialContributions: any[];
}

export function AdminContributionList({ initialContributions }: AdminContributionListProps) {
  const [contributions, setContributions] = useState(initialContributions);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: ContributionStatus) => {
    setUpdatingId(id);
    try {
      const res = await updateContributionStatus(id, newStatus);
      if (res.success) {
        setContributions(contributions.map(c => 
          c.id === id ? { ...c, status: newStatus } : c
        ));
        // toast.success("Status oppdatert");
      } else {
        // toast.error("Kunne ikke oppdatere status");
        alert("Kunne ikke oppdatere status");
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
                <TableCell className="max-w-xs truncate" title={contribution.description}>
                  {contribution.description}
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
                    value={contribution.status} 
                    onValueChange={(val) => handleStatusChange(contribution.id, val as ContributionStatus)}
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
