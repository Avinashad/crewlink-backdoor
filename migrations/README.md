# Database Migrations

## Running Migrations

To set up the database tables in your Supabase database:

1. **Option 1: npm run migrate (010 and 011)**
   - In `.env`, set either `DATABASE_URL` or `SUPABASE_URL` + `SUPABASE_DB_PASSWORD`.
   - Database password: Supabase Dashboard → Settings → Database.
   - Then run: `npm run migrate`

2. **Option 2: Using Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of each migration file in order (001 through 011)
   - Run the SQL scripts

3. **Option 3: Using Supabase CLI**
   ```bash
   supabase db push
   ```

4. **Option 4: Direct SQL Execution**
   - Connect to your Supabase database using any PostgreSQL client
   - Execute the SQL files in order: `001_create_countries_table.sql`, then `002_create_expertise_table.sql`, etc.

---

## Migration 001: Countries Table

### What it Does

- Creates a `countries` table with the following structure:
  - `id` (UUID, primary key)
  - `code` (VARCHAR(2), unique, indexed) - ISO country code (e.g., "GB", "DE")
  - `name` (VARCHAR(100)) - Full country name
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

- Inserts 20 initial countries (European countries)

- Creates an index on the `code` column for faster lookups

- Sets up an automatic `updated_at` trigger

### Adding More Countries

To add more countries, you can insert them directly into the database:

```sql
INSERT INTO countries (code, name) VALUES
  ('US', 'United States'),
  ('CA', 'Canada')
ON CONFLICT (code) DO NOTHING;
```

---

## Migration 002: Expertise Table

### What it Does

- Creates an `expertise` table with the following structure:
  - `id` (UUID, primary key)
  - `code` (VARCHAR(50), unique, indexed) - Unique identifier (e.g., "construction", "logistics")
  - `name` (VARCHAR(100)) - Display name (e.g., "Construction", "Logistics")
  - `icon_name` (VARCHAR(50)) - Icon identifier for frontend mapping (e.g., "Wrench", "Truck")
  - `is_active` (BOOLEAN) - Whether the expertise is active/visible
  - `display_order` (INTEGER) - Order for display in UI
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

- Inserts 6 initial expertise types:
  - Construction (Wrench icon)
  - Logistics (Truck icon)
  - IT & Tech (Monitor icon)
  - Healthcare (Cross icon)
  - Energy (Zap icon)
  - Agriculture (Tractor icon)

- Creates indexes on `code` and `is_active` columns

- Sets up an automatic `updated_at` trigger

### Managing Expertise (Admin Panel)

Expertise can be managed through the API endpoints:

- **GET** `/api/expertise` - Get all active expertise (public)
- **GET** `/api/expertise?includeInactive=true` - Get all expertise including inactive
- **GET** `/api/expertise/:code` - Get expertise by code
- **POST** `/api/expertise` - Create new expertise (Admin only, requires auth)
- **PUT** `/api/expertise/:id` - Update expertise (Admin only, requires auth)
- **DELETE** `/api/expertise/:id` - Delete expertise (Admin only, requires auth)

### Adding More Expertise

To add more expertise types, you can insert them directly into the database:

```sql
INSERT INTO expertise (code, name, icon_name, display_order) VALUES
  ('hospitality', 'Hospitality', 'Utensils', 7),
  ('education', 'Education', 'GraduationCap', 8)
ON CONFLICT (code) DO NOTHING;
```

### Available Icon Names

The frontend supports these icon names (from lucide-react):
- Wrench
- Truck
- Monitor
- Cross
- Zap
- Tractor
- Utensils
- GraduationCap
- (Add more as needed in the frontend iconMap)
