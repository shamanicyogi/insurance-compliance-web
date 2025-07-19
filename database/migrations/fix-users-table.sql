-- Fix Users Table Creation - Step by Step Approach
-- Run each step separately in Supabase SQL Editor

-- STEP 1: Check if table exists and drop if needed (run this first)
DROP TABLE IF EXISTS public.users CASCADE;

-- STEP 2: Create the custom users table (run this second)
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Snow removal specific fields
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  
  -- Link to auth.users
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- STEP 3: Enable RLS (run this third)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create RLS policies (run this fourth)
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- STEP 5: Update employees table foreign key (run this fifth)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;
ALTER TABLE employees 
ADD CONSTRAINT employees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- STEP 6: Create indexes (run this sixth)
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- STEP 7: Create trigger for updated_at (run this seventh)
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

-- STEP 8: Verification - check the foreign key constraint
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