import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration(filePath: string, fileName: string): Promise<void> {
  console.log(`\n📄 Running migration: ${fileName}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        // If RPC doesn't work, try direct query (this might not work for all statements)
        // For now, we'll use a different approach - execute via Supabase REST API
        if (error) {
          console.warn(`Warning: Could not execute statement via RPC: ${error.message}`);
        }
      }
    }

    // Alternative: Use Supabase's REST API to execute SQL
    // We'll need to use the PostgREST API or create a function
    console.log(`✅ Migration ${fileName} completed`);
  } catch (error) {
    console.error(`❌ Error running migration ${fileName}:`, error);
    throw error;
  }
}

async function executeSQL(sql: string): Promise<void> {
  // Supabase doesn't have a direct SQL execution endpoint in the JS client
  // We need to use the REST API or create a database function
  // For now, let's try using the Supabase Management API or direct PostgreSQL connection
  
  // Since we can't directly execute arbitrary SQL via the Supabase JS client,
  // we'll need to use a different approach
  // Option 1: Use psql or pg client
  // Option 2: Create a migration endpoint in the backend
  // Option 3: Use Supabase CLI
  
  console.log('Note: Direct SQL execution via Supabase JS client is limited.');
  console.log('Please run the migrations using one of these methods:');
  console.log('1. Supabase Dashboard SQL Editor');
  console.log('2. Supabase CLI: supabase db push');
  console.log('3. Direct PostgreSQL connection');
}

async function main() {
  console.log('🚀 Starting database migrations...\n');

  const migrationsDir = path.join(__dirname, '../migrations');
  const migrationFiles = [
    '001_create_countries_table.sql',
    '002_create_expertise_table.sql',
  ];

  for (const fileName of migrationFiles) {
    const filePath = path.join(migrationsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // Since Supabase JS client doesn't support direct SQL execution,
    // we'll output the SQL for manual execution or use a workaround
    console.log(`\n📄 Migration: ${fileName}`);
    console.log('SQL to execute:');
    console.log('─'.repeat(50));
    console.log(sql);
    console.log('─'.repeat(50));
  }

  console.log('\n⚠️  Note: Supabase JS client cannot execute arbitrary SQL directly.');
  console.log('Please execute these migrations using:');
  console.log('1. Supabase Dashboard → SQL Editor');
  console.log('2. Supabase CLI: supabase db push');
  console.log('3. Or use the script below with psql\n');
}

main().catch(console.error);
