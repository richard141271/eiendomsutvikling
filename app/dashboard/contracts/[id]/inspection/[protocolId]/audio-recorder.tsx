"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, Loader2, Play, Pause, Save, Trash2 } from "lucide-react";
import { uploadAndTranscribeAudio } from "@/app/actions/audio-actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  protocolId: string;
  existingAudioUrl?: string | null;
  existingTranscription?: string | null;
  disabled?: boolean;
}

export function AudioRecorder({ protocolId, existingAudioUrl, existingTranscription, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transcription, setTranscription] = useState(existingTranscription || "");
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl || "");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Kunne ikke starte opptak. Sjekk at du har gitt tilgang til mikrofonen.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setElapsedTime(0);
  };

  const saveRecording = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      // Append file with a filename so the server sees it as a file
      formData.append("file", audioBlob, "recording.webm");

      const result = await uploadAndTranscribeAudio(formData, protocolId);

      if (result.success) {
        setTranscription(result.transcription || "");
        setAudioUrl(result.audioUrl || "");
        setAudioBlob(null); // Clear blob after save
        router.refresh();
      } else {
        alert("Feil ved lagring: " + result.error);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Noe gikk galt under lagring.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="h-5 w-5 text-blue-600" />
          Lydopptak & Referat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!audioUrl && !audioBlob && (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-200 rounded-lg bg-white/50">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled || isUploading}
              className={cn("w-full sm:w-auto min-w-[200px] transition-all", isRecording && "animate-pulse")}
            >
              {isRecording ? (
                <>
                  <Square className="mr-2 h-4 w-4 fill-current" />
                  Stopp opptak ({formatTime(elapsedTime)})
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start opptak av runden
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Ta opp samtalen under runden for å generere et automatisk referat.
            </p>
          </div>
        )}

        {audioBlob && !audioUrl && (
          <div className="flex flex-col gap-4 p-4 bg-white rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="font-medium">Opptak ferdig ({formatTime(elapsedTime)})</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={discardRecording} disabled={isUploading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Slett
                </Button>
                <Button size="sm" onClick={saveRecording} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Lagre & Transkriber
                </Button>
              </div>
            </div>
            <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
          </div>
        )}

        {audioUrl && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">Opptak</h3>
              <audio controls src={audioUrl} className="w-full" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">Transkribert referat</h3>
              <div className="p-4 bg-white rounded-lg border min-h-[100px] whitespace-pre-wrap text-sm">
                {transcription || "Ingen transkripsjon tilgjengelig."}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
