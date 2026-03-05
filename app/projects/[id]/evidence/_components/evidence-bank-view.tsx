"use client";

import { useState } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Image as ImageIcon, Search, ArrowUpDown, Filter, AlertTriangle, Music, Film, Mail, MessageSquare, Landmark, Ruler } from "lucide-react";
import { EditPanel } from "./edit-panel";

interface EvidenceItem {
  id: string;
  evidenceNumber: number;
  title: string;
  description: string | null;
  fileId: string;
  legalDate: Date | string | null;
  originalDate: Date | string | null;
  includeInReport: boolean;
  legalPriority: number | null;
  category: string | null;
  sourceType: string | null;
  reliabilityLevel: string | null;
  missingLink?: boolean;
  missingLinkNote?: string | null;
  missingLinkResolved?: boolean;
  linkedEvidenceId?: string | null;
  file: {
    fileType: string;
    storagePath: string;
    url?: string;
  };
  createdAt: Date | string;
}

interface EvidenceBankViewProps {
  items: EvidenceItem[];
  allItems: EvidenceItem[];
  onUpdateItem: (item: EvidenceItem) => void;
}

export default function EvidenceBankView({ items, allItems, onUpdateItem }: EvidenceBankViewProps) {
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

    // Handle dates (Date object or string)
    if (valA instanceof Date) valA = valA.getTime();
    else if (typeof valA === 'string' && (sortField === 'legalDate' || sortField === 'createdAt' || sortField === 'originalDate')) {
        valA = new Date(valA).getTime();
    }
    
    if (valB instanceof Date) valB = valB.getTime();
    else if (typeof valB === 'string' && (sortField === 'legalDate' || sortField === 'createdAt' || sortField === 'originalDate')) {
        valB = new Date(valB).getTime();
    }

    // Handle nulls
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleUpdateItem = (updatedItem: EvidenceItem) => {
    onUpdateItem(updatedItem);
  };
  
  const getFileUrl = (path: string) => {
    if (path.startsWith("http") || path.startsWith("blob:")) return path;
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "project-assets";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return path; // Fallback
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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
                    <div className="h-10 w-10 rounded-md overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer" onClick={() => window.open(getFileUrl(item.file.url || item.file.storagePath), '_blank')}>
                      <img 
                        src={getFileUrl(item.file.url || item.file.storagePath)} 
                        alt="Bevis" 
                        className="h-full w-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-md flex items-center justify-center border border-slate-200 bg-slate-50 cursor-pointer" onClick={() => window.open(getFileUrl(item.file.url || item.file.storagePath), '_blank')}>
                      {(item.sourceType === "audio" || item.file.fileType.startsWith("audio/")) ? (
                        <Music className="h-5 w-5 text-slate-400" />
                      ) : (item.sourceType === "video" || item.file.fileType.startsWith("video/")) ? (
                        <Film className="h-5 w-5 text-slate-400" />
                      ) : (item.sourceType === "email" || item.file.fileType === "message/rfc822") ? (
                        <Mail className="h-5 w-5 text-slate-400" />
                      ) : (item.sourceType === "sms") ? (
                        <MessageSquare className="h-5 w-5 text-slate-400" />
                      ) : (item.sourceType === "public_document") ? (
                        <Landmark className="h-5 w-5 text-slate-400" />
                      ) : (item.sourceType === "measurement") ? (
                        <Ruler className="h-5 w-5 text-slate-400" />
                      ) : (
                        <FileText className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.missingLink && (
                        <div className="text-amber-600" title={item.missingLinkNote || "Mangler bevislink"}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    {item.category && (
                      <Badge variant="secondary" className="w-fit text-[10px] font-normal bg-slate-100 text-slate-600 border-slate-200">
                        {item.category}
                      </Badge>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {item.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.legalDate ? (
                    <span className="font-medium">
                      {format(new Date(item.legalDate), "dd.MM.yyyy")}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Ikke satt</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(item.createdAt), "dd.MM.yyyy")}
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
        availableEvidence={allItems}
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
