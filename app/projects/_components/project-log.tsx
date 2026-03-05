"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  GripVertical, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  Check, 
  AlertCircle, 
  Clock,
  Camera,
  Send,
  Trash2,
  Pencil,
  X,
  Maximize2,
  RotateCw,
  FileIcon,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { FileUpload } from "@/components/file-upload";

import { 
  addProjectEntry, 
  addProjectEntries, 
  deleteProjectEntry, 
  updateProjectEntry, 
  toggleEntryReportStatus 
} from "@/app/actions/projects";

// Interfaces
interface Entry {
  id: string;
  type: string;
  content: string | null;
  imageUrl: string | null;
  includeInReport: boolean;
  rotation: number;
  createdAt: Date;
}

interface EvidenceLogItem {
  id: string;
  evidenceNumber: number;
  originalEntryId: string | null;
  title: string;
  description: string | null;
  legalDate: Date | null;
  originalDate: Date | null;
  createdAt: Date;
  sourceType: string | null;
  reliabilityLevel: string | null;
  file: {
    storagePath: string;
    url?: string;
    fileType: string;
  };
}

interface ProjectLogProps {
  projectId: string;
  entries: Entry[];
  evidenceItems?: EvidenceLogItem[];
}

// LogForm Component
function LogForm({ projectId, onEntryAdded }: { projectId: string, onEntryAdded: () => void }) {
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"TEXT" | "IMAGE" | "DOCUMENT">("TEXT");
  const [includeInReport, setIncludeInReport] = useState(true);

  async function handleSubmit() {
    if (!content && imageUrls.length === 0) return;
    
    setLoading(true);
    try {
      if (imageUrls.length > 0) {
        // Determine type based on mode
        const type = mode === "DOCUMENT" ? "DOCUMENT" : "IMAGE";
        
        await addProjectEntries({
          projectId,
          type,
          content,
          imageUrls,
          includeInReport,
        });
      } else {
        await addProjectEntry({
          projectId,
          type: "NOTE",
          content,
          includeInReport,
        });
      }
      setContent("");
      setImageUrls([]);
      setMode("TEXT");
      setIncludeInReport(true);
      onEntryAdded();
      toast.success("Loggføring lagret");
    } catch (error) {
      console.error(error);
      toast.error("Kunne ikke lagre loggføring");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-50 p-4 rounded-lg border mb-6">
      <div className="flex gap-2 mb-4">
        <Button 
          variant={mode === "TEXT" ? "default" : "outline"} 
          onClick={() => setMode("TEXT")}
          className="flex-1"
        >
          <FileText className="w-4 h-4 mr-2" /> Notat
        </Button>
        <Button 
          variant={mode === "IMAGE" ? "default" : "outline"} 
          onClick={() => setMode("IMAGE")}
          className="flex-1"
        >
          <Camera className="w-4 h-4 mr-2" /> Bilde
        </Button>
        <Button 
          variant={mode === "DOCUMENT" ? "default" : "outline"} 
          onClick={() => setMode("DOCUMENT")}
          className="flex-1"
        >
          <FileIcon className="w-4 h-4 mr-2" /> Dokument
        </Button>
      </div>

      <div className="space-y-4">
        {mode === "IMAGE" && (
           <ImageUpload 
             value={imageUrls[0] || null} 
             onChange={(url) => setImageUrls((prev) => [...prev, url])} 
             label="Ta bilde eller velg fra arkiv"
             allowMultiple
           />
        )}

        {mode === "DOCUMENT" && (
           <FileUpload 
             value={imageUrls[0] || null} 
             onChange={(url) => setImageUrls((prev) => [...prev, url])} 
             label="Last opp dokument (PDF, EML, etc.)"
             allowMultiple
             accept=".pdf,.eml,.msg,.docx,.xlsx,.txt,.html,.htm"
           />
        )}
        
        <Textarea 
          placeholder={mode === "IMAGE" ? "Beskrivelse av bildet..." : mode === "DOCUMENT" ? "Beskrivelse av dokumentet..." : "Skriv et notat..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />

        <div className="flex items-center space-x-2">
           <Checkbox 
             id="include" 
             checked={includeInReport}
             onCheckedChange={(c) => setIncludeInReport(!!c)}
           />
           <Label htmlFor="include">Ta med i rapport</Label>
        </div>

        <Button onClick={handleSubmit} disabled={loading || (!content && imageUrls.length === 0)} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Lagre loggføring
        </Button>
      </div>
    </div>
  );
}

// Main ProjectLog Component
export default function ProjectLog({ projectId, entries, evidenceItems }: ProjectLogProps) {
  const router = useRouter();
  const [localEntries, setLocalEntries] = useState(entries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Map originalEntryId to evidenceNumber for quick lookup
  const evidenceMap = new Map<string, number>();
  evidenceItems?.forEach(item => {
    if (item.originalEntryId) {
      evidenceMap.set(item.originalEntryId, item.evidenceNumber);
    }
  });

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  // Unified List Logic
  const unifiedItems = useMemo(() => {
    const combined = [
      ...localEntries.map(entry => ({
        type: 'ENTRY' as const,
        date: new Date(entry.createdAt),
        data: entry
      })),
      ...(evidenceItems || [])
        .filter(item => !item.originalEntryId) // Only show evidence not created from an entry
        .map(item => ({
          type: 'EVIDENCE' as const,
          date: item.legalDate ? new Date(item.legalDate) : (item.originalDate ? new Date(item.originalDate) : new Date(item.createdAt)),
          data: item
        }))
    ];
    
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [localEntries, evidenceItems]);

  async function handleToggleReport(id: string, current: boolean) {
    setLocalEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, includeInReport: !current } : entry
      )
    );

    try {
      await toggleEntryReportStatus(id, !current);
    } catch (error) {
      console.error("Failed to toggle entry report status", error);
      setLocalEntries(entries);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Er du sikker på at du vil slette denne loggføringen? Dette blir loggført.")) {
      try {
        await deleteProjectEntry(id);
        router.refresh();
      } catch (error) {
        alert("Kunne ikke slette loggføring");
      }
    }
  }

  function startEditing(entry: Entry) {
    setEditingId(entry.id);
    setEditContent(entry.content || "");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditContent("");
  }

  async function saveEditing(id: string) {
    if (!editContent.trim()) return;
    setLoading(true);
    try {
      await updateProjectEntry(id, { content: editContent });
      setEditingId(null);
      setEditContent("");
      router.refresh();
    } catch (error) {
      alert("Kunne ikke oppdatere loggføring");
    } finally {
      setLoading(false);
    }
  }

  async function handleRotate(id: string, currentRotation: number) {
    const newRotation = (currentRotation + 90) % 360;
    try {
      await updateProjectEntry(id, { rotation: newRotation });
      router.refresh();
    } catch (error) {
      alert("Kunne ikke rotere bildet");
    }
  }

  return (
    <div>
      <LogForm projectId={projectId} onEntryAdded={() => router.refresh()} />

      <Dialog open={!!fullScreenImage} onOpenChange={(open) => !open && setFullScreenImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none">
          <div className="relative h-[80vh] w-full bg-black/50 rounded-lg flex items-center justify-center">
             {fullScreenImage && (
               <Image 
                 src={fullScreenImage} 
                 alt="Full screen" 
                 fill 
                 className="object-contain" 
                 sizes="100vw"
               />
             )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {unifiedItems.length === 0 && <p className="text-center text-slate-500 py-8">Ingen loggføringer enda.</p>}
        
        {unifiedItems.map((item, index) => {
          if (item.type === 'ENTRY') {
            const entry = item.data as Entry;
            return (
              <div key={entry.id} className="border rounded-lg p-4 bg-white shadow-sm flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  {entry.type === "IMAGE" ? (
                    <div 
                      className={cn("bg-blue-100 p-2 rounded-full text-blue-600", entry.imageUrl && "cursor-pointer hover:bg-blue-200")}
                      onClick={() => entry.imageUrl && setFullScreenImage(entry.imageUrl)}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-2 rounded-full text-slate-600"><FileText className="w-4 h-4" /></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-slate-400">
                      {new Date(entry.createdAt).toLocaleString("no-NO")}
                      {evidenceMap.has(entry.id) && (
                        <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                          B-{String(evidenceMap.get(entry.id)).padStart(3, '0')}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center space-x-2">
                       {!editingId && (
                         <>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-6 w-6 text-slate-400 hover:text-blue-500"
                             onClick={() => startEditing(entry)}
                           >
                             <Pencil className="h-3 w-3" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-6 w-6 text-slate-400 hover:text-red-500"
                             onClick={() => handleDelete(entry.id)}
                           >
                             <Trash2 className="h-3 w-3" />
                           </Button>
                         </>
                       )}
                    </div>
                  </div>

                  {editingId === entry.id ? (
                    <div className="space-y-2">
                      <Textarea 
                        value={editContent} 
                        onChange={(e) => setEditContent(e.target.value)} 
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={cancelEditing}>Avbryt</Button>
                        <Button size="sm" onClick={() => saveEditing(entry.id)} disabled={loading}>Lagre</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {entry.content && <p className="text-sm text-slate-800 whitespace-pre-wrap">{entry.content}</p>}
                      
                      {entry.imageUrl && entry.type === "IMAGE" && (
                        <div className="mt-2 relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden border">
                           <Image 
                             src={entry.imageUrl} 
                             alt="Entry image" 
                             fill 
                             className="object-cover cursor-pointer hover:opacity-95 transition-opacity"
                             style={{ transform: `rotate(${entry.rotation}deg)` }}
                             onClick={() => setFullScreenImage(entry.imageUrl)}
                           />
                           <Button
                             variant="secondary"
                             size="icon"
                             className="absolute bottom-2 right-2 h-8 w-8 bg-white/80 hover:bg-white"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleRotate(entry.id, entry.rotation);
                             }}
                           >
                             <RotateCw className="h-4 w-4" />
                           </Button>
                        </div>
                      )}

                      {entry.imageUrl && entry.type === "DOCUMENT" && (
                         <div className="mt-2 flex items-center p-3 bg-slate-50 border rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => window.open(entry.imageUrl!, '_blank')}>
                            <FileIcon className="w-8 h-8 text-blue-500 mr-3" />
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-medium truncate">Dokument vedlegg</p>
                              <p className="text-xs text-slate-500">Klikk for å åpne</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                         </div>
                      )}
                    </>
                  )}
                  
                  <div className="mt-2 flex items-center justify-end">
                     <button 
                       onClick={() => handleToggleReport(entry.id, entry.includeInReport)}
                       className={cn(
                         "text-xs flex items-center px-2 py-1 rounded-full transition-colors",
                         entry.includeInReport 
                           ? "bg-green-100 text-green-700 hover:bg-green-200" 
                           : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                       )}
                     >
                       {entry.includeInReport ? (
                         <><Check className="w-3 h-3 mr-1" /> I rapport</>
                       ) : (
                         <><X className="w-3 h-3 mr-1" /> Ikke i rapport</>
                       )}
                     </button>
                  </div>
                </div>
              </div>
            );
          } else {
             // Evidence Item
             const evidence = item.data as EvidenceLogItem;
             return (
               <div key={evidence.id} className="border rounded-lg p-4 bg-slate-50 shadow-sm border-l-4 border-l-blue-400">
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-sm">BEVIS-{evidence.evidenceNumber}</span>
                     <span className="text-xs text-slate-500">{format(item.date, "d. MMM yyyy HH:mm", { locale: nb })}</span>
                     {evidence.sourceType && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase">{evidence.sourceType}</span>}
                   </div>
                 </div>
                 
                 <div className="flex gap-4">
                   {evidence.file.fileType.startsWith("image/") ? (
                     <div className="relative w-24 h-24 bg-slate-200 rounded-md overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => window.open(evidence.file.url || evidence.file.storagePath, '_blank')}>
                       <Image src={evidence.file.url || evidence.file.storagePath} alt={evidence.title} fill className="object-cover" />
                     </div>
                   ) : (
                     <div className="w-24 h-24 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={() => window.open(evidence.file.url || evidence.file.storagePath, '_blank')}>
                       <FileIcon className="w-8 h-8 text-slate-400" />
                     </div>
                   )}
                   
                   <div className="flex-1">
                     <h4 className="font-medium text-sm">{evidence.title}</h4>
                     {evidence.description && <p className="text-sm text-slate-600 mt-1">{evidence.description}</p>}
                     
                     <div className="mt-2 flex gap-2 items-center">
                        {evidence.reliabilityLevel && (
                          <span className="text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border">Styrke: {evidence.reliabilityLevel}</span>
                        )}
                        <span className="text-xs text-slate-400 italic">
                          (Lagt til via Bevisbank)
                        </span>
                     </div>
                   </div>
                 </div>
               </div>
             );
          }
        })}
      </div>
    </div>
  );
}
