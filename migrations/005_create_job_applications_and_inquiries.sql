-- ============================================
-- MIGRATION 5: Job Applications and Inquiries System
-- ============================================

-- Create job_applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected', 'withdrawn')) DEFAULT 'pending',
  cover_letter TEXT,
  resume_url TEXT,
  additional_documents JSONB DEFAULT '[]'::jsonb,
  notes TEXT, -- Internal notes for recruiters
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_post_id, applicant_id) -- Prevent duplicate applications
);

-- Create job_inquiries table
CREATE TABLE IF NOT EXISTS job_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID REFERENCES job_posts(id) ON DELETE SET NULL, -- Optional: inquiries can be general
  inquirer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Target organization for inquiry
  subject TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id), -- Assigned recruiter/admin
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inquiry_messages table
CREATE TABLE IF NOT EXISTS inquiry_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES job_inquiries(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes vs. messages visible to inquirer
  attachments JSONB DEFAULT '[]'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_applications_job_post_id ON job_applications(job_post_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_reviewed_by ON job_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at);

CREATE INDEX IF NOT EXISTS idx_job_inquiries_job_post_id ON job_inquiries(job_post_id);
CREATE INDEX IF NOT EXISTS idx_job_inquiries_inquirer_id ON job_inquiries(inquirer_id);
CREATE INDEX IF NOT EXISTS idx_job_inquiries_org_id ON job_inquiries(org_id);
CREATE INDEX IF NOT EXISTS idx_job_inquiries_status ON job_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_job_inquiries_assigned_to ON job_inquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_job_inquiries_created_at ON job_inquiries(created_at);

CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry_id ON inquiry_messages(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_sender_id ON inquiry_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_created_at ON inquiry_messages(created_at);

-- Create updated_at triggers
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_inquiries_updated_at ON job_inquiries;
CREATE TRIGGER update_job_inquiries_updated_at BEFORE UPDATE ON job_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inquiry_messages_updated_at ON inquiry_messages;
CREATE TRIGGER update_inquiry_messages_updated_at BEFORE UPDATE ON inquiry_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_applications
-- Applicants can view their own applications
CREATE POLICY "Applicants can view their own applications"
  ON job_applications FOR SELECT
  USING (applicant_id = auth.uid());

-- Org members can view applications for their organization's job posts
CREATE POLICY "Org members can view applications for their jobs"
  ON job_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_posts jp
      JOIN org_memberships om ON om.org_id = jp.org_id
      WHERE jp.id = job_applications.job_post_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Applicants can create applications
CREATE POLICY "Applicants can create applications"
  ON job_applications FOR INSERT
  WITH CHECK (applicant_id = auth.uid());

-- Applicants can update their own pending applications
CREATE POLICY "Applicants can update their pending applications"
  ON job_applications FOR UPDATE
  USING (
    applicant_id = auth.uid()
    AND status = 'pending'
  );

-- Org members can update applications for their organization's jobs
CREATE POLICY "Org members can update applications for their jobs"
  ON job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM job_posts jp
      JOIN org_memberships om ON om.org_id = jp.org_id
      WHERE jp.id = job_applications.job_post_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- RLS Policies for job_inquiries
-- Inquirers can view their own inquiries
CREATE POLICY "Inquirers can view their own inquiries"
  ON job_inquiries FOR SELECT
  USING (inquirer_id = auth.uid());

-- Org members can view inquiries for their organization
CREATE POLICY "Org members can view inquiries for their organization"
  ON job_inquiries FOR SELECT
  USING (
    org_id IS NULL
    OR EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = job_inquiries.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
  );

-- Users can create inquiries
CREATE POLICY "Users can create inquiries"
  ON job_inquiries FOR INSERT
  WITH CHECK (inquirer_id = auth.uid());

-- Org members can update inquiries for their organization
CREATE POLICY "Org members can update inquiries for their organization"
  ON job_inquiries FOR UPDATE
  USING (
    org_id IS NULL
    OR EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = job_inquiries.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
  );

-- RLS Policies for inquiry_messages
-- Users can view messages for inquiries they're involved in
CREATE POLICY "Users can view messages for their inquiries"
  ON inquiry_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_inquiries
      WHERE job_inquiries.id = inquiry_messages.inquiry_id
      AND (
        job_inquiries.inquirer_id = auth.uid()
        OR job_inquiries.assigned_to = auth.uid()
        OR (
          job_inquiries.org_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM org_memberships
            WHERE org_memberships.org_id = job_inquiries.org_id
            AND org_memberships.user_id = auth.uid()
            AND org_memberships.status = 'active'
          )
        )
      )
    )
  );

-- Users can create messages for inquiries they're involved in
CREATE POLICY "Users can create messages for their inquiries"
  ON inquiry_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM job_inquiries
      WHERE job_inquiries.id = inquiry_messages.inquiry_id
      AND (
        job_inquiries.inquirer_id = auth.uid()
        OR job_inquiries.assigned_to = auth.uid()
        OR (
          job_inquiries.org_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM org_memberships
            WHERE org_memberships.org_id = job_inquiries.org_id
            AND org_memberships.user_id = auth.uid()
            AND org_memberships.status = 'active'
          )
        )
      )
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON inquiry_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- ============================================
-- Migration Complete!
-- ============================================
