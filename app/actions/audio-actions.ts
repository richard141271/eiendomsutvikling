"use server";

import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function uploadAndTranscribeAudio(formData: FormData, protocolId: string) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No file provided");
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized");
    }

    // 1. Upload to Supabase
    const originalName = file.name || "audio.webm";
    const fileExt = originalName.split('.').pop() || "webm";
    const fileName = `audio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `inspection-audio/${protocolId}/${fileName}`;
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'property-images';

    const { error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || `audio/${fileExt}`
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // 2. Transcribe with OpenAI
    let transcriptionText = "";
    
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log("Starting OpenAI transcription...");
        console.log("File type:", file.type, "Size:", file.size);
        
        // We need to pass the file to OpenAI. 
        // Since we are in a server action, 'file' is a File object which OpenAI SDK accepts.
        const transcription = await openai.audio.transcriptions.create({
          file: file,
          model: "whisper-1",
          language: "no", // Norwegian
        });
        transcriptionText = transcription.text;
        console.log("Transcription successful:", transcriptionText.substring(0, 50) + "...");
      } catch (aiError: any) {
        console.error("OpenAI Transcription error:", aiError);
        transcriptionText = `(Transkripsjon feilet: ${aiError.message || "Ukjent feil"})`;
      }
    } else {
      console.warn("Missing OPENAI_API_KEY");
      transcriptionText = "(Transkripsjon ikke tilgjengelig - mangler API-nøkkel)";
    }

    console.log("Saving audio URL:", publicUrl);

    // 3. Update Database
    const updatedProtocol = await prisma.inspectionProtocol.update({
      where: { id: protocolId },
      data: {
        // @ts-ignore - audioUrl exists in schema but might be missing in generated types
        audioUrl: publicUrl,
        transcription: transcriptionText,
      },
      select: {
        contractId: true
      }
    });
    
    if (updatedProtocol.contractId) {
      revalidatePath(`/dashboard/contracts/${updatedProtocol.contractId}`, 'page');
    }
    
    return { success: true, transcription: transcriptionText, audioUrl: publicUrl };

  } catch (error: any) {
    console.error("Action error:", error);
    // Return a more descriptive error
    return { success: false, error: error.message || "Ukjent feil under lagring av lydfil" };
  }
}
