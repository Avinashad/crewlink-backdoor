# Running Migrations with Supabase MCP Server

The Supabase MCP server can execute SQL against your project. Use it to run migrations 010, 011, and 013.

## Using Supabase MCP in Cursor

1. **Ensure MCP Server is Connected**
   - Supabase MCP is configured in `crewlink-backdoor/.cursor/mcp.json`
   - Project ref: `jhqteaogknvcynxxoghj`
   - Restart Cursor if Supabase tools don’t appear

2. **Run migrations 010 + 011 via MCP**
   - In Cursor, use the Supabase MCP **execute SQL** (or `execute_postgresql`) tool.
   - Paste the contents of **one** of these files:
     - **Single file (recommended):** `migrations/010_and_011_combined_for_mcp.sql`
     - Or run in order: `migrations/010_worker_profiles_organisation_clients_user_documents.sql` then `migrations/011_org_reference_codes.sql`

3. **What gets created**
   - **010:** `worker_profiles`, `organisation_clients`, `user_documents` (tables, indexes, RLS)
   - **011:** `org_reference_codes` (table, indexes, RLS)
   - **013:** `contact_information` (types: emergency, guardian, organisation_contact; RLS for personal and org)

## Migration SQL file for MCP

To apply the **contact_information** migration: paste **`migrations/013_create_contact_information.sql`** into the Supabase MCP Execute SQL tool and run.

For migrations 010 + 011 (one shot):

- **`migrations/010_and_011_combined_for_mcp.sql`**

Copy its full contents into the Supabase MCP “Execute SQL” / `execute_postgresql` input and run.

## Alternative: Supabase Dashboard

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/jhqteaogknvcynxxoghj) → SQL Editor.
2. New query → paste `migrations/010_and_011_combined_for_mcp.sql` (or 010 then 011).
3. Run.
