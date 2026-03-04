-- Sprint 2: Worker Core
-- Worker profiles, categories, and saved jobs

-- Worker categories (reference table)
CREATE TABLE IF NOT EXISTS worker_categories (
    key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Insert default categories
INSERT INTO worker_categories (key, display_name, description, display_order) VALUES
    ('hospitality', 'Hospitality', 'General hospitality work including hotels, restaurants, and events', 1),
    ('hotel', 'Hotel Services', 'Front desk, housekeeping, concierge, and hotel operations', 2),
    ('restaurant', 'Restaurant & Food Service', 'Serving, cooking, bartending, and food service', 3),
    ('care', 'Care Work', 'Old-age care, disability support, and personal care services', 4)
ON CONFLICT (key) DO NOTHING;
-- Worker profiles (main profile for workers)
CREATE TABLE IF NOT EXISTS worker_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    market_country TEXT NOT NULL CHECK (market_country IN ('NP', 'NZ')),
    active_category_key TEXT REFERENCES worker_categories(key),
    availability_type TEXT CHECK (availability_type IN ('full_time', 'part_time', 'casual', 'on_call')),
    shift_preferences TEXT[] DEFAULT '{}',
    right_to_work_attested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Worker category profiles (category-specific onboarding data)
CREATE TABLE IF NOT EXISTS worker_category_profiles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_key TEXT REFERENCES worker_categories(key),
    experience_level TEXT CHECK (experience_level IN ('entry', 'intermediate', 'experienced', 'expert')),
    onboarding_status TEXT CHECK (onboarding_status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    country_specific_data JSONB DEFAULT '{}', -- Stores country-specific fields (NP vs NZ)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, category_key)
);
-- Saved jobs (workers can save jobs for later)
CREATE TABLE IF NOT EXISTS saved_jobs (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_post_id UUID, -- Will reference job_posts table (created in Sprint 3)
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, job_post_id)
);
-- Enable RLS on all tables
ALTER TABLE worker_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_category_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
-- RLS Policies for worker_categories (public read)
CREATE POLICY "Anyone can view active categories"
    ON worker_categories FOR SELECT
    USING (is_active = true);
-- RLS Policies for worker_profiles
CREATE POLICY "Users can view own worker profile"
    ON worker_profiles FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can update own worker profile"
    ON worker_profiles FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own worker profile"
    ON worker_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- RLS Policies for worker_category_profiles
CREATE POLICY "Users can view own category profiles"
    ON worker_category_profiles FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can update own category profiles"
    ON worker_category_profiles FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own category profiles"
    ON worker_category_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- RLS Policies for saved_jobs
CREATE POLICY "Users can view own saved jobs"
    ON saved_jobs FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own saved jobs"
    ON saved_jobs FOR ALL
    USING (auth.uid() = user_id);
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_worker_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_worker_profiles_updated_at ON worker_profiles;
CREATE TRIGGER update_worker_profiles_updated_at
    BEFORE UPDATE ON worker_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_profiles_updated_at();
DROP TRIGGER IF EXISTS update_worker_category_profiles_updated_at ON worker_category_profiles;
CREATE TRIGGER update_worker_category_profiles_updated_at
    BEFORE UPDATE ON worker_category_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- Function to update user_type in profiles when worker profile is created
CREATE OR REPLACE FUNCTION update_profile_user_type()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET user_type = 'worker'
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to set user_type when worker profile is created
DROP TRIGGER IF EXISTS set_worker_user_type ON worker_profiles;
CREATE TRIGGER set_worker_user_type
    AFTER INSERT ON worker_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_user_type();
