
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function ensureBucketExists(bucketName: string) {
  const supabase = createAdminClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error("Error listing buckets:", error);
    return;
  }

  const bucketExists = buckets.find(b => b.name === bucketName);

  if (!bucketExists) {
    console.log(`Bucket '${bucketName}' not found. Creating...`);
    // Create bucket without specific file size limit first to avoid errors
    const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
    });

    if (createError) {
      console.error(`Error creating bucket '${bucketName}':`, createError);
      // If error is "The object exceeded the maximum allowed size", it might be a misleading error
      // Check if bucket was actually created despite error? No, that's unlikely.
      throw new Error(`Failed to create bucket '${bucketName}': ${createError.message}`);
    } else {
      console.log(`Bucket '${bucketName}' created successfully.`);
    }
  } else {
    // Bucket exists, try to update configuration
    console.log(`Bucket '${bucketName}' exists. Updating configuration...`);
    try {
      // 50MB is usually a safe default, but let's just ensure public access
      const { data, error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
        // Removing explicit fileSizeLimit to use project default
      });
      
      if (updateError) {
        console.warn(`Warning: Could not update bucket '${bucketName}': ${updateError.message}`);
      } else {
        console.log(`Bucket '${bucketName}' updated successfully.`);
      }
    } catch (e) {
      console.warn(`Warning: Exception during bucket update:`, e);
    }
  }
}
