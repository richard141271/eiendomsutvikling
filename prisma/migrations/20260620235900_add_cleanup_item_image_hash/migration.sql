ALTER TABLE "cleanup_items"
  ADD COLUMN "image_hash" TEXT;

CREATE UNIQUE INDEX "cleanup_items_cleanup_project_id_image_hash_key"
  ON "cleanup_items"("cleanup_project_id", "image_hash");
