-- Migration script: Split public.users into public.users_admin and public.users_client

-- 1. Create public.users_admin
CREATE TABLE IF NOT EXISTS public.users_admin (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create public.users_client
CREATE TABLE IF NOT EXISTS public.users_client (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    tracking_enabled BOOLEAN NOT NULL DEFAULT false,
    frequency_seconds INTEGER NOT NULL DEFAULT 60 CHECK (frequency_seconds >= 15),
    location_required_for_orders BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.users_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_client ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for users_admin" ON public.users_admin;
CREATE POLICY "Allow all operations for users_admin" ON public.users_admin FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations for users_client" ON public.users_client;
CREATE POLICY "Allow all operations for users_client" ON public.users_client FOR ALL USING (true);

-- 3. Copy existing data if public.users exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        -- Insert admins
        INSERT INTO public.users_admin (id, employee_id, name, email, username, password, company_id, is_active, role, created_at, updated_at)
        SELECT id, username, name, email, username, password, company_id, true, 'admin', NOW(), NOW()
        FROM public.users
        WHERE role = 'admin' OR role = 'owner'
        ON CONFLICT (employee_id) DO NOTHING;

        -- Insert clients/MRs
        INSERT INTO public.users_client (id, employee_id, name, email, username, password, company_id, is_active, role, tracking_enabled, frequency_seconds, location_required_for_orders, created_at, updated_at)
        SELECT 
            u.id, u.username, u.name, u.email, u.username, u.password, u.company_id, true, 'user',
            COALESCE(us.tracking_enabled, false),
            COALESCE(us.frequency_seconds, 60),
            COALESCE(us.location_required_for_orders, false),
            NOW(), NOW()
        FROM public.users u
        LEFT JOIN public.user_settings us ON us.user_id = u.id AND us.company_id = u.company_id
        WHERE u.role = 'user' OR u.role = 'employee'
        ON CONFLICT (employee_id) DO NOTHING;
    END IF;
END $$;

-- 4. Re-target existing tables user_settings and location_logs
-- Drop foreign keys pointing to public.users and point to users_client/users_admin
-- Note: user_settings and location_logs only track client/MR users in this platform design.
ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_client(id) ON DELETE CASCADE;

ALTER TABLE public.location_logs DROP CONSTRAINT IF EXISTS location_logs_user_id_fkey;
ALTER TABLE public.location_logs ADD CONSTRAINT location_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_client(id) ON DELETE CASCADE;

-- Rename public.users to public.users_old as a backup if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE public.users RENAME TO users_old;
    END IF;
END $$;
