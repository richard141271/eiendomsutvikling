import "server-only";

import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { createAdminClient, ensureBucketExists } from "@/lib/supabase-admin";
import { CLEANUP_BUCKET } from "@/src/modules/rydderen/utils";

const admin = () => createAdminClient();

export async function listCleanupProjectsByTenant(params: {
  tenantId: string;
  contextType?: string | null;
  contextId?: string | null;
}) {
  const where: Record<string, unknown> = { tenantId: params.tenantId };
  if (params.contextType) where.contextType = params.contextType;
  if (params.contextId) where.contextId = params.contextId;

  return (prisma as any).cleanupProject.findMany({
    where,
    include: {
      items: { select: { id: true, action: true, value: true } },
      costs: { select: { id: true, amount: true } },
      links: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCleanupProjectByIdForTenant(cleanupProjectId: string, tenantId: string) {
  return (prisma as any).cleanupProject.findFirst({
    where: { id: cleanupProjectId, tenantId },
    include: {
      items: { orderBy: { itemNumber: "asc" } },
      costs: { orderBy: { incurredAt: "desc" } },
      links: true,
    },
  });
}

export async function createCleanupProjectRecord(data: Record<string, unknown>) {
  return (prisma as any).cleanupProject.create({ data });
}

export async function updateCleanupProjectRecord(cleanupProjectId: string, tenantId: string, data: Record<string, unknown>) {
  return (prisma as any).cleanupProject.updateMany({
    where: { id: cleanupProjectId, tenantId },
    data,
  });
}

export async function deleteCleanupProjectRecord(cleanupProjectId: string, tenantId: string) {
  return (prisma as any).cleanupProject.deleteMany({
    where: { id: cleanupProjectId, tenantId },
  });
}

export async function findCleanupProjectBySlug(tenantId: string, slug: string) {
  return (prisma as any).cleanupProject.findFirst({
    where: { tenantId, slug },
    select: { id: true },
  });
}

export async function createCleanupProjectLinkRecord(data: Record<string, unknown>) {
  return (prisma as any).cleanupProjectLink.create({ data });
}

export async function listCleanupItemsForTenant(params: {
  tenantId: string;
  cleanupProjectId: string;
  action?: string | null;
}) {
  const where: Record<string, unknown> = {
    tenantId: params.tenantId,
    cleanupProjectId: params.cleanupProjectId,
  };
  if (params.action) where.action = params.action;

  return (prisma as any).cleanupItem.findMany({
    where,
    include: {
      cleanupProject: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCleanupItemByIdForTenant(cleanupProjectId: string, itemId: string, tenantId: string) {
  return (prisma as any).cleanupItem.findFirst({
    where: { id: itemId, cleanupProjectId, tenantId },
    include: {
      cleanupProject: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function getNextCleanupItemNumber(cleanupProjectId: string) {
  const result = await (prisma as any).cleanupItem.aggregate({
    where: { cleanupProjectId },
    _max: { itemNumber: true },
  });
  return (result?._max?.itemNumber || 0) + 1;
}

export async function findCleanupItemByImageHashForTenant(params: {
  cleanupProjectId: string;
  tenantId: string;
  imageHash: string;
}) {
  return (prisma as any).cleanupItem.findFirst({
    where: {
      cleanupProjectId: params.cleanupProjectId,
      tenantId: params.tenantId,
      imageHash: params.imageHash,
    },
    select: {
      id: true,
      itemNumber: true,
    },
  });
}

export async function createCleanupItemRecord(data: Record<string, unknown>) {
  return (prisma as any).cleanupItem.create({ data });
}

export async function updateCleanupItemRecord(cleanupProjectId: string, itemId: string, tenantId: string, data: Record<string, unknown>) {
  await (prisma as any).cleanupItem.updateMany({
    where: { id: itemId, cleanupProjectId, tenantId },
    data,
  });

  return getCleanupItemByIdForTenant(cleanupProjectId, itemId, tenantId);
}

export async function listCleanupCostsForTenant(cleanupProjectId: string, tenantId: string) {
  return (prisma as any).cleanupProjectCost.findMany({
    where: { cleanupProjectId, tenantId },
    orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function createCleanupCostRecord(data: Record<string, unknown>) {
  return (prisma as any).cleanupProjectCost.create({ data });
}

export async function listCleanupContextOptionsFromDb() {
  const [properties, projects] = await Promise.all([
    prisma.property.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
      take: 200,
    }),
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true },
      take: 200,
    }),
  ]);

  return { properties, projects };
}

export async function resolveCleanupContextReference(contextType: string | null | undefined, contextId: string | null | undefined) {
  if (!contextType || !contextId) return null;

  if (contextType === "property") {
    const property = await prisma.property.findUnique({
      where: { id: contextId },
      select: { id: true, name: true, address: true },
    });
    if (!property) return null;
    return { type: "property", id: property.id, label: property.name, description: property.address };
  }

  if (contextType === "project") {
    const project = await prisma.project.findUnique({
      where: { id: contextId },
      select: { id: true, title: true, description: true },
    });
    if (!project) return null;
    return { type: "project", id: project.id, label: project.title, description: project.description };
  }

  if (contextType === "case") {
    return { type: "case", id: contextId, label: `Sak ${contextId.slice(0, 8)}`, description: "Manuell saksreferanse" };
  }

  return null;
}

function resolveFileExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function ensureCleanupStorageBucket() {
  await ensureBucketExists(CLEANUP_BUCKET, {
    public: false,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  });
}

export async function uploadCleanupItemImages(params: {
  cleanupProjectId: string;
  itemId: string;
  fileBuffer: Buffer;
  contentType: string;
}) {
  await ensureCleanupStorageBucket();

  const ext = resolveFileExtension(params.contentType);
  const originalPath = `cleanup-projects/${params.cleanupProjectId}/items/${params.itemId}/original.${ext}`;
  const thumbPath = `cleanup-projects/${params.cleanupProjectId}/items/${params.itemId}/thumb.jpg`;

  const thumbBuffer = await sharp(params.fileBuffer)
    .rotate()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const { error: originalError } = await admin().storage.from(CLEANUP_BUCKET).upload(originalPath, params.fileBuffer, {
    contentType: params.contentType,
    upsert: true,
  });
  if (originalError) throw new Error(originalError.message);

  const { error: thumbError } = await admin().storage.from(CLEANUP_BUCKET).upload(thumbPath, thumbBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (thumbError) throw new Error(thumbError.message);

  return { originalPath, thumbPath };
}

export async function uploadCleanupImageDataUrl(params: {
  cleanupProjectId: string;
  itemId: string;
  dataUrl: string;
}) {
  const match = params.dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Ugyldig bildeformat for import");
  }

  const [, contentType, base64Data] = match;
  return uploadCleanupItemImages({
    cleanupProjectId: params.cleanupProjectId,
    itemId: params.itemId,
    fileBuffer: Buffer.from(base64Data, "base64"),
    contentType,
  });
}

export async function createCleanupSignedUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await admin().storage.from(CLEANUP_BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl || null;
}
