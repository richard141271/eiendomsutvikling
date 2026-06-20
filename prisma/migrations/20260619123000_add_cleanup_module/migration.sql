CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "cleanup_projects" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "module_type" TEXT NOT NULL DEFAULT 'rydderen',
  "context_type" TEXT,
  "context_id" UUID,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "cover_image_path" TEXT,
  "created_by" UUID NOT NULL,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cleanup_projects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cleanup_projects_context_check" CHECK (
    ("context_type" = 'standalone' AND "context_id" IS NULL)
    OR ("context_type" IS NULL AND "context_id" IS NULL)
    OR ("context_type" IN ('property', 'case', 'project') AND "context_id" IS NOT NULL)
  ),
  CONSTRAINT "cleanup_projects_status_check" CHECK ("status" IN ('active', 'completed', 'archived'))
);

CREATE TABLE "cleanup_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cleanup_project_id" UUID NOT NULL,
  "item_number" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "value" NUMERIC(12, 2),
  "comment" TEXT,
  "condition" TEXT,
  "note" TEXT,
  "image_path" TEXT,
  "image_thumbnail_path" TEXT,
  "captured_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "valued_at" TIMESTAMPTZ,
  "created_by" UUID NOT NULL,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "cleanup_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cleanup_items_action_check" CHECK ("action" IN ('kast', 'selg', 'behold'))
);

CREATE TABLE "cleanup_project_costs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cleanup_project_id" UUID NOT NULL,
  "cost_type" TEXT NOT NULL,
  "amount" NUMERIC(12, 2) NOT NULL,
  "description" TEXT,
  "incurred_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_by" UUID NOT NULL,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cleanup_project_costs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cleanup_project_costs_type_check" CHECK ("cost_type" IN ('container', 'transport', 'arbeid', 'bortkjoring', 'annet'))
);

CREATE TABLE "cleanup_project_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cleanup_project_id" UUID NOT NULL,
  "linked_entity_type" TEXT NOT NULL,
  "linked_entity_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cleanup_project_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cleanup_project_links_type_check" CHECK ("linked_entity_type" IN ('property', 'case', 'project'))
);

ALTER TABLE "cleanup_items"
  ADD CONSTRAINT "cleanup_items_cleanup_project_id_fkey"
  FOREIGN KEY ("cleanup_project_id") REFERENCES "cleanup_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cleanup_project_costs"
  ADD CONSTRAINT "cleanup_project_costs_cleanup_project_id_fkey"
  FOREIGN KEY ("cleanup_project_id") REFERENCES "cleanup_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cleanup_project_links"
  ADD CONSTRAINT "cleanup_project_links_cleanup_project_id_fkey"
  FOREIGN KEY ("cleanup_project_id") REFERENCES "cleanup_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "cleanup_projects_tenant_id_slug_key" ON "cleanup_projects"("tenant_id", "slug");
CREATE INDEX "cleanup_projects_tenant_id_idx" ON "cleanup_projects"("tenant_id");
CREATE INDEX "cleanup_projects_context_type_context_id_idx" ON "cleanup_projects"("context_type", "context_id");
CREATE INDEX "cleanup_projects_status_idx" ON "cleanup_projects"("status");
CREATE INDEX "cleanup_projects_created_at_desc_idx" ON "cleanup_projects"("created_at" DESC);

CREATE UNIQUE INDEX "cleanup_items_cleanup_project_id_item_number_key" ON "cleanup_items"("cleanup_project_id", "item_number");
CREATE INDEX "cleanup_items_cleanup_project_id_idx" ON "cleanup_items"("cleanup_project_id");
CREATE INDEX "cleanup_items_cleanup_project_id_action_idx" ON "cleanup_items"("cleanup_project_id", "action");
CREATE INDEX "cleanup_items_cleanup_project_id_value_idx" ON "cleanup_items"("cleanup_project_id", "value");
CREATE INDEX "cleanup_items_created_at_desc_idx" ON "cleanup_items"("created_at" DESC);

CREATE INDEX "cleanup_project_costs_cleanup_project_id_idx" ON "cleanup_project_costs"("cleanup_project_id");
CREATE INDEX "cleanup_project_costs_cost_type_idx" ON "cleanup_project_costs"("cost_type");

CREATE UNIQUE INDEX "cleanup_project_links_cleanup_project_id_linked_entity_type_linked_entity_id_key"
  ON "cleanup_project_links"("cleanup_project_id", "linked_entity_type", "linked_entity_id");

ALTER TABLE "cleanup_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cleanup_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cleanup_project_costs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cleanup_projects_select_own_tenant"
  ON "cleanup_projects"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "tenant_id");

CREATE POLICY "cleanup_projects_insert_own_tenant"
  ON "cleanup_projects"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = "tenant_id" AND auth.uid() = "created_by");

CREATE POLICY "cleanup_projects_update_own_tenant"
  ON "cleanup_projects"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = "tenant_id")
  WITH CHECK (auth.uid() = "tenant_id");

CREATE POLICY "cleanup_projects_delete_own_tenant"
  ON "cleanup_projects"
  FOR DELETE
  TO authenticated
  USING (auth.uid() = "tenant_id");

CREATE POLICY "cleanup_items_select_own_tenant"
  ON "cleanup_items"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "tenant_id");

CREATE POLICY "cleanup_items_insert_own_tenant"
  ON "cleanup_items"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = "tenant_id" AND auth.uid() = "created_by");

CREATE POLICY "cleanup_items_update_own_tenant"
  ON "cleanup_items"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = "tenant_id")
  WITH CHECK (auth.uid() = "tenant_id");

CREATE POLICY "cleanup_items_delete_own_tenant"
  ON "cleanup_items"
  FOR DELETE
  TO authenticated
  USING (auth.uid() = "tenant_id");

CREATE POLICY "cleanup_project_costs_select_own_tenant"
  ON "cleanup_project_costs"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "tenant_id");

CREATE POLICY "cleanup_project_costs_insert_own_tenant"
  ON "cleanup_project_costs"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = "tenant_id" AND auth.uid() = "created_by");

CREATE POLICY "cleanup_project_costs_update_own_tenant"
  ON "cleanup_project_costs"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = "tenant_id")
  WITH CHECK (auth.uid() = "tenant_id");

CREATE POLICY "cleanup_project_costs_delete_own_tenant"
  ON "cleanup_project_costs"
  FOR DELETE
  TO authenticated
  USING (auth.uid() = "tenant_id");

INSERT INTO storage.buckets (id, name, public)
VALUES ('cleanup-media', 'cleanup-media', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE POLICY "cleanup_media_objects_select_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'cleanup-media');

CREATE POLICY "cleanup_media_objects_insert_authenticated"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cleanup-media');

CREATE POLICY "cleanup_media_objects_update_authenticated"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'cleanup-media')
  WITH CHECK (bucket_id = 'cleanup-media');

CREATE POLICY "cleanup_media_objects_delete_authenticated"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'cleanup-media');
