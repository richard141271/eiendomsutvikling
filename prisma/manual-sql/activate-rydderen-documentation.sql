-- Kjor denne i SQL-editoren for a aktivere Dokumentasjon & Bevis i Rydder'n.
-- Denne pakken gjor kun det som fortsatt ma skje i databasen.
-- Merk: cleanup_evidence_*-tabellene droppes og opprettes pa nytt for a rydde opp etter halvferdige migrasjonsforsok.
-- Det er trygt sa lenge du ikke allerede har ekte dokumentasjonsdata du vil beholde.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "cleanup_items"
  ADD COLUMN IF NOT EXISTS "image_hash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "cleanup_items_cleanup_project_id_image_hash_key"
  ON "cleanup_items"("cleanup_project_id", "image_hash");

DROP TABLE IF EXISTS "cleanup_evidence_entry_images" CASCADE;
DROP TABLE IF EXISTS "cleanup_evidence_maps" CASCADE;
DROP TABLE IF EXISTS "cleanup_evidence_entries" CASCADE;

CREATE TABLE "cleanup_evidence_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cleanup_project_id" UUID NOT NULL,
  "entry_type" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "entry_number" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "comment" TEXT,
  "zone" TEXT,
  "count" INTEGER NOT NULL DEFAULT 1,
  "risk" TEXT,
  "gps" JSONB,
  "created_date" TEXT,
  "created_time" TEXT,
  "image_count" INTEGER NOT NULL DEFAULT 0,
  "created_by" UUID NOT NULL,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "cleanup_evidence_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cleanup_evidence_entry_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cleanup_evidence_entry_id" UUID NOT NULL,
  "storage_path" TEXT NOT NULL,
  "thumbnail_path" TEXT,
  "image_hash" TEXT,
  "original_name" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cleanup_evidence_entry_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cleanup_evidence_maps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cleanup_project_id" UUID NOT NULL,
  "rows" INTEGER NOT NULL DEFAULT 3,
  "columns" INTEGER NOT NULL DEFAULT 3,
  "zones" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "sketch" TEXT,
  "case_name" TEXT,
  "address" TEXT,
  "created_by" UUID NOT NULL,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cleanup_evidence_maps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cleanup_evidence_entries_cleanup_project_id_entry_type_sequence_key"
  ON "cleanup_evidence_entries"("cleanup_project_id", "entry_type", "sequence");

CREATE UNIQUE INDEX "cleanup_evidence_entries_cleanup_project_id_entry_number_key"
  ON "cleanup_evidence_entries"("cleanup_project_id", "entry_number");

CREATE INDEX "cleanup_evidence_entries_cleanup_project_id_idx"
  ON "cleanup_evidence_entries"("cleanup_project_id");

CREATE INDEX "cleanup_evidence_entries_cleanup_project_id_created_at_idx"
  ON "cleanup_evidence_entries"("cleanup_project_id", "created_at" DESC);

CREATE INDEX "cleanup_evidence_entries_cleanup_project_id_entry_type_idx"
  ON "cleanup_evidence_entries"("cleanup_project_id", "entry_type");

CREATE UNIQUE INDEX "cleanup_evidence_entry_images_cleanup_evidence_entry_id_image_hash_key"
  ON "cleanup_evidence_entry_images"("cleanup_evidence_entry_id", "image_hash");

CREATE INDEX "cleanup_evidence_entry_images_cleanup_evidence_entry_id_sort_order_idx"
  ON "cleanup_evidence_entry_images"("cleanup_evidence_entry_id", "sort_order");

CREATE UNIQUE INDEX "cleanup_evidence_maps_cleanup_project_id_key"
  ON "cleanup_evidence_maps"("cleanup_project_id");

CREATE INDEX "cleanup_evidence_maps_tenant_id_idx"
  ON "cleanup_evidence_maps"("tenant_id");

ALTER TABLE "cleanup_evidence_entries"
  ADD CONSTRAINT "cleanup_evidence_entries_cleanup_project_id_fkey"
  FOREIGN KEY ("cleanup_project_id") REFERENCES "cleanup_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cleanup_evidence_entry_images"
  ADD CONSTRAINT "cleanup_evidence_entry_images_cleanup_evidence_entry_id_fkey"
  FOREIGN KEY ("cleanup_evidence_entry_id") REFERENCES "cleanup_evidence_entries"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cleanup_evidence_maps"
  ADD CONSTRAINT "cleanup_evidence_maps_cleanup_project_id_fkey"
  FOREIGN KEY ("cleanup_project_id") REFERENCES "cleanup_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
