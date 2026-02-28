
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
    // 500MB limit explicitly
    const limit = 524288000;
    const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: limit,
      allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
    });

    if (createError) {
      console.error(`Error creating bucket '${bucketName}':`, createError);
      throw new Error(`Failed to create bucket '${bucketName}': ${createError.message}`);
    } else {
      console.log(`Bucket '${bucketName}' created successfully with limit ${limit}.`);
    }
  } else {
    // Bucket exists, try to update configuration
    console.log(`Bucket '${bucketName}' exists. Updating configuration to 500MB limit...`);
    try {
      const limit = 524288000;
      const { data, error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: limit,
        allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
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
