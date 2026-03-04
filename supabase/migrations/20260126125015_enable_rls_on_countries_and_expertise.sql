-- Enable Row Level Security on countries table
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on expertise table
ALTER TABLE expertise ENABLE ROW LEVEL SECURITY;

-- Create policies for countries table
-- Allow anyone (including anonymous users) to read countries
CREATE POLICY "Allow public read access to countries"
  ON countries
  FOR SELECT
  TO public
  USING (true);

-- Only allow service role to insert/update/delete countries
-- (This will be done through your backend API with service role key)
CREATE POLICY "Allow service role full access to countries"
  ON countries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policies for expertise table
-- Allow anyone (including anonymous users) to read active expertise
CREATE POLICY "Allow public read access to active expertise"
  ON expertise
  FOR SELECT
  TO public
  USING (is_active = true);

-- Allow service role to read all expertise (including inactive)
CREATE POLICY "Allow service role read all expertise"
  ON expertise
  FOR SELECT
  TO service_role
  USING (true);

-- Only allow service role to insert/update/delete expertise
CREATE POLICY "Allow service role full access to expertise"
  ON expertise
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);;
