
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

type EnsureBucketOptions = {
  public?: boolean;
  allowedMimeTypes?: string[] | null;
};

export async function ensureBucketExists(bucketName: string, options?: EnsureBucketOptions) {
  const supabase = createAdminClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error("Error listing buckets:", error);
    return;
  }

  const bucketExists = buckets.find(b => b.name === bucketName);
  const isPublic = options?.public ?? true;
  const defaultAllowed = ['application/pdf', 'image/png', 'image/jpeg'];
  const allowedMimeTypes =
    options?.allowedMimeTypes === undefined ? defaultAllowed : options.allowedMimeTypes ?? undefined;
  const bucketConfig = {
    public: isPublic,
    ...(allowedMimeTypes ? { allowedMimeTypes } : {}),
  };

  if (!bucketExists) {
    console.log(`Bucket '${bucketName}' not found. Creating...`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, bucketConfig);

    if (createError) {
      console.error(`Error creating bucket '${bucketName}':`, createError);
      throw new Error(`Failed to create bucket '${bucketName}': ${createError.message}`);
    } else {
      console.log(`Bucket '${bucketName}' created successfully.`);
    }
  } else {
    console.log(`Bucket '${bucketName}' exists. Updating configuration...`);
    try {
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, bucketConfig);
      
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
