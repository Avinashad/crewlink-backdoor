/**
 * Run migrations using Supabase client
 * This script uses the Supabase REST API to execute SQL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

async function executeSQL(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const results = [];

  for (const statement of statements) {
    if (!statement.trim()) continue;

    try {
      // Try using RPC to execute SQL (requires a database function)
      // Since we can't execute arbitrary SQL directly, we'll need to use a different approach
      
      // Alternative: Use the Supabase REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql_query: statement }),
      });

      if (!response.ok) {
        // If RPC doesn't exist, we'll need to create it or use another method
        console.warn(`⚠️  Could not execute via RPC, trying alternative method...`);
        
        // For now, we'll output the SQL for manual execution
        results.push({
          statement: statement.substring(0, 50) + '...',
          success: false,
          method: 'manual_required',
        });
      } else {
        results.push({
          statement: statement.substring(0, 50) + '...',
          success: true,
        });
      }
    } catch (error) {
      results.push({
        statement: statement.substring(0, 50) + '...',
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

async function runMigration(fileName) {
  const filePath = path.join(__dirname, '../migrations', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${filePath}`);
    return { success: false, error: 'File not found' };
  }

  console.log(`\n📄 Running migration: ${fileName}`);
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  // Since Supabase JS client doesn't support direct SQL execution,
  // we'll use the Supabase Dashboard SQL Editor approach
  console.log('\n⚠️  Note: Supabase JS client cannot execute arbitrary SQL directly.');
  console.log('Please execute this migration using Supabase Dashboard SQL Editor.\n');
  console.log('SQL to execute:');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  
  return { success: true, sql };
}

async function main() {
  console.log('🚀 Running Supabase Migrations');
  console.log('═'.repeat(60));
  console.log(`Project: ${supabaseUrl}`);
  console.log('═'.repeat(60));

  const migrations = [
    '001_create_countries_table.sql',
    '002_create_expertise_table.sql',
  ];

  for (const migration of migrations) {
    await runMigration(migration);
  }

  console.log('\n✅ Migration SQL displayed above.');
  console.log('📝 Next steps:');
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Copy and paste each migration SQL above');
  console.log('3. Click "Run" for each migration');
  console.log('\n🔗 Dashboard: https://supabase.com/dashboard');
}

main().catch(console.error);
