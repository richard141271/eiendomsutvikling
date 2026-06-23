import "server-only";

import { createClient } from "@/lib/supabase-server";
import {
  createCleanupCostRecord,
  createCleanupEvidenceEntryImageRecord,
  createCleanupEvidenceEntryRecord,
  createCleanupItemRecord,
  createCleanupProjectLinkRecord,
  createCleanupProjectRecord,
  createCleanupSignedUrl,
  deleteCleanupProjectRecord,
  ensureCleanupStorageBucket,
  findCleanupEvidenceImageByHashForTenant,
  findCleanupProjectBySlug,
  findCleanupItemByImageHashForTenant,
  getCleanupEvidenceEntryByIdForTenant,
  getCleanupEvidenceMapByProjectIdForTenant,
  getCleanupItemByIdForTenant,
  getNextCleanupEvidenceSequence,
  getCleanupProjectByIdForTenant,
  getNextCleanupItemNumber,
  listCleanupContextOptionsFromDb,
  listCleanupCostsForTenant,
  listCleanupEvidenceEntriesForTenant,
  listCleanupItemsForTenant,
  listCleanupProjectsByTenant,
  resolveCleanupContextReference,
  upsertCleanupEvidenceMapRecord,
  updateCleanupItemRecord,
  updateCleanupProjectRecord,
  uploadCleanupImageDataUrl,
  uploadCleanupEvidenceImage,
  uploadCleanupItemImages,
  updateCleanupEvidenceEntryImageRecord,
} from "@/src/modules/rydderen/repositories";
import type {
  CleanupContextOptions,
  CleanupCost,
  CleanupCostCreateInput,
  CleanupEvidenceEntry,
  CleanupEvidenceEntryCreateInput,
  CleanupEvidenceEntryImage,
  CleanupEvidenceMap,
  CleanupEvidenceMapUpsertInput,
  CleanupImportResult,
  CleanupItem,
  CleanupItemCreateInput,
  CleanupItemUpdateInput,
  CleanupProject,
  CleanupProjectCreateInput,
  CleanupProjectUpdateInput,
  CleanupReportSummary,
  LegacyCleanupImportPayload,
} from "@/src/modules/rydderen/types";
import { calculateCleanupSummary, slugify, toNumber } from "@/src/modules/rydderen/utils";

type CleanupActor = {
  authUserId: string;
  tenantId: string;
};

function isMissingDocumentationTableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message || "";
  return (
    message.includes("cleanup_evidence_maps") ||
    message.includes("cleanup_evidence_entries") ||
    message.includes("cleanup_evidence_entry_images")
  );
}

function createDocumentationUnavailableError() {
  return new Error("Dokumentasjon & Bevis er ikke aktivert i databasen ennå. Kjør nyeste dokumentasjonsmigrasjon først.");
}

async function requireCleanupActor(): Promise<CleanupActor> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return {
    authUserId: user.id,
    tenantId: user.id,
  };
}

function serializeProject(project: any, contextLabel: string | null, coverImageUrl: string | null): CleanupProject {
  const summary = calculateCleanupSummary(project.items || [], project.costs || []);
  return {
    id: project.id,
    tenantId: project.tenantId,
    name: project.name,
    slug: project.slug,
    moduleType: project.moduleType,
    contextType: project.contextType,
    contextId: project.contextId,
    context: {
      type: project.contextType || null,
      id: project.contextId || null,
      label: contextLabel,
    },
    description: project.description ?? null,
    status: project.status,
    coverImagePath: project.coverImagePath ?? null,
    coverImageUrl,
    createdBy: project.createdBy,
    updatedBy: project.updatedBy ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    itemCount: summary.totalItems,
    unvaluedCount: summary.unvaluedItems,
    totalValue: summary.totalValue,
    costsTotal: summary.projectCosts,
    links: (project.links || []).map((link: any) => ({
      id: link.id,
      cleanupProjectId: link.cleanupProjectId,
      linkedEntityType: link.linkedEntityType,
      linkedEntityId: link.linkedEntityId,
      createdAt: link.createdAt.toISOString(),
    })),
  };
}

