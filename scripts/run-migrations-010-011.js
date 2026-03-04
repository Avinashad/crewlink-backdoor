/**
 * Run migrations 010 and 011 (worker_profiles, organisation_clients, user_documents, org_reference_codes).
 * Requires DATABASE_URL in .env, e.g.:
 *   postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres
 * Or set SUPABASE_URL and SUPABASE_DB_PASSWORD to build the URL.
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && supabaseUrl && dbPassword) {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    const projectRef = match[1];
    databaseUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
  }
}

if (!databaseUrl) {
  console.error('Missing database connection. Set either:');
  console.error('  DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres');
  console.error('  or SUPABASE_URL + SUPABASE_DB_PASSWORD in .env');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, '..', 'migrations');
const files = [
  '010_worker_profiles_organisation_clients_user_documents.sql',
  '011_org_reference_codes.sql',
];

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database.\n');
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn('Skip (not found):', file);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log('Running:', file);
      await client.query(sql);
      console.log('OK:', file);
    }
    console.log('\nMigrations completed.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
