-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(100) NOT NULL, -- e.g., 'users', 'onboarding', 'roles'
  action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Create user_roles table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL, -- References auth.users(id) from Supabase
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID, -- References auth.users(id) from Supabase
  PRIMARY KEY (user_id, role_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_permissions_slug ON permissions(slug);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Create updated_at triggers
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default permissions
INSERT INTO permissions (name, slug, description, resource, action) VALUES
  -- User management permissions
  ('View Users', 'users.view', 'View list of users', 'users', 'read'),
  ('Create Users', 'users.create', 'Create new users', 'users', 'create'),
  ('Update Users', 'users.update', 'Update existing users', 'users', 'update'),
  ('Delete Users', 'users.delete', 'Delete users', 'users', 'delete'),
  
  -- Role management permissions
  ('View Roles', 'roles.view', 'View list of roles', 'roles', 'read'),
  ('Create Roles', 'roles.create', 'Create new roles', 'roles', 'create'),
  ('Update Roles', 'roles.update', 'Update existing roles', 'roles', 'update'),
  ('Delete Roles', 'roles.delete', 'Delete roles', 'roles', 'delete'),
  ('Assign Roles', 'roles.assign', 'Assign roles to users', 'roles', 'update'),
  
  -- Permission management permissions
  ('View Permissions', 'permissions.view', 'View list of permissions', 'permissions', 'read'),
  ('Manage Permissions', 'permissions.manage', 'Manage permissions', 'permissions', 'update'),
  
  -- Onboarding permissions
  ('View Onboarding', 'onboarding.view', 'View onboarding steps', 'onboarding', 'read'),
  ('Create Onboarding', 'onboarding.create', 'Create onboarding steps', 'onboarding', 'create'),
  ('Update Onboarding', 'onboarding.update', 'Update onboarding steps', 'onboarding', 'update'),
  ('Delete Onboarding', 'onboarding.delete', 'Delete onboarding steps', 'onboarding', 'delete'),
  
  -- Dashboard permissions
  ('View Dashboard', 'dashboard.view', 'View dashboard', 'dashboard', 'read'),
  
  -- Settings permissions
  ('View Settings', 'settings.view', 'View settings', 'settings', 'read'),
  ('Update Settings', 'settings.update', 'Update settings', 'settings', 'update')
ON CONFLICT (slug) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name, slug, description, is_system) VALUES
  ('Super Admin', 'superadmin', 'Full system access with all permissions', TRUE),
  ('Admin', 'admin', 'Administrative access with most permissions', TRUE),
  ('Manager', 'manager', 'Manager role with limited administrative access', FALSE),
  ('Viewer', 'viewer', 'Read-only access to most resources', FALSE)
ON CONFLICT (slug) DO NOTHING;

-- Assign all permissions to superadmin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'superadmin'
ON CONFLICT DO NOTHING;

-- Assign common permissions to admin role (all except role/permission management)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'admin'
  AND p.slug NOT IN ('roles.create', 'roles.update', 'roles.delete', 'permissions.manage')
ON CONFLICT DO NOTHING;

-- Assign view permissions to viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'viewer'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;
