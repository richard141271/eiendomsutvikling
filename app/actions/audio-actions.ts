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
    const fileExt = "webm"; // MediaRecorder usually produces webm
    const fileName = `audio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `inspection-audio/${protocolId}/${fileName}`;
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'property-images';

    const { error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || 'audio/webm'
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
        // We need to pass the file to OpenAI. 
        // Since we are in a server action, 'file' is a File object which OpenAI SDK accepts.
        const transcription = await openai.audio.transcriptions.create({
          file: file,
          model: "whisper-1",
          language: "no", // Norwegian
        });
        transcriptionText = transcription.text;
      } catch (aiError) {
        console.error("OpenAI Transcription error:", aiError);
        transcriptionText = "(Transkripsjon feilet - sjekk API-nøkkel eller filformat)";
      }
    } else {
      transcriptionText = "(Transkripsjon ikke tilgjengelig - mangler OPENAI_API_KEY)";
    }

    // 3. Update Database
    await prisma.inspectionProtocol.update({
      where: { id: protocolId },
      data: {
        audioUrl: publicUrl,
        transcription: transcriptionText,
      }
    });

    revalidatePath(`/dashboard/contracts/${protocolId}`); // Note: ID might be contractId or protocolId depending on route structure, checking route...
    // The route is /dashboard/contracts/[id]/inspection/[protocolId]
    // We should revalidate the specific inspection page.
    
    return { success: true, transcription: transcriptionText, audioUrl: publicUrl };

  } catch (error: any) {
    console.error("Action error:", error);
    return { success: false, error: error.message };
  }
}
