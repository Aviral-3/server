-- Migration: Add assigned_areas column to users_client table
ALTER TABLE public.users_client ADD COLUMN IF NOT EXISTS assigned_areas JSONB DEFAULT '[]'::jsonb;
