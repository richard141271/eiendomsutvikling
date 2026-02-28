"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

export type LegalReportDraftData = {
  summary?: string;
  factualBasis?: string;
  includeTechnical?: boolean;
  technicalAnalysis?: string;
  includeLegal?: boolean;
  legalAssessment?: string;
  conclusion?: string;
  liabilityBasis?: string;
  legalNormReference?: string;
  causationAnalysis?: string;
  foreseeabilityAssessment?: string;
  economicLoss?: string;
  legalConclusion?: string;
};

export async function getLegalReportDraft(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // TODO: Add role check if needed

  const draft = await prisma.legalReportDraft.findUnique({
    where: { projectId },
  });

  return draft;
}

export async function upsertLegalReportDraft(projectId: string, data: LegalReportDraftData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // TODO: Add role check if needed

  const draft = await prisma.legalReportDraft.upsert({
    where: { projectId },
    create: {
      projectId,
      ...data,
    },
    update: {
      ...data,
    },
  });

  return draft;
}
