# Migration 010: Improved schema – no redundancy, scalable, traceable

This design improves the DB schema so that:

- **No data redundancy**: Identity in auth.users; one user_profile per user; worker and org-client data only in dedicated tables referencing user_id/org_id.
- **Scalable**: Adding a worker profile or org-client link does not duplicate user data; documents are separate rows.
- **Traceable**: When a user creates a worker profile or gets linked to an organisation is visible via timestamps (and optional audit).

---

## 1. Naming and consistency

- Use **org_id** everywhere (match existing `org_memberships`, `job_posts`, etc.). Migration 008 uses `organization_id` in `reference_requests` and `client_moderation_records`; consider adding a compatibility view or migrating those to `org_id` in a later step if needed.
- **user_profiles**: Single place for shareable personal data per user (can rename from or coexist with `personal_profiles`).
- **worker_profiles**: One row per user who is a worker; only worker-specific fields.
- **organisation_clients**: Link table user–org as client, with status and timestamps.

---

## 2. Table: user_profiles (or keep personal_profiles)

**Option A – New table `user_profiles`**

- One row per user (`user_id` PK, FK to auth.users).
- Columns: display_name, date_of_birth, country_code, city, address_line1, address_line2, postal_code, client_notes (for personal care client).
- **No** worker_bio, worker_experience_years here (move to worker_profiles).
- created_at, updated_at.

**Option B – Keep `personal_profiles`**

- Keep existing table; add **worker_profiles** and migrate worker-only fields (worker_bio, worker_experience_years) into worker_profiles; optionally drop those columns from personal_profiles in a later migration to avoid redundancy.
- Treat personal_profiles as the “user profile” for shareable data; worker_profiles holds only worker-specific data.

---

## 3. Table: worker_profiles

- **id** UUID PK.
- **user_id** UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE.
- **worker_bio** TEXT.
- **worker_experience_years** INTEGER.
- **availability** JSONB (e.g. days/times, timezone).
- **expertise_codes** JSONB or separate table worker_profile_expertise (worker_profile_id, expertise_code). JSONB array of codes is simpler and avoids redundancy.
- **created_at**, **updated_at** TIMESTAMP WITH TIME ZONE.

Indexes: user_id (unique), created_at (for “when did they become a worker”).

RLS: User can SELECT/INSERT/UPDATE own row (user_id = auth.uid()).

---

## 4. Table: organisation_clients

- **id** UUID PK.
- **user_id** UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE.
- **org_id** UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE.
- **status** TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'blocked')) DEFAULT 'pending'.
- **requested_at** TIMESTAMP WITH TIME ZONE DEFAULT NOW().
- **verified_at** TIMESTAMP WITH TIME ZONE.
- **verified_by** UUID REFERENCES auth.users(id).
- **org_notes** TEXT (org-specific notes about this client; no copy of name/address).
- **created_at**, **updated_at** TIMESTAMP WITH TIME ZONE.
- UNIQUE(user_id, org_id).

Indexes: user_id, org_id, status, requested_at.

RLS:

- User can SELECT own rows (user_id = auth.uid()).
- Org members (via org_memberships) can SELECT/UPDATE rows for their org_id.
- Insert: user can insert for themselves (user_id = auth.uid()) with status = 'pending'; or backend with service role when claiming reference code.

---

## 5. Table: user_documents

- **id** UUID PK.
- **user_id** UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE.
- **type** TEXT NOT NULL CHECK (type IN ('document', 'invoice', 'job', 'contract')) – or extend as needed.
- **file_path** TEXT NOT NULL (e.g. Supabase Storage path).
- **file_name** TEXT (original name).
- **metadata** JSONB DEFAULT '{}'.
- **created_at** TIMESTAMP WITH TIME ZONE DEFAULT NOW().

Indexes: user_id, type, created_at.

RLS: User can SELECT/INSERT/UPDATE/DELETE own rows (user_id = auth.uid()).

---

## 6. Optional: profile_events (audit / traceability)

- **id** UUID PK.
- **event_type** TEXT NOT NULL (e.g. 'worker_profile_created', 'organisation_client_linked', 'organisation_client_verified').
- **entity_type** TEXT (e.g. 'worker_profile', 'organisation_client').
- **entity_id** UUID.
- **user_id** UUID REFERENCES auth.users(id).
- **payload** JSONB DEFAULT '{}'.
- **created_at** TIMESTAMP WITH TIME ZONE DEFAULT NOW().

Indexes: user_id, entity_type, entity_id, created_at.

Insert from backend only (service role or SECURITY DEFINER function). Enables “when did this user create a worker profile?” and “when did they get linked to this org?” without scanning multiple tables.

---

## 7. client_moderation_records (existing)

- Keep as **audit/history** of moderation decisions (approved/blocked/flagged).
- Current “live” state of a user–org client relationship lives in **organisation_clients.status**.
- When org approves a pending client: update organisation_clients (status = approved, verified_at, verified_by) and optionally insert client_moderation_records (decision = 'approved') for audit.

---

## 8. Migration order (suggested)

1. Create **worker_profiles** (include worker_bio, worker_experience_years; optionally backfill from personal_profiles where those fields are set).
2. Create **organisation_clients** (user_id, org_id, status, requested_at, verified_at, verified_by, org_notes, timestamps).
3. Create **user_documents** (user_id, type, file_path, file_name, metadata, created_at).
4. Optional: create **profile_events**.
5. Optionally: add trigger or application logic to insert profile_events on worker_profiles insert and organisation_clients insert/update.
6. Do **not** drop personal_profiles columns in this migration if existing code still reads them; add worker_profiles and migrate reads in app first, then deprecate worker columns from personal_profiles in a later migration.

---

## 9. Data flow summary

| Event | Tables touched | Traceability |
|-------|----------------|--------------|
| User signs up | auth.users; optional user_profiles/personal_profiles | auth.users.created_at |
| User creates worker profile | worker_profiles INSERT | worker_profiles.created_at; optional profile_events |
| User links to org as client (reference code) | organisation_clients INSERT (status=pending, requested_at=NOW()) | organisation_clients.requested_at |
| Org verifies client | organisation_clients UPDATE (status=approved, verified_at, verified_by); optional client_moderation_records INSERT | organisation_clients.verified_at, verified_by |
| User uploads document | user_documents INSERT | user_documents.created_at |

No duplication of name/address: always join auth.users (metadata) or user_profiles when displaying a worker or org-client.