async function serializeItem(item: any): Promise<CleanupItem> {
  const imageUrl = await createCleanupSignedUrl(item.imagePath);
  const imageThumbnailUrl = await createCleanupSignedUrl(item.imageThumbnailPath);
  return {
    id: item.id,
    tenantId: item.tenantId,
    cleanupProjectId: item.cleanupProjectId,
    itemNumber: item.itemNumber,
    imageHash: item.imageHash ?? null,
    category: item.category,
    action: item.action,
    value: item.value === null || item.value === undefined ? null : toNumber(item.value),
    comment: item.comment ?? null,
    condition: item.condition ?? null,
    note: item.note ?? null,
    imagePath: item.imagePath ?? null,
    imageThumbnailPath: item.imageThumbnailPath ?? null,
    imageUrl,
    imageThumbnailUrl,
    capturedAt: item.capturedAt.toISOString(),
    valuedAt: item.valuedAt ? item.valuedAt.toISOString() : null,
    createdBy: item.createdBy,
    updatedBy: item.updatedBy ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    metadata: (item.metadata || {}) as Record<string, unknown>,
    projectName: item.cleanupProject?.name,
  };
}

function serializeCost(cost: any): CleanupCost {
  return {
    id: cost.id,
    tenantId: cost.tenantId,
    cleanupProjectId: cost.cleanupProjectId,
    costType: cost.costType,
    amount: toNumber(cost.amount),
    description: cost.description ?? null,
    incurredAt: cost.incurredAt.toISOString(),
    createdBy: cost.createdBy,
    updatedBy: cost.updatedBy ?? null,
    createdAt: cost.createdAt.toISOString(),
    updatedAt: cost.updatedAt.toISOString(),
  };
}

async function serializeEvidenceImage(image: any): Promise<CleanupEvidenceEntryImage> {
  const imageUrl = await createCleanupSignedUrl(image.storagePath);
  const thumbnailUrl = await createCleanupSignedUrl(image.thumbnailPath);
  return {
    id: image.id,
    tenantId: image.tenantId,
    cleanupEvidenceEntryId: image.cleanupEvidenceEntryId,
    storagePath: image.storagePath,
    thumbnailPath: image.thumbnailPath ?? null,
    imageHash: image.imageHash ?? null,
    originalName: image.originalName ?? null,
    sortOrder: image.sortOrder,
    imageUrl,
    thumbnailUrl,
    createdAt: image.createdAt.toISOString(),
    updatedAt: image.updatedAt.toISOString(),
  };
}

async function serializeEvidenceEntry(entry: any): Promise<CleanupEvidenceEntry> {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    cleanupProjectId: entry.cleanupProjectId,
    entryType: entry.entryType,
    sequence: entry.sequence,
    entryNumber: entry.entryNumber,
    category: entry.category ?? null,
    description: entry.description ?? null,
    comment: entry.comment ?? null,
    zone: entry.zone ?? null,
    count: entry.count ?? 1,
    risk: entry.risk ?? null,
    gps: entry.gps ? (entry.gps as { lat: number; lon: number }) : null,
    createdDate: entry.createdDate ?? null,
    createdTime: entry.createdTime ?? null,
    imageCount: entry.imageCount ?? entry.images?.length ?? 0,
    createdBy: entry.createdBy,
    updatedBy: entry.updatedBy ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    metadata: (entry.metadata || {}) as Record<string, unknown>,
    images: await Promise.all((entry.images || []).map(serializeEvidenceImage)),
  };
}

function serializeEvidenceMap(map: any): CleanupEvidenceMap {
  return {
    id: map.id,
    tenantId: map.tenantId,
    cleanupProjectId: map.cleanupProjectId,
    rows: map.rows,
    columns: map.columns,
    zones: Array.isArray(map.zones) ? map.zones.map((zone: unknown) => String(zone)) : [],
    sketch: map.sketch ?? null,
    caseName: map.caseName ?? null,
    address: map.address ?? null,
    createdBy: map.createdBy,
    updatedBy: map.updatedBy ?? null,
    createdAt: map.createdAt.toISOString(),
    updatedAt: map.updatedAt.toISOString(),
  };
}

function createEvidenceNumber(entryType: string, sequence: number) {
  const prefixes: Record<string, string> = {
    finding: "FUNN",
    observation: "OBS",
    damage: "SKADE",
    measurement: "MAL",
    sample: "SP",
  };
  const prefix = prefixes[entryType] || entryType.toUpperCase();
  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}

async function resolveUniqueSlug(tenantId: string, preferred: string) {
  let attempt = preferred;
  let counter = 2;
  while (attempt) {
    const existing = await findCleanupProjectBySlug(tenantId, attempt);
    if (!existing) return attempt;
    attempt = `${preferred}-${counter}`;
    counter += 1;
  }
  return null;
}

