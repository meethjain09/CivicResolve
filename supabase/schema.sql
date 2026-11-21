-- CivicResolve Database Schema
-- Idempotent schema definition for Supabase PostgreSQL

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'resolver', 'head')),
    department TEXT NULL,
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. COMPLAINTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT UNIQUE NOT NULL,
    citizen_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    ward TEXT NOT NULL,
    citizen_category TEXT NULL,
    image_url TEXT NULL,
    ai_status TEXT NOT NULL DEFAULT 'review_pending' CHECK (ai_status IN ('completed', 'review_pending', 'manual_override')),
    ai_model_used TEXT NULL,
    category TEXT NOT NULL DEFAULT 'Uncategorized',
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    urgency_reason TEXT NULL,
    ai_summary TEXT NULL,
    image_verified BOOLEAN NULL,
    department TEXT NOT NULL DEFAULT 'Unassigned',
    status TEXT NOT NULL DEFAULT 'Reported' CHECK (status IN ('Reported', 'In Progress', 'Resolved')),
    resolution_note TEXT NULL,
    reassignment_requested BOOLEAN NOT NULL DEFAULT FALSE,
    requested_department TEXT NULL,
    reassignment_reason TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically update updated_at on complaints modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_complaints_updated_at ON public.complaints;
CREATE TRIGGER set_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- 3. TRIGGER TO PREVENT DELETION OF PROTECTED PROFILES
-- ==========================================
CREATE OR REPLACE FUNCTION public.prevent_protected_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_protected = TRUE THEN
        RAISE EXCEPTION 'Cannot delete protected profile (ID: %, Email: %)', OLD.id, OLD.email;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_protected_profile_delete ON public.profiles;
CREATE TRIGGER trigger_prevent_protected_profile_delete
BEFORE DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_protected_profile_delete();

-- ==========================================
-- 4. SECURITY DEFINER HELPER FUNCTIONS
-- Avoid infinite recursion in RLS policies on public.profiles
-- ==========================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT department FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- RLS Policies for public.profiles
-- "profiles: users read/insert own row; head reads all rows."
-- ------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Head can read all profiles" ON public.profiles;
CREATE POLICY "Head can read all profiles"
ON public.profiles
FOR SELECT
USING (public.current_user_role() = 'head');

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ------------------------------------------
-- RLS Policies for public.complaints
-- "complaints: citizen inserts and reads own complaints; resolver reads/updates complaints matching their department; head reads/updates all complaints."
-- ------------------------------------------

-- Citizen: insert own complaints
DROP POLICY IF EXISTS "Citizens can insert complaints" ON public.complaints;
CREATE POLICY "Citizens can insert complaints"
ON public.complaints
FOR INSERT
WITH CHECK (auth.uid() = citizen_id);

-- Citizen: read own complaints
DROP POLICY IF EXISTS "Citizens can read own complaints" ON public.complaints;
CREATE POLICY "Citizens can read own complaints"
ON public.complaints
FOR SELECT
USING (auth.uid() = citizen_id);

-- Resolver: read complaints matching their department
DROP POLICY IF EXISTS "Resolvers can read department complaints" ON public.complaints;
CREATE POLICY "Resolvers can read department complaints"
ON public.complaints
FOR SELECT
USING (
    public.current_user_role() = 'resolver' 
    AND public.current_user_department() IS NOT NULL 
    AND department = public.current_user_department()
);

-- Resolver: update complaints matching their department
DROP POLICY IF EXISTS "Resolvers can update department complaints" ON public.complaints;
CREATE POLICY "Resolvers can update department complaints"
ON public.complaints
FOR UPDATE
USING (
    public.current_user_role() = 'resolver' 
    AND public.current_user_department() IS NOT NULL 
    AND department = public.current_user_department()
)
WITH CHECK (
    public.current_user_role() = 'resolver' 
    AND public.current_user_department() IS NOT NULL 
    AND department = public.current_user_department()
);

-- Head: read all complaints
DROP POLICY IF EXISTS "Head can read all complaints" ON public.complaints;
CREATE POLICY "Head can read all complaints"
ON public.complaints
FOR SELECT
USING (public.current_user_role() = 'head');

-- Head: update all complaints
DROP POLICY IF EXISTS "Head can update all complaints" ON public.complaints;
CREATE POLICY "Head can update all complaints"
ON public.complaints
FOR UPDATE
USING (public.current_user_role() = 'head')
WITH CHECK (public.current_user_role() = 'head');
