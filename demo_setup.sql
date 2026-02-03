-- Demo Mode Setup Script
-- Run this on the DEMO database instance

-- 1. Create Template Schema
CREATE SCHEMA IF NOT EXISTS template;

-- 2. Activity Tracking Table
CREATE TABLE IF NOT EXISTS public.demo_activity (
    id INT PRIMARY KEY DEFAULT 1,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    checkpoint_created_at TIMESTAMPTZ,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Add checkpoint_created_at column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_activity' 
        AND column_name = 'checkpoint_created_at'
    ) THEN
        ALTER TABLE public.demo_activity 
        ADD COLUMN checkpoint_created_at TIMESTAMPTZ;
    END IF;
END $$;

-- Initialize activity
INSERT INTO public.demo_activity (id, last_active, checkpoint_created_at)
VALUES (1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE 
SET checkpoint_created_at = COALESCE(demo_activity.checkpoint_created_at, NOW());

-- 3. Function to Create Checkpoint (Save current state as template)
CREATE OR REPLACE FUNCTION public.create_demo_checkpoint()
RETURNS void AS $$
DECLARE
    checkpoint_time TIMESTAMPTZ;
BEGIN
    checkpoint_time := NOW();
    
    -- Drop existing template tables
    DROP TABLE IF EXISTS template.tracks CASCADE;
    DROP TABLE IF EXISTS template.playlists CASCADE;
    DROP TABLE IF EXISTS template.app_settings CASCADE;
    DROP TABLE IF EXISTS template.profiles CASCADE;
    DROP TABLE IF EXISTS template.audit_log CASCADE;
    -- Add other tables as needed (votes, etc.)
    
    -- Copy public tables to template schema
    CREATE TABLE template.playlists AS SELECT * FROM public.playlists;
    CREATE TABLE template.tracks AS SELECT * FROM public.tracks;
    CREATE TABLE template.app_settings AS SELECT * FROM public.app_settings;
    CREATE TABLE template.profiles AS SELECT * FROM public.profiles;
    CREATE TABLE template.audit_log AS SELECT * FROM public.audit_log;
    -- Copy other tables...
    
    -- Store the checkpoint timestamp
    UPDATE public.demo_activity 
    SET checkpoint_created_at = checkpoint_time 
    WHERE id = 1;
    
    -- Copy sequences/IDs if needed (simplified here)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to Reset Demo DB (Restore from template)
-- Drop the old function first to allow parameter changes
DROP FUNCTION IF EXISTS public.reset_demo_db(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.reset_demo_db(
    p_demo_admin_email TEXT,
    p_demo_user_email TEXT
)
RETURNS void AS $$
DECLARE
    checkpoint_time TIMESTAMPTZ;
BEGIN
    -- Get the checkpoint timestamp
    SELECT checkpoint_created_at INTO checkpoint_time 
    FROM public.demo_activity 
    WHERE id = 1;
    
    -- Use DELETE which respects foreign keys and is less aggressive than TRUNCATE
    -- This will NOT cascade to the audit_log
    -- Add WHERE true to satisfy Supabase's safety requirement
    DELETE FROM public.tracks WHERE true;
    DELETE FROM public.playlists WHERE true;
    DELETE FROM public.app_settings WHERE true;

    -- Delete and restore profiles, but preserve the main demo user and admin
    DELETE FROM public.profiles 
    WHERE email != p_demo_user_email 
      AND email != p_demo_admin_email;

    -- Restore data from template
    INSERT INTO public.playlists SELECT * FROM template.playlists;
    INSERT INTO public.tracks SELECT * FROM template.tracks;
    INSERT INTO public.app_settings SELECT * FROM template.app_settings;
    
    -- Restore profiles from template, avoiding conflicts with preserved users
    INSERT INTO public.profiles SELECT * FROM template.profiles
    ON CONFLICT (id) DO NOTHING;
    
    -- Delete audit_log entries created after the checkpoint
    -- Keep all audit history from before the checkpoint
    IF checkpoint_time IS NOT NULL THEN
        DELETE FROM public.audit_log 
        WHERE created_at > checkpoint_time;
    END IF;
    
    -- Restore audit_log entries from the checkpoint
    INSERT INTO public.audit_log 
    SELECT * FROM template.audit_log
    ON CONFLICT (id) DO NOTHING;
    
    -- Reset activity timestamp
    UPDATE public.demo_activity SET last_active = NOW() WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to Register Activity
CREATE OR REPLACE FUNCTION public.register_demo_activity()
RETURNS void AS $$
BEGIN
    INSERT INTO public.demo_activity (id, last_active)
    VALUES (1, NOW())
    ON CONFLICT (id) DO UPDATE SET last_active = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to Check Timeout
CREATE OR REPLACE FUNCTION public.check_demo_timeout(timeout_minutes INT DEFAULT 5)
RETURNS BOOLEAN AS $$
DECLARE
    last_time TIMESTAMPTZ;
BEGIN
    SELECT last_active INTO last_time FROM public.demo_activity WHERE id = 1;
    
    IF last_time IS NULL THEN
        RETURN TRUE; -- Reset if no record
    END IF;
    
    IF last_time < NOW() - (timeout_minutes || ' minutes')::INTERVAL THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to Clear Audit Log
CREATE OR REPLACE FUNCTION public.clear_demo_activity_log()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE public.audit_log RESTART IDENTITY CASCADE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable Realtime for tracks and audit_log tables
-- This allows real-time subscriptions to track changes
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime FOR TABLE tracks, audit_log;