export async function listCleanupProjects(filters?: { contextType?: string | null; contextId?: string | null }) {
  const actor = await requireCleanupActor();
  const records = await listCleanupProjectsByTenant({
    tenantId: actor.tenantId,
    contextType: filters?.contextType,
    contextId: filters?.contextId,
  });

  return Promise.all(
    records.map(async (project: any) => {
      const contextRef = await resolveCleanupContextReference(project.contextType, project.contextId);
      const coverImageUrl = await createCleanupSignedUrl(project.coverImagePath);
      return serializeProject(project, contextRef?.label || null, coverImageUrl);
    })
  );
}

export async function getCleanupProject(cleanupProjectId: string) {
  const actor = await requireCleanupActor();
  const project = await getCleanupProjectByIdForTenant(cleanupProjectId, actor.tenantId);
  if (!project) {
    throw new Error("Cleanup project not found");
  }
  const contextRef = await resolveCleanupContextReference(project.contextType, project.contextId);
  const coverImageUrl = await createCleanupSignedUrl(project.coverImagePath);
  return serializeProject(project, contextRef?.label || null, coverImageUrl);
}

export async function getCleanupContextOptions(): Promise<CleanupContextOptions> {
  await requireCleanupActor();
  const result = await listCleanupContextOptionsFromDb();

  return {
    properties: result.properties.map((property) => ({
      id: property.id,
      type: "property",
      label: property.name,
      description: property.address,
    })),
    projects: result.projects.map((project) => ({
      id: project.id,
      type: "project",
      label: project.title,
      description: project.description,
    })),
    cases: [],
  };
}

export async function createCleanupProject(input: CleanupProjectCreateInput) {
  const actor = await requireCleanupActor();
  const contextType = input.contextType || "standalone";
  const contextId = contextType === "standalone" ? null : input.contextId || null;

  if (contextType !== "standalone" && !contextId) {
    throw new Error("Kontekst må velges");
  }

  if (contextType !== "standalone") {
    const contextRef = await resolveCleanupContextReference(contextType, contextId);
    if (!contextRef && contextType !== "case") {
      throw new Error("Fant ikke valgt kontekst");
    }
  }

  const preferredSlug = slugify(input.slug || input.name);
  const slug = preferredSlug ? await resolveUniqueSlug(actor.tenantId, preferredSlug) : null;

  const created = await createCleanupProjectRecord({
    tenantId: actor.tenantId,
    name: input.name,
    slug,
    moduleType: input.moduleType || "rydderen",
    contextType,
    contextId,
    description: input.description || null,
    status: "active",
    createdBy: actor.authUserId,
    updatedBy: actor.authUserId,
  });

  if (contextType !== "standalone" && contextId) {
    await createCleanupProjectLinkRecord({
      cleanupProjectId: created.id,
      linkedEntityType: contextType,
      linkedEntityId: contextId,
    });
  }

  return getCleanupProject(created.id);
}

export async function updateCleanupProject(cleanupProjectId: string, input: CleanupProjectUpdateInput) {
  const actor = await requireCleanupActor();
  const data: Record<string, unknown> = {
    updatedBy: actor.authUserId,
  };

  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.coverImagePath !== undefined) data.coverImagePath = input.coverImagePath;
  if (input.slug !== undefined) {
    const baseSlug = slugify(input.slug || "");
    data.slug = baseSlug ? await resolveUniqueSlug(actor.tenantId, baseSlug) : null;
  }

  await updateCleanupProjectRecord(cleanupProjectId, actor.tenantId, data);
  return getCleanupProject(cleanupProjectId);
}

export async function deleteCleanupProject(cleanupProjectId: string) {
  const actor = await requireCleanupActor();
  const project = await getCleanupProjectByIdForTenant(cleanupProjectId, actor.tenantId);
  if (!project) {
    throw new Error("Cleanup project not found");
  }

  await deleteCleanupProjectRecord(cleanupProjectId, actor.tenantId);
  return { success: true };
}

export async function listCleanupItems(cleanupProjectId: string, filters?: { action?: string | null }) {
  const actor = await requireCleanupActor();
  await getCleanupProject(cleanupProjectId);
  const items = await listCleanupItemsForTenant({
    tenantId: actor.tenantId,
    cleanupProjectId,
    action: filters?.action,
  });
  return Promise.all(items.map(serializeItem));
}

