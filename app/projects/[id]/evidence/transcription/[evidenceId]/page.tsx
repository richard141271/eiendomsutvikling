import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import TranscriptionEditorClient from "./transcription-editor-client";

export default async function EvidenceTranscriptionPage({
  params,
}: {
  params: { id: string; evidenceId: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projectId = params.id;
  const evidenceId = params.evidenceId;

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { property: { select: { ownerId: true } } },
  });
  if (!project) notFound();

  const isPrivileged = ["OWNER", "ADMIN", "MANAGER"].includes(dbUser.role as any);
  const isOwner = project.property?.ownerId ? project.property.ownerId === dbUser.id : false;
  if (!isPrivileged && !isOwner) notFound();

  const evidence = await (prisma as any).evidenceItem.findUnique({
    where: { id: evidenceId },
    include: { file: true },
  });

  if (!evidence || evidence.projectId !== projectId || !evidence.file?.storagePath) notFound();

  const bucketName =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
    "project-assets";

  let signedUrl: string | null = null;
  try {
    const { data } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(evidence.file.storagePath, 60 * 60);
    signedUrl = data?.signedUrl ?? null;
  } catch {
    signedUrl = null;
  }

  return (
    <TranscriptionEditorClient
      projectId={projectId}
      evidenceId={evidenceId}
      title={String(evidence.title || "")}
      fileType={String(evidence.file.fileType || "")}
      fileUrl={signedUrl || String(evidence.file.storagePath)}
      fileOriginalName={String(evidence.file.originalName || "opptak")}
      initialTranscription={String(evidence.file.extractedText || "")}
    />
  );
}
