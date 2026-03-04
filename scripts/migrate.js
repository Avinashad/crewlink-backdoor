/**
 * Migration Runner for Supabase
 * This script will help you run migrations via Supabase Dashboard or CLI
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log('\n🚀 CrewLink Database Migrations');
console.log('═'.repeat(60));
console.log(`Project: ${projectRef || 'Unknown'}`);
console.log(`Supabase URL: ${supabaseUrl || 'Not set'}`);
console.log('═'.repeat(60));

const migrationsDir = path.join(__dirname, '../migrations');
const migrationFiles = [
  { file: '001_create_countries_table.sql', name: 'Countries Table' },
  { file: '002_create_expertise_table.sql', name: 'Expertise Table' },
];

console.log('\n📋 Migration Files:');
migrationFiles.forEach((m, i) => {
  const filePath = path.join(migrationsDir, m.file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${i + 1}. ${m.name} (${m.file})`);
});

console.log('\n📝 To run migrations, choose one of these methods:\n');

console.log('METHOD 1: Supabase Dashboard (Recommended)');
console.log('─'.repeat(60));
console.log(`1. Go to: https://supabase.com/dashboard/project/${projectRef || 'your-project'}`);
console.log('2. Navigate to: SQL Editor (left sidebar)');
console.log('3. Click "New query"');
console.log('4. Copy and paste each migration SQL below');
console.log('5. Click "Run" for each migration\n');

migrationFiles.forEach((migration, index) => {
  const filePath = path.join(migrationsDir, migration.file);
  
  if (fs.existsSync(filePath)) {
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`MIGRATION ${index + 1}: ${migration.name}`);
    console.log(`File: ${migration.file}`);
    console.log('═'.repeat(60));
    console.log(sql);
    console.log('═'.repeat(60));
  }
});

console.log('\n\nMETHOD 2: Supabase CLI');
console.log('─'.repeat(60));
console.log('1. Install Supabase CLI: npm install -g supabase');
console.log('2. Login: supabase login');
console.log('3. Link project: supabase link --project-ref ' + (projectRef || 'your-project-ref'));
console.log('4. Push migrations: supabase db push\n');

console.log('METHOD 3: Direct PostgreSQL Connection');
console.log('─'.repeat(60));
console.log('1. Get database password from Supabase Dashboard → Settings → Database');
console.log('2. Use psql or any PostgreSQL client:');
console.log(`   psql "postgresql://postgres:[PASSWORD]@db.${projectRef || 'project'}.supabase.co:5432/postgres"`);
console.log('3. Run: \\i migrations/001_create_countries_table.sql');
console.log('4. Run: \\i migrations/002_create_expertise_table.sql\n');

console.log('✅ After running migrations, verify data:');
console.log('─'.repeat(60));
console.log('Countries: SELECT COUNT(*) FROM countries; (should return 20)');
console.log('Expertise: SELECT COUNT(*) FROM expertise; (should return 6)\n');
