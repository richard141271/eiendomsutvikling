
"use client";

import { addProjectEntry, toggleEntryReportStatus } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload"; // Using existing component
import { useState, useRef } from "react";
import { Loader2, Camera, Send, FileText, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  type: string;
  content: string | null;
  imageUrl: string | null;
  includeInReport: boolean;
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
import { useRouter } from "next/navigation";

export default function ProjectLog({ projectId, entries }: ProjectLogProps) {
  const router = useRouter();

  async function handleToggleReport(id: string, current: boolean) {
    await toggleEntryReportStatus(id, !current);
    // Optimistic update handled by server action revalidate, but for instant feedback we rely on props update
  }

  return (
    <div>
      <LogForm projectId={projectId} onEntryAdded={() => router.refresh()} />

      <div className="space-y-4">
        {entries.length === 0 && <p className="text-center text-slate-500 py-8">Ingen loggføringer enda.</p>}
        
        {entries.map((entry) => (
          <div key={entry.id} className="border rounded-lg p-4 bg-white shadow-sm flex gap-4">
            <div className="flex-shrink-0 mt-1">
              {entry.type === "IMAGE" ? (
                <div className="bg-blue-100 p-2 rounded-full text-blue-600"><ImageIcon className="w-4 h-4" /></div>
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
                   <Checkbox 
                     id={`include-${entry.id}`} 
                     checked={entry.includeInReport} 
                     onCheckedChange={() => handleToggleReport(entry.id, entry.includeInReport)}
                   />
                   <Label htmlFor={`include-${entry.id}`} className="text-xs text-slate-500 font-normal">Rapport</Label>
                </div>
              </div>
              
              {entry.content && <p className="text-sm text-slate-800 whitespace-pre-wrap mb-2">{entry.content}</p>}
              
              {entry.imageUrl && (
                <div className="relative h-48 w-full rounded-md overflow-hidden bg-slate-100 border">
                  <Image src={entry.imageUrl} alt="Log image" fill className="object-cover" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
