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

export type DamageReportDraftData = {
  projectName?: string;
  address?: string;
  gnrBnr?: string;
  client?: string;
  author?: string;
  company?: string;
  reportDate?: Date;
  caseNumber?: string;
  shortDescription?: string;
  observations?: string;
  technicalAssessment?: string;
  measurements?: any;
  diagrams?: string;
  drawings?: string;
  calculations?: string;
  causeOptions?: string;
  probableCause?: string;
  alternativeExplanations?: string;
  technicalJustification?: string;
  scope?: string;
  risk?: string;
  secondaryDamage?: string;
  futureIssues?: string;
  conclusion?: string;
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

export async function getDamageReportDraft(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  return await (prisma as any).damageReportDraft.findUnique({
    where: { projectId },
  });
}

export async function upsertDamageReportDraft(projectId: string, data: DamageReportDraftData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  return await (prisma as any).damageReportDraft.upsert({
    where: { projectId },
    create: {
      projectId,
      ...data,
    },
    update: {
      ...data,
    },
  });
}
