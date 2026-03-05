"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/file-upload";
import { createEvidenceItem, updateEvidenceItem } from "@/app/actions/evidence";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface NewEvidenceDialogProps {
  projectId: string;
  onSuccess?: (item: any) => void;
}

export default function NewEvidenceDialog({ projectId, onSuccess }: NewEvidenceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detectedFileType, setDetectedFileType] = useState<string>("");
  const [detectedSourceType, setDetectedSourceType] = useState<string>("");
  const [uploadedEvidenceId, setUploadedEvidenceId] = useState<string | null>(null);

  const router = useRouter();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form on close
      setUrl(null);
      setTitle("");
      setDescription("");
      setDetectedFileType("");
      setDetectedSourceType("");
      setUploadedEvidenceId(null);
    }
  };

  const calculateChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleBeforeUpload = async (file: File): Promise<boolean> => {
    try {
      const hash = await calculateChecksum(file);
      const res = await fetch(`/api/projects/${projectId}/evidence/check-duplicate`, {
        method: 'POST',
        body: JSON.stringify({ hash }),
      });
      
      if (!res.ok) return true; 
      
      const data = await res.json();
      if (data.exists) {
        return window.confirm(
          `Denne filen (${file.name}) ligger allerede i prosjektet.\n\nEr du sikker på at du vil laste den opp på nytt?`
        );
      }
      
      return true;
    } catch (error) {
      console.error("Duplicate check failed:", error);
      return true; 
    }
  };

  const handleSave = async () => {
    if (!url) {
      toast.error("Du må laste opp en fil");
      return;
    }

    if (!title) {
      toast.error("Du må skrive en tittel");
      return;
    }

    try {
      setLoading(true);

      // Use detected types or fallback to extension-based detection
      let fileType = detectedFileType;
      let sourceType = detectedSourceType;

      if (!fileType) {
        // Fallback logic
        const ext = url.split('.').pop()?.toLowerCase();
        fileType = "application/octet-stream";
        sourceType = "document"; // Default source type
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
          fileType = "image/jpeg";
          sourceType = "photo";
        } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) {
          fileType = "video/mp4";
          sourceType = "video";
        } else if (ext === 'pdf') {
          fileType = "application/pdf";
          sourceType = "document";
        } else if (['doc', 'docx'].includes(ext || '')) {
          fileType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          sourceType = "document";
        } else if (['xls', 'xlsx'].includes(ext || '')) {
          fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          sourceType = "document";
        } else if (['eml', 'msg'].includes(ext || '')) {
          fileType = "message/rfc822";
          sourceType = "email";
        } else if (['html', 'htm'].includes(ext || '')) {
          fileType = "text/html";
          sourceType = "document";
        }
      }

      if (uploadedEvidenceId) {
        // Update existing item created by upload
        await updateEvidenceItem(uploadedEvidenceId, {
          title,
          description,
          sourceType,
          reliabilityLevel: "primary"
        });
        
        // We need to fetch the full item to pass to onSuccess
        // But since we don't have it here, we'll just pass a partial object or rely on refresh
        // Ideally we would fetch it, but let's trust refresh
      } else {
        // Create new item (fallback if upload didn't create one, though it should have)
        await createEvidenceItem({
          projectId,
          url,
          title,
          description,
          fileType,
          originalName: title,
          sourceType,
          reliabilityLevel: "primary"
        });
      }

      toast.success(uploadedEvidenceId ? "Bevis oppdatert" : "Bevis opprettet");
      
      if (onSuccess) {
        onSuccess(null); // Just trigger refresh
      }
      
      router.refresh();
      handleOpenChange(false);
    } catch (error) {
      console.error("Error creating evidence:", error);
      toast.error("Kunne ikke opprette bevis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Nytt bevis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Legg til nytt bevis</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <FileUpload 
              value={url} 
              endpoint={`/api/projects/${projectId}/evidence/upload`}
              onBeforeUpload={handleBeforeUpload}
              onChange={(newUrl) => {
                setUrl(newUrl);
                // Auto-set title if empty and url has a name
                if (!title && newUrl) {
                  const fileName = newUrl.split('/').pop();
                  if (fileName) setTitle(fileName);
                }
              }}
              onUploadComplete={(data) => {
                console.log("Upload complete:", data);
                if (data.evidenceId) {
                  setUploadedEvidenceId(data.evidenceId);
                }
                if (data.originalName && !title) {
                  setTitle(data.originalName);
                }
                if (data.fileType) {
                  setDetectedFileType(data.fileType);
                  // Map fileType to sourceType
                  if (data.fileType.startsWith("image/")) setDetectedSourceType("photo");
                  else if (data.fileType.startsWith("video/")) setDetectedSourceType("video");
                  else if (data.fileType === "message/rfc822") setDetectedSourceType("email");
                  else setDetectedSourceType("document");
                }
                if (data.metadata?.extractedText && !description) {
                  // Optional: Pre-fill description with first 200 chars of text?
                  // Maybe too intrusive. Let's stick to basics.
                }
              }}
              label="Last opp fil"
              accept="*"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Tittel</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="F.eks. Bilde av skade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse (valgfritt)</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Nærmere beskrivelse av beviset..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={loading || !url || !title}>
            {loading ? "Lagrer..." : "Lagre bevis"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