export async function createCleanupItem(cleanupProjectId: string, input: CleanupItemCreateInput) {
  const actor = await requireCleanupActor();
  await getCleanupProject(cleanupProjectId);
  if (input.imageHash) {
    const duplicate = await findCleanupItemByImageHashForTenant({
      cleanupProjectId,
      tenantId: actor.tenantId,
      imageHash: input.imageHash,
    });

    if (duplicate) {
      throw new Error("Dette bildet er allerede registrert i prosjektet.");
    }
  }
  const itemNumber = input.itemNumber || (await getNextCleanupItemNumber(cleanupProjectId));

  let item;
  try {
    item = await createCleanupItemRecord({
      tenantId: actor.tenantId,
      cleanupProjectId,
      itemNumber,
      imageHash: input.imageHash ?? null,
      category: input.category,
      action: input.action,
      value: input.value ?? null,
      comment: input.comment ?? null,
      condition: input.condition ?? null,
      note: input.note ?? null,
      imagePath: input.imagePath ?? null,
      imageThumbnailPath: input.imageThumbnailPath ?? null,
      capturedAt: input.capturedAt ? new Date(input.capturedAt) : new Date(),
      valuedAt: input.valuedAt ? new Date(input.valuedAt) : null,
      createdBy: actor.authUserId,
      updatedBy: actor.authUserId,
      metadata: input.metadata || {},
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("cleanup_items_cleanup_project_id_image_hash_key")) {
      throw new Error("Dette bildet er allerede registrert i prosjektet.");
    }
    throw error;
  }

  const record = await getCleanupItemByIdForTenant(cleanupProjectId, item.id, actor.tenantId);
  return serializeItem(record);
}

export async function createCapturedCleanupItem(
  cleanupProjectId: string,
  input: {
    category: string;
    action: "kast" | "selg" | "behold";
    file: File;
    imageHash?: string | null;
    comment?: string | null;
    condition?: string | null;
    note?: string | null;
  }
) {
  const actor = await requireCleanupActor();
  await getCleanupProject(cleanupProjectId);

  if (input.imageHash) {
    const duplicate = await findCleanupItemByImageHashForTenant({
      cleanupProjectId,
      tenantId: actor.tenantId,
      imageHash: input.imageHash,
    });

    if (duplicate) {
      throw new Error("Dette bildet er allerede registrert i prosjektet.");
    }
  }

  let item;
  try {
    item = await createCleanupItemRecord({
      tenantId: actor.tenantId,
      cleanupProjectId,
      itemNumber: await getNextCleanupItemNumber(cleanupProjectId),
      imageHash: input.imageHash ?? null,
      category: input.category,
      action: input.action,
      comment: input.comment ?? null,
      condition: input.condition ?? null,
      note: input.note ?? null,
      createdBy: actor.authUserId,
      updatedBy: actor.authUserId,
      metadata: { captureSource: "mobile-flow" },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("cleanup_items_cleanup_project_id_image_hash_key")) {
      throw new Error("Dette bildet er allerede registrert i prosjektet.");
    }
    throw error;
  }

  const arrayBuffer = await input.file.arrayBuffer();
  const { originalPath, thumbPath } = await uploadCleanupItemImages({
    cleanupProjectId,
    itemId: item.id,
    fileBuffer: Buffer.from(arrayBuffer),
    contentType: input.file.type || "image/jpeg",
  });

  const record = await updateCleanupItemRecord(cleanupProjectId, item.id, actor.tenantId, {
    imagePath: originalPath,
    imageThumbnailPath: thumbPath,
    updatedBy: actor.authUserId,
  });

  return serializeItem(record);
}

export async function updateCleanupItem(cleanupProjectId: string, itemId: string, input: CleanupItemUpdateInput) {
  const actor = await requireCleanupActor();
  await getCleanupProject(cleanupProjectId);

  const data: Record<string, unknown> = {
    updatedBy: actor.authUserId,
  };

  if (input.category !== undefined) data.category = input.category;
  if (input.action !== undefined) data.action = input.action;
  if (input.imageHash !== undefined) data.imageHash = input.imageHash;
  if (input.value !== undefined) data.value = input.value;
  if (input.comment !== undefined) data.comment = input.comment;
  if (input.condition !== undefined) data.condition = input.condition;
  if (input.note !== undefined) data.note = input.note;
  if (input.imagePath !== undefined) data.imagePath = input.imagePath;
  if (input.imageThumbnailPath !== undefined) data.imageThumbnailPath = input.imageThumbnailPath;
  if (input.metadata !== undefined) data.metadata = input.metadata;
  if (input.valuedAt !== undefined) data.valuedAt = input.valuedAt ? new Date(input.valuedAt) : null;

  const record = await updateCleanupItemRecord(cleanupProjectId, itemId, actor.tenantId, data);
  if (!record) {
    throw new Error("Cleanup item not found");
  }

  return serializeItem(record);
}

export async function listCleanupCosts(cleanupProjectId: string) {
  const actor = await requireCleanupActor();
  await getCleanupProject(cleanupProjectId);
  const costs = await listCleanupCostsForTenant(cleanupProjectId, actor.tenantId);
  return costs.map(serializeCost);
}

export async function createCleanupCost(cleanupProjectId: string, input: CleanupCostCreateInput) {
  const actor = await requireCleanupActor();
  await getCleanupProject(cleanupProjectId);

  const cost = await createCleanupCostRecord({
    tenantId: actor.tenantId,
    cleanupProjectId,
    costType: input.costType,
    amount: input.amount,
    description: input.description ?? null,
    incurredAt: input.incurredAt ? new Date(input.incurredAt) : new Date(),
    createdBy: actor.authUserId,
    updatedBy: actor.authUserId,
  });

  return serializeCost(cost);
}

export async function getCleanupReport(cleanupProjectId: string): Promise<CleanupReportSummary> {
  const [project, items, costs] = await Promise.all([
    getCleanupProject(cleanupProjectId),
    listCleanupItems(cleanupProjectId),
    listCleanupCosts(cleanupProjectId),
  ]);

  return {
    project,
    items,
    costs,
    generatedAt: new Date().toISOString(),
    ...calculateCleanupSummary(items, costs),
  };
}

export async function listCleanupEvidenceEntries(cleanupProjectId: string) {
  try {
    const actor = await requireCleanupActor();
    await getCleanupProject(cleanupProjectId);
    const entries = await listCleanupEvidenceEntriesForTenant(cleanupProjectId, actor.tenantId);
    return Promise.all(entries.map(serializeEvidenceEntry));
  } catch (error) {
    if (isMissingDocumentationTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function createCleanupEvidenceEntry(cleanupProjectId: string, input: CleanupEvidenceEntryCreateInput) {
  try {
    const actor = await requireCleanupActor();
    await getCleanupProject(cleanupProjectId);

    const sequence = await getNextCleanupEvidenceSequence(cleanupProjectId, input.entryType);
    const createdAt = new Date();
    const entry = await createCleanupEvidenceEntryRecord({
      tenantId: actor.tenantId,
      cleanupProjectId,
      entryType: input.entryType,
      sequence,
      entryNumber: createEvidenceNumber(input.entryType, sequence),
      category: input.category ?? null,
      description: input.description ?? null,
      comment: input.comment ?? null,
      zone: input.zone ?? null,
      count: input.count ?? 1,
      risk: input.risk ?? null,
      gps: input.gps ?? null,
      createdDate: input.createdDate ?? createdAt.toLocaleDateString("no-NO"),
      createdTime: input.createdTime ?? createdAt.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" }),
      imageCount: input.images?.length ?? 0,
      createdBy: actor.authUserId,
      updatedBy: actor.authUserId,
      metadata: input.metadata || {},
    });

    if (input.images?.length) {
      for (let index = 0; index < input.images.length; index += 1) {
        const image = input.images[index];
        if (image.imageHash) {
          const duplicate = await findCleanupEvidenceImageByHashForTenant({
            cleanupProjectId,
            tenantId: actor.tenantId,
            imageHash: image.imageHash,
          });
          if (duplicate) {
            throw new Error("Dette bildet er allerede registrert i dokumentasjonen for prosjektet.");
          }
        }

        const imageRecord = await createCleanupEvidenceEntryImageRecord({
          tenantId: actor.tenantId,
          cleanupEvidenceEntryId: entry.id,
          storagePath: "",
          thumbnailPath: null,
          imageHash: image.imageHash ?? null,
          originalName: image.originalName ?? image.file.name ?? null,
          sortOrder: index,
        });

        const arrayBuffer = await image.file.arrayBuffer();
        const { originalPath, thumbPath } = await uploadCleanupEvidenceImage({
          cleanupProjectId,
          entryId: entry.id,
          imageId: imageRecord.id,
          fileBuffer: Buffer.from(arrayBuffer),
          contentType: image.file.type || "image/jpeg",
        });

        await updateCleanupEvidenceEntryImageRecord(imageRecord.id, actor.tenantId, {
          storagePath: originalPath,
          thumbnailPath: thumbPath,
        });
      }
    }

    const record = await getCleanupEvidenceEntryByIdForTenant(cleanupProjectId, entry.id, actor.tenantId);
    return serializeEvidenceEntry(record);
  } catch (error) {
    if (isMissingDocumentationTableError(error)) {
      throw createDocumentationUnavailableError();
    }
    throw error;
  }
}

export async function getCleanupEvidenceMap(cleanupProjectId: string) {
  try {
    const actor = await requireCleanupActor();
    await getCleanupProject(cleanupProjectId);
    const map = await getCleanupEvidenceMapByProjectIdForTenant(cleanupProjectId, actor.tenantId);
    if (!map) {
      return null;
    }
    return serializeEvidenceMap(map);
  } catch (error) {
    if (isMissingDocumentationTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function upsertCleanupEvidenceMap(cleanupProjectId: string, input: CleanupEvidenceMapUpsertInput) {
  try {
    const actor = await requireCleanupActor();
    await getCleanupProject(cleanupProjectId);
    const record = await upsertCleanupEvidenceMapRecord({
      cleanupProjectId,
      tenantId: actor.tenantId,
      create: {
        tenantId: actor.tenantId,
        cleanupProjectId,
        rows: input.rows,
        columns: input.columns,
        zones: input.zones,
        sketch: input.sketch ?? null,
        caseName: input.caseName ?? null,
        address: input.address ?? null,
        createdBy: actor.authUserId,
        updatedBy: actor.authUserId,
      },
      update: {
        tenantId: actor.tenantId,
        rows: input.rows,
        columns: input.columns,
        zones: input.zones,
        sketch: input.sketch ?? null,
        caseName: input.caseName ?? null,
        address: input.address ?? null,
        updatedBy: actor.authUserId,
      },
    });
    return serializeEvidenceMap(record);
  } catch (error) {
    if (isMissingDocumentationTableError(error)) {
      throw createDocumentationUnavailableError();
    }
    throw error;
  }
}

export async function importLegacyCleanupPayload(payload: LegacyCleanupImportPayload): Promise<CleanupImportResult> {
  const actor = await requireCleanupActor();
  const errors: Array<{ itemNumber?: number; message: string }> = [];

  if (payload.dryRun) {
    return {
      dryRun: true,
      projectId: null,
      importedItems: payload.items.length,
      importedCosts: payload.costs?.length || 0,
      errors,
    };
  }

  const project = await createCleanupProject(payload.project);

  let importedItems = 0;
  for (const item of payload.items) {
    try {
      const created = await createCleanupItem(project.id, {
        category: item.category,
        action: item.action,
        itemNumber: item.itemNumber,
        value: item.value ?? null,
        comment: item.comment ?? null,
        condition: item.condition ?? null,
        note: item.note ?? null,
        capturedAt: item.capturedAt || item.createdAt,
        metadata: item.metadata || {},
      });

      if (item.imageDataUrl) {
        const paths = await uploadCleanupImageDataUrl({
          cleanupProjectId: project.id,
          itemId: created.id,
          dataUrl: item.imageDataUrl,
        });

        await updateCleanupItemRecord(project.id, created.id, actor.tenantId, {
          imagePath: paths.originalPath,
          imageThumbnailPath: paths.thumbPath,
          updatedBy: actor.authUserId,
        });
      }

      importedItems += 1;
    } catch (error) {
      errors.push({
        itemNumber: item.itemNumber,
        message: error instanceof Error ? error.message : "Ukjent feil under import",
      });
    }
  }

  let importedCosts = 0;
  for (const cost of payload.costs || []) {
    try {
      await createCleanupCost(project.id, {
        costType: cost.costType,
        amount: cost.amount,
        description: cost.description ?? null,
        incurredAt: cost.incurredAt,
      });
      importedCosts += 1;
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : "Ukjent feil under kostnadsimport",
      });
    }
  }

  return {
    dryRun: false,
    projectId: project.id,
    importedItems,
    importedCosts,
    errors,
  };
}

export { ensureCleanupStorageBucket };
