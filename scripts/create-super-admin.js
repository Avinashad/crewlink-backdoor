const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperAdmin() {
  const email = 'aowidemo+superadmin@gmail.com';
  const password = 'Asdf@12345';
  const firstName = 'Super';
  const lastName = 'Admin';

  console.log('Creating super admin user...');

  try {
    // Create user using Admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        user_type: 'admin',
      },
    });

    if (userError) {
      console.error('Error creating user:', userError);
      process.exit(1);
    }

    if (!userData.user) {
      console.error('Failed to create user - no user data returned');
      process.exit(1);
    }

    const userId = userData.user.id;
    console.log(`✓ User created successfully with ID: ${userId}`);

    // Get the superadmin role ID
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('slug', 'superadmin')
      .single();

    if (roleError || !roleData) {
      console.error('Error fetching superadmin role:', roleError);
      console.log('User created but role not assigned. You may need to assign the role manually.');
      process.exit(1);
    }

    const roleId = roleData.id;
    console.log(`✓ Found superadmin role with ID: ${roleId}`);

    // Assign superadmin role to user
    const { error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
      });

    if (assignError) {
      console.error('Error assigning superadmin role:', assignError);
      console.log('User created but role not assigned. You may need to assign the role manually.');
      process.exit(1);
    }

    console.log('✓ Superadmin role assigned successfully');
    console.log('\n=== Super Admin User Created Successfully ===');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${userId}`);
    console.log(`Role: Super Admin`);
    console.log('\nYou can now log in with these credentials.');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

createSuperAdmin();
