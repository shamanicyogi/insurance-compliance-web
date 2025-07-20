-- Add auth_user_id column to users table
-- Run this in your Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- Verify the column was added
\d public.users;
