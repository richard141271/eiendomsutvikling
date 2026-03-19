"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateEvidenceTranscription } from "@/app/actions/evidence";

export default function TranscriptionEditorClient({
  projectId,
  evidenceId,
  title,
  fileType,
  fileUrl,
  fileOriginalName,
  initialTranscription,
}: {
  projectId: string;
  evidenceId: string;
  title: string;
  fileType: string;
  fileUrl: string;
  fileOriginalName: string;
  initialTranscription: string;
}) {
  const [text, setText] = useState(initialTranscription || "");
  const [saving, setSaving] = useState(false);

  const isVideo = fileType.startsWith("video/");

  const downloadName = useMemo(() => {
    const raw = (fileOriginalName || title || "transkripsjon").trim();
    const base = raw.includes(".") ? raw.slice(0, raw.lastIndexOf(".")) : raw;
    return `${base || "transkripsjon"}.txt`;
  }, [fileOriginalName, title]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateEvidenceTranscription(evidenceId, text);
      toast.success("Transkripsjon lagret");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ukjent feil";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-6xl mx-auto p-4">
      <div className="flex flex-col gap-2 mb-4">
        <div className="text-sm text-muted-foreground">Prosjekt: {projectId}</div>
        <h1 className="text-xl font-semibold">{title || "Transkripsjon"}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Opptak</div>
            <Button variant="outline" onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")}>
              Åpne fil
            </Button>
          </div>
          {isVideo ? (
            <video controls src={fileUrl} className="w-full rounded-md border bg-black" />
          ) : (
            <audio controls src={fileUrl} className="w-full" />
          )}
          <div className="text-xs text-muted-foreground break-all">Bevis-ID: {evidenceId}</div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Transkripsjon</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload}>
                Last ned .txt
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Lagrer..." : "Lagre"}
              </Button>
            </div>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[520px] font-mono"
            placeholder="Transkripsjon vises her..."
          />
        </div>
      </div>
    </div>
  );
}
