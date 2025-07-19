-- User Management Update for Snow Removal System
-- This migration sets up custom users table and updates foreign key relationships

-- Step 1: Create custom users table for app-specific profile data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,  -- Same ID as auth.users for easy joining
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Snow removal specific fields (optional for future use)
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  
  -- Link to auth.users (for reference, but not FK to avoid circular dependencies)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Step 2: Update employees table to reference public.users instead of auth.users
-- First, drop the existing foreign key constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;

-- Add new foreign key constraint pointing to public.users
ALTER TABLE employees 
ADD CONSTRAINT employees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 3: Enable RLS on custom users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies for custom users table
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Admin users can view other users in their company
CREATE POLICY "Company admins can view company users" ON public.users FOR SELECT
  USING (
    id IN (
      SELECT e1.user_id 
      FROM employees e1
      JOIN employees e2 ON e1.company_id = e2.company_id
      WHERE e2.user_id = (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
      )
      AND e2.role IN ('owner', 'admin')
      AND e2.is_active = true
    )
  );

-- Step 5: Create function to auto-create users in public.users
CREATE OR REPLACE FUNCTION create_public_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users when a user is created in auth.users
  INSERT INTO public.users (id, email, auth_user_id, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.id,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Avoid duplicates
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to auto-create public users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_public_user();

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Step 8: Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Company invitations should also reference auth.users for the invited_by field
-- (keeping this as auth.users since it's just a reference, not a profile relationship)

-- Step 10: Update other foreign key references if needed
-- Fix company_invitations.invited_by to use auth.users (this is correct as-is)

-- Verification query - check the new constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'employees'
    AND kcu.column_name = 'user_id'; 