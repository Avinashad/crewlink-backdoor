const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

// Extract database connection details from Supabase URL
// Supabase URL format: https://[project-ref].supabase.co
// We need to construct the PostgreSQL connection string
// For Supabase, the connection string format is:
// postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

function extractProjectRef(url) {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
}

const projectRef = extractProjectRef(supabaseUrl);

if (!projectRef) {
  console.error('Error: Could not extract project reference from SUPABASE_URL');
  process.exit(1);
}

console.log('📋 Migration Script');
console.log('─'.repeat(50));
console.log(`Project: ${projectRef}`);
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('─'.repeat(50));
console.log('\n⚠️  To run migrations, you need:');
console.log('1. Database password (from Supabase Dashboard → Settings → Database)');
console.log('2. psql installed on your system\n');

console.log('Run this command with your database password:');
console.log('─'.repeat(50));
console.log(`psql "postgresql://postgres:[YOUR_PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" -f migrations/001_create_countries_table.sql`);
console.log(`psql "postgresql://postgres:[YOUR_PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" -f migrations/002_create_expertise_table.sql`);
console.log('─'.repeat(50));

console.log('\n📝 Or use Supabase Dashboard:');
console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef);
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the contents of each migration file');
console.log('4. Run the SQL\n');

// Read and display migration files
const migrationsDir = path.join(__dirname, '../migrations');
const migrationFiles = [
  '001_create_countries_table.sql',
  '002_create_expertise_table.sql',
];

console.log('📄 Migration Files:');
migrationFiles.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} (not found)`);
  }
});
