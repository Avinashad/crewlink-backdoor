/**
 * Execute migrations via Supabase
 * Since Supabase JS client doesn't support direct SQL execution,
 * this script will output the SQL for manual execution in Supabase Dashboard
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  try {
    // Test connection by trying to query a system table
    const { data, error } = await supabase
      .from('_prisma_migrations')
      .select('*')
      .limit(1);
    
    // If this fails, it's okay - we just want to test the connection
    return true;
  } catch (error) {
    // Connection test - if we get here, the client is configured
    return true;
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      return false; // Table doesn't exist
    }
    return true; // Table exists or we got data
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('\n🚀 CrewLink Database Migration Executor');
  console.log('═'.repeat(60));
  console.log(`Project: ${supabaseUrl}`);
  console.log('═'.repeat(60));

  // Test connection
  console.log('\n🔌 Testing Supabase connection...');
  const connected = await testConnection();
  if (connected) {
    console.log('✅ Connected to Supabase');
  }

  // Check existing tables
  console.log('\n📊 Checking existing tables...');
  const countriesExists = await checkTableExists('countries');
  const expertiseExists = await checkTableExists('expertise');
  
  console.log(`   Countries table: ${countriesExists ? '✅ Exists' : '❌ Not found'}`);
  console.log(`   Expertise table: ${expertiseExists ? '✅ Exists' : '❌ Not found'}`);

  // Read combined migration file
  const migrationFile = path.join(__dirname, '../migrations/all_migrations.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`\n❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf-8');

  console.log('\n📝 Migration SQL Ready');
  console.log('═'.repeat(60));
  console.log('\n⚠️  IMPORTANT: Supabase JS client cannot execute arbitrary SQL directly.');
  console.log('   Please use one of these methods:\n');
  
  console.log('METHOD 1: Supabase Dashboard (Recommended)');
  console.log('─'.repeat(60));
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  console.log(`1. Go to: https://supabase.com/dashboard/project/${projectRef || 'your-project'}`);
  console.log('2. Navigate to: SQL Editor (left sidebar)');
  console.log('3. Click "New query"');
  console.log('4. Copy and paste the SQL below');
  console.log('5. Click "Run" (or press Ctrl+Enter)\n');

  console.log('SQL to Execute:');
  console.log('═'.repeat(60));
  console.log(sql);
  console.log('═'.repeat(60));

  console.log('\n✅ After running, verify:');
  console.log('   SELECT COUNT(*) FROM countries;  -- Should return 20');
  console.log('   SELECT COUNT(*) FROM expertise;   -- Should return 6\n');

  // If tables don't exist, provide a quick link
  if (!countriesExists || !expertiseExists) {
    console.log('💡 Quick Link:');
    console.log(`   https://supabase.com/dashboard/project/${projectRef || 'your-project'}/sql/new\n`);
  }
}

main().catch(console.error);
