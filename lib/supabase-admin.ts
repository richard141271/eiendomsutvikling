
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
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
    });

    if (createError) {
      console.error(`Error creating bucket '${bucketName}':`, createError);
    } else {
      console.log(`Bucket '${bucketName}' created successfully.`);
    }
  } else {
    // Bucket exists, ensure configuration is correct (update limit)
    const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg']
    });
    
    if (updateError) {
      console.error(`Error updating bucket '${bucketName}':`, updateError);
    }
  }
}
