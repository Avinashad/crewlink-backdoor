/**
 * Verify migrations and data seeding
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyMigrations() {
  console.log('\n🔍 Verifying Database Migrations');
  console.log('═'.repeat(60));

  try {
    // Check countries
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('*', { count: 'exact' });

    if (countriesError) {
      console.log('❌ Countries table error:', countriesError.message);
    } else {
      console.log(`✅ Countries table: ${countries?.length || 0} records`);
      if (countries && countries.length > 0) {
        console.log(`   Sample: ${countries.slice(0, 3).map(c => c.name).join(', ')}...`);
      }
    }

    // Check expertise
    const { data: expertise, error: expertiseError } = await supabase
      .from('expertise')
      .select('*', { count: 'exact' });

    if (expertiseError) {
      console.log('❌ Expertise table error:', expertiseError.message);
    } else {
      console.log(`✅ Expertise table: ${expertise?.length || 0} records`);
      if (expertise && expertise.length > 0) {
        console.log(`   Sample: ${expertise.slice(0, 3).map(e => e.name).join(', ')}...`);
      }
    }

    console.log('\n📊 Summary:');
    console.log('─'.repeat(60));
    const countriesCount = countries?.length || 0;
    const expertiseCount = expertise?.length || 0;
    
    if (countriesCount === 20 && expertiseCount === 6) {
      console.log('✅ All migrations completed successfully!');
      console.log(`   Countries: ${countriesCount}/20 ✅`);
      console.log(`   Expertise: ${expertiseCount}/6 ✅`);
    } else {
      console.log('⚠️  Migrations may need to be run:');
      if (countriesCount !== 20) {
        console.log(`   Countries: ${countriesCount}/20 (Expected 20)`);
      }
      if (expertiseCount !== 6) {
        console.log(`   Expertise: ${expertiseCount}/6 (Expected 6)`);
      }
      console.log('\n💡 Run the migration SQL in Supabase Dashboard SQL Editor');
    }

  } catch (error) {
    console.error('❌ Error verifying migrations:', error.message);
  }
}

verifyMigrations().catch(console.error);
