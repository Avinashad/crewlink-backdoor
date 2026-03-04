/**
 * This script uses Supabase Management API to run migrations
 * Note: This requires the Supabase Management API key or using Supabase CLI
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log('🚀 Supabase Migration Runner');
console.log('─'.repeat(50));
console.log(`Project: ${projectRef || 'Unknown'}`);
console.log(`URL: ${supabaseUrl || 'Not set'}`);
console.log('─'.repeat(50));

console.log('\n📋 Recommended Method: Supabase Dashboard');
console.log('1. Go to: https://supabase.com/dashboard');
console.log(`2. Select your project (${projectRef || 'your-project'})`);
console.log('3. Navigate to: SQL Editor');
console.log('4. Run the following migrations in order:\n');

const migrationsDir = path.join(__dirname, '../migrations');
const migrationFiles = [
  '001_create_countries_table.sql',
  '002_create_expertise_table.sql',
];

migrationFiles.forEach((fileName, index) => {
  const filePath = path.join(migrationsDir, fileName);
  
  if (fs.existsSync(filePath)) {
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Migration ${index + 1}: ${fileName}`);
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));
  } else {
    console.log(`\n❌ File not found: ${fileName}`);
  }
});

console.log('\n✅ Copy each migration SQL above and run it in Supabase SQL Editor');
console.log('\n📝 Alternative: Use Supabase CLI');
console.log('   supabase db push');
