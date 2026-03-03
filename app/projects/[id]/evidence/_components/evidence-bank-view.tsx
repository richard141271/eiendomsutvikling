"use client";

import { useState } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Image as ImageIcon, Search, ArrowUpDown, Filter } from "lucide-react";
import { EditPanel } from "./edit-panel";

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

interface EvidenceBankViewProps {
  items: EvidenceItem[];
  onUpdateItem: (item: EvidenceItem) => void;
}

export default function EvidenceBankView({ items, onUpdateItem }: EvidenceBankViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof EvidenceItem | "evidenceNumber">("evidenceNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedItem, setSelectedItem] = useState<EvidenceItem | null>(null);

  const handleSort = (field: keyof EvidenceItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.evidenceNumber.toString().includes(searchTerm) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    // Handle dates
    if (valA instanceof Date) valA = valA.getTime();
    if (valB instanceof Date) valB = valB.getTime();

    // Handle nulls
    if (valA === null) return 1;
    if (valB === null) return -1;

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk i bevis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm">
             <Filter className="h-4 w-4 mr-2" />
             Filter
           </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] cursor-pointer" onClick={() => handleSort("evidenceNumber")}>
                Nr <ArrowUpDown className="inline h-3 w-3 ml-1" />
              </TableHead>
              <TableHead className="w-[60px]">Type</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("title")}>
                Tittel <ArrowUpDown className="inline h-3 w-3 ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("legalDate")}>
                Hendelsesdato <ArrowUpDown className="inline h-3 w-3 ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("createdAt")}>
                Registrert <ArrowUpDown className="inline h-3 w-3 ml-1" />
              </TableHead>
              <TableHead className="w-[100px]">Rapport</TableHead>
              <TableHead className="w-[80px]">Handling</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-50">
                <TableCell className="font-medium text-slate-500">
                  #{item.evidenceNumber}
                </TableCell>
                <TableCell>
                  {item.file.fileType.startsWith("image/") ? (
                    <ImageIcon className="h-4 w-4 text-slate-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-slate-500" />
                  )}
                </TableCell>
                <TableCell>
                  {item.category && (
                    <Badge variant="secondary" className="text-[10px] font-normal bg-slate-100 text-slate-600 border-slate-200">
                      {item.category}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {item.title}
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {item.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {item.legalDate ? (
                    <span className="font-medium">
                      {format(item.legalDate, "dd.MM.yyyy")}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Ikke satt</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(item.createdAt, "dd.MM.yyyy")}
                </TableCell>
                <TableCell>
                  {item.includeInReport ? (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200">
                      Ja
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400">
                      Nei
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)}>
                    Rediger
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
