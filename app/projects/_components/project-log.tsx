
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { addProjectEntry, deleteProjectEntry, updateProjectEntry, toggleEntryReportStatus } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload"; // Using existing component
import { useState } from "react";
import { Loader2, Camera, Send, FileText, Image as ImageIcon, Trash2, Pencil, X, Check, Maximize2, RotateCw } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Entry {
  id: string;
  type: string;
  content: string | null;
  imageUrl: string | null;
  includeInReport: boolean;
  rotation: number;
  createdAt: Date;
}

interface ProjectLogProps {
  projectId: string;
  entries: Entry[];
}

// Separate client component for the form to handle state
function LogForm({ projectId, onEntryAdded }: { projectId: string, onEntryAdded: () => void }) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"TEXT" | "IMAGE">("TEXT");

  async function handleSubmit() {
    if (!content && !imageUrl) return;
    
    setLoading(true);
    try {
      await addProjectEntry({
        projectId,
        type: imageUrl ? "IMAGE" : "NOTE", // Simplified type logic
        content,
        imageUrl: imageUrl || undefined,
        includeInReport: true // Default to true as per user flow hint "Checkmark: [ ] Ta med i rapport"
      });
      setContent("");
      setImageUrl(null);
      setMode("TEXT");
      onEntryAdded();
    } catch (error) {
      console.error(error);
      alert("Kunne ikke lagre loggføring");
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
      </div>

      <div className="space-y-4">
        {mode === "IMAGE" && (
           <ImageUpload 
             value={imageUrl} 
             onChange={setImageUrl} 
             label="Ta bilde eller velg fra arkiv"
           />
        )}
        
        <Textarea 
          placeholder={mode === "IMAGE" ? "Beskrivelse av bildet..." : "Skriv et notat..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />

        <div className="flex items-center space-x-2">
           <Checkbox id="include" defaultChecked />
           <Label htmlFor="include">Ta med i rapport</Label>
        </div>

        <Button onClick={handleSubmit} disabled={loading || (!content && !imageUrl)} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Lagre loggføring
        </Button>
      </div>
    </div>
  );
}

// Main Log Component

export default function ProjectLog({ projectId, entries }: ProjectLogProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  async function handleToggleReport(id: string, current: boolean) {
    await toggleEntryReportStatus(id, !current);
    router.refresh();
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
        {entries.length === 0 && <p className="text-center text-slate-500 py-8">Ingen loggføringer enda.</p>}
        
        {entries.map((entry) => (
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
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </>
                   )}
                   <Checkbox 
                     id={`include-${entry.id}`} 
                     checked={entry.includeInReport} 
                     onCheckedChange={() => handleToggleReport(entry.id, entry.includeInReport)}
                   />
                   <Label htmlFor={`include-${entry.id}`} className="text-xs text-slate-500 font-normal">Rapport</Label>
                </div>
              </div>
              
              {editingId === entry.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea 
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)} 
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={loading}>
                      <X className="w-4 h-4 mr-1" /> Avbryt
                    </Button>
                    <Button size="sm" onClick={() => saveEditing(entry.id)} disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                      Lagre
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {entry.content && <p className="text-sm text-slate-800 whitespace-pre-wrap mb-2">{entry.content}</p>}
                  
                  {entry.imageUrl && (
                    <div className="space-y-2">
                      <div 
                        className="relative h-48 w-full rounded-md overflow-hidden bg-slate-100 border cursor-pointer group"
                        onClick={() => setFullScreenImage(entry.imageUrl)}
                      >
                        <Image 
                          src={entry.imageUrl} 
                          alt="Log image" 
                          fill 
                          className="object-cover transition-transform duration-300 group-hover:scale-105" 
                          style={{ transform: `rotate(${entry.rotation || 0}deg)` }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 drop-shadow-md" />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRotate(entry.id, entry.rotation || 0)}
                        className="w-full"
                      >
                        <RotateCw className="w-4 h-4 mr-2" />
                        Roter bilde
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
