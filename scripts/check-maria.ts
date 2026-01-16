
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for users named Maria...');
  const marias = await prisma.user.findMany({
    where: { name: { contains: 'Maria', mode: 'insensitive' } }
  });

  console.log(`Found ${marias.length} users named Maria in Prisma:`);
  marias.forEach(u => {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, AuthID: ${u.authId}`);
  });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  
  console.log('\nFetching Supabase users...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching Supabase users:', error);
    return;
  }

  console.log(`Found ${users.length} users in Supabase Auth.`);
  
  // Check for matches
  marias.forEach(dbUser => {
    const authUser = users.find(u => u.id === dbUser.authId);
    if (authUser) {
        console.log(`\nUser ${dbUser.name} (${dbUser.email}) IS linked to Supabase Auth user ${authUser.id} (${authUser.email})`);
    } else {
        console.log(`\nUser ${dbUser.name} (${dbUser.email}) is NOT linked to any existing Supabase Auth user (AuthID: ${dbUser.authId || 'null'})`);
        // Try to find by email
        if (dbUser.email) {
            const emailMatch = users.find(u => u.email?.toLowerCase() === dbUser.email?.toLowerCase());
            if (emailMatch) {
                console.log(`  -> But found a Supabase user with matching email: ${emailMatch.email} (ID: ${emailMatch.id}). Should update Prisma!`);
            } else {
                console.log(`  -> And no Supabase user found with email ${dbUser.email}`);
            }
        }
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
