-- Fix: Allow trigger function to insert profiles
-- The handle_new_user() trigger needs to be able to insert into profiles

-- Add INSERT policy for the trigger function
-- Since the function is SECURITY DEFINER, we need to ensure it can insert
-- We'll add a policy that allows inserts when called from the trigger context

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- Add INSERT policy that allows users to insert their own profile
-- This is needed for the trigger to work
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- Also ensure the trigger function can work by making sure it has proper permissions
-- The SECURITY DEFINER should work, but let's also ensure the function can access the table
-- Recreate the function to ensure it has the right permissions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;
