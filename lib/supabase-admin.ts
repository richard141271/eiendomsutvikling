
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
    const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: null, // Unlimited
      allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
    });

    if (createError) {
      console.error(`Error creating bucket '${bucketName}':`, createError);
      throw new Error(`Failed to create bucket '${bucketName}': ${createError.message}`);
    } else {
      console.log(`Bucket '${bucketName}' created successfully.`);
    }
  } else {
    // Bucket exists, try to update configuration
    console.log(`Bucket '${bucketName}' exists. Updating configuration to UNLIMITED limit...`);
    try {
      const { data, error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: null, // Unlimited
        allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
      });
      
      if (updateError) {
        console.warn(`Warning: Could not update bucket '${bucketName}': ${updateError.message}`);
        // Do not throw here, as the bucket might already be configured correctly
        // and some environments return weird errors on update.
      } else {
        console.log(`Bucket '${bucketName}' updated successfully.`);
      }
    } catch (e) {
      console.warn(`Warning: Exception during bucket update:`, e);
    }
  }
}
