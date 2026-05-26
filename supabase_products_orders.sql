-- Migration script: Create products and orders tables, add missing columns, and seed data

-- 1. Create public.products table
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL,
    icon VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create public.orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(50) PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users_client(id) ON DELETE CASCADE,
    doctor_name VARCHAR(120) NOT NULL,
    area_name VARCHAR(120) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Alter areas and doctors tables to support rich client features
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(150);
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS initials VARCHAR(10);
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS color VARCHAR(20);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for products
DROP POLICY IF EXISTS "Allow all operations for products" ON public.products;
CREATE POLICY "Allow all operations for products" ON public.products FOR ALL USING (true);

-- Create policies for orders
DROP POLICY IF EXISTS "Allow all operations for orders" ON public.orders;
CREATE POLICY "Allow all operations for orders" ON public.orders FOR ALL USING (true);

-- 4. Seed/Upsert areas
INSERT INTO public.areas (id, company_id, name, lat, lng) VALUES
-- Company 1 (PharmaCorp India / MediKL Pharma)
('bandra_west', '11111111-1111-1111-1111-111111111111', 'Bandra West', 19.0596, 72.8295),
('andheri_east', '11111111-1111-1111-1111-111111111111', 'Andheri East', 19.1136, 72.8697),
('dadar', '11111111-1111-1111-1111-111111111111', 'Dadar', 19.0178, 72.8478),
('kurla', '11111111-1111-1111-1111-111111111111', 'Kurla', 19.0728, 72.8776),
('borivali', '11111111-1111-1111-1111-111111111111', 'Borivali', 19.2290, 72.8574),
('mulund', '11111111-1111-1111-1111-111111111111', 'Mulund', 19.1730, 72.9577),
-- Company 2 (MediLife Solutions / PharmaNova Inc.)
('koramangala', '22222222-2222-2222-2222-222222222222', 'Koramangala', 12.9352, 77.6245),
('indiranagar', '22222222-2222-2222-2222-222222222222', 'Indiranagar', 12.9784, 77.6408),
('hsr_layout', '22222222-2222-2222-2222-222222222222', 'HSR Layout', 12.9141, 77.6411),
('whitefield', '22222222-2222-2222-2222-222222222222', 'Whitefield', 12.9698, 77.7499),
('jayanagar', '22222222-2222-2222-2222-222222222222', 'Jayanagar', 12.9307, 77.5838)
ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    name = EXCLUDED.name,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng;

-- Clean up any legacy mock doctors before inserting structured ones
DELETE FROM public.doctors WHERE id IN ('d1', 'd2', 'd3');

-- 5. Seed/Upsert doctors
INSERT INTO public.doctors (id, company_id, name, specialty, area_id, is_favorite, clinic_name, latitude, longitude, initials, color) VALUES
-- Company 1 (PharmaCorp India / MediKL Pharma) - Bandra West
('101', '11111111-1111-1111-1111-111111111111', 'Dr. Ramesh Gupta', 'Cardiologist', 'bandra_west', true, 'HeartCare Clinic', 19.0596, 72.8295, 'RG', '#4F8EF7'),
('102', '11111111-1111-1111-1111-111111111111', 'Dr. Priya Sharma', 'Dermatologist', 'bandra_west', false, 'Skin Wellness Center', 19.0601, 72.8301, 'PS', '#EC4899'),
('103', '11111111-1111-1111-1111-111111111111', 'Dr. Anil Mehta', 'General Physician', 'bandra_west', false, 'Mehta Medical', 19.0588, 72.8280, 'AM', '#22C55E'),
('104', '11111111-1111-1111-1111-111111111111', 'Dr. Sunita Joshi', 'Gynecologist', 'bandra_west', true, 'Mother & Child Clinic', 19.0612, 72.8321, 'SJ', '#F59E0B'),
-- Company 1 - Andheri East
('201', '11111111-1111-1111-1111-111111111111', 'Dr. Vikram Patil', 'Orthopedic Surgeon', 'andheri_east', false, 'BoneHealth Clinic', 19.1136, 72.8697, 'VP', '#7C5EF7'),
('202', '11111111-1111-1111-1111-111111111111', 'Dr. Meena Rao', 'Pediatrician', 'andheri_east', true, 'SunShine Children Clinic', 19.1142, 72.8703, 'MR', '#14B8A6'),
('203', '11111111-1111-1111-1111-111111111111', 'Dr. Suresh Kumar', 'ENT Specialist', 'andheri_east', false, 'ClearHearing Clinic', 19.1129, 72.8688, 'SK', '#F97316'),
-- Company 1 - Dadar
('301', '11111111-1111-1111-1111-111111111111', 'Dr. Hemangi Desai', 'Neurologist', 'dadar', false, 'NeuroPlus Hospital', 19.0178, 72.8478, 'HD', '#EF4444'),
('302', '11111111-1111-1111-1111-111111111111', 'Dr. Jayesh Naik', 'Diabetologist', 'dadar', true, 'DiabCare Center', 19.0184, 72.8485, 'JN', '#3B82F6'),
('303', '11111111-1111-1111-1111-111111111111', 'Dr. Lata Shinde', 'Ophthalmologist', 'dadar', false, 'VisionFirst Eye Clinic', 19.0171, 72.8462, 'LS', '#A855F7'),
('304', '11111111-1111-1111-1111-111111111111', 'Dr. Rajesh Wagh', 'Urologist', 'dadar', false, 'UroHealth Clinic', 19.0193, 72.8491, 'RW', '#06B6D4'),
('305', '11111111-1111-1111-1111-111111111111', 'Dr. Kaveri Kulkarni', 'General Physician', 'dadar', false, 'Kulkarni Medical', 19.0165, 72.8455, 'KK', '#84CC16'),
-- Company 1 - Kurla
('401', '11111111-1111-1111-1111-111111111111', 'Dr. Farhan Irani', 'Cardiologist', 'kurla', false, 'HeartFirst Clinic', 19.0728, 72.8776, 'FI', '#F59E0B'),
('402', '11111111-1111-1111-1111-111111111111', 'Dr. Shilpa More', 'Gynecologist', 'kurla', true, 'WomenCare Center', 19.0735, 72.8782, 'SM', '#EC4899'),
-- Company 1 - Borivali
('501', '11111111-1111-1111-1111-111111111111', 'Dr. Deepak Thakur', 'General Physician', 'borivali', false, 'Thakur Medical Hall', 19.2290, 72.8574, 'DT', '#22C55E'),
('502', '11111111-1111-1111-1111-111111111111', 'Dr. Amita Shah', 'Oncologist', 'borivali', false, 'CancerCare Center', 19.2297, 72.8581, 'AS', '#EF4444'),
('503', '11111111-1111-1111-1111-111111111111', 'Dr. Nikhil Pawar', 'Dermatologist', 'borivali', true, 'DermaCare Clinic', 19.2283, 72.8567, 'NP', '#7C5EF7'),
-- Company 1 - Mulund
('601', '11111111-1111-1111-1111-111111111111', 'Dr. Rekha Gokhale', 'Pediatrician', 'mulund', false, 'ChildFirst Clinic', 19.1730, 72.9577, 'RG', '#14B8A6'),
('602', '11111111-1111-1111-1111-111111111111', 'Dr. Santosh Bhide', 'Gastrologist', 'mulund', false, 'GutHealth Clinic', 19.1737, 72.9583, 'SB', '#F97316'),

-- Company 2 (MediLife Solutions / PharmaNova Inc.) - Koramangala
('701', '22222222-2222-2222-2222-222222222222', 'Dr. Naveen Reddy', 'Cardiologist', 'koramangala', true, 'Koramangala Heart Care', 12.9352, 77.6245, 'NR', '#3B82F6'),
('702', '22222222-2222-2222-2222-222222222222', 'Dr. Kavitha S.', 'Dermatologist', 'koramangala', false, 'Garden City Skin Doc', 12.9345, 77.6256, 'KS', '#D946EF'),
-- Company 2 - Indiranagar
('801', '22222222-2222-2222-2222-222222222222', 'Dr. Arjun Shetty', 'General Physician', 'indiranagar', false, 'Indiranagar Medical Center', 12.9784, 77.6408, 'AS', '#8B5CF6'),
('802', '22222222-2222-2222-2222-222222222222', 'Dr. Sneha Raj', 'Pediatrician', 'indiranagar', true, 'Little Feet Clinic', 12.9792, 77.6415, 'SR', '#2DD4BF'),
-- Company 2 - HSR Layout
('901', '22222222-2222-2222-2222-222222222222', 'Dr. Mohan Kumar', 'Orthopedic Surgeon', 'hsr_layout', false, 'HSR Bone & Joint', 12.9141, 77.6411, 'MK', '#10B981'),
('902', '22222222-2222-2222-2222-222222222222', 'Dr. Anjali Patil', 'Gynecologist', 'hsr_layout', false, 'Divine Woman Care', 12.9135, 77.6420, 'AP', '#F43F5E'),
-- Company 2 - Whitefield
('1001', '22222222-2222-2222-2222-222222222222', 'Dr. Pradeep Rao', 'ENT Specialist', 'whitefield', true, 'IT Corridor ENT', 12.9698, 77.7499, 'PR', '#F59E0B'),
('1002', '22222222-2222-2222-2222-222222222222', 'Dr. Shweta Iyer', 'Neurologist', 'whitefield', false, 'Tech Park Neuro Plus', 12.9692, 77.7510, 'SI', '#3B82F6'),
-- Company 2 - Jayanagar
('1101', '22222222-2222-2222-2222-222222222222', 'Dr. Satish Murthy', 'Ophthalmologist', 'jayanagar', false, 'Retro Jayanagar Eye', 12.9307, 77.5838, 'SM', '#14B8A6'),
('1102', '22222222-2222-2222-2222-222222222222', 'Dr. Laxmi Narayan', 'Diabetologist', 'jayanagar', true, 'Heritage Health Care', 12.9315, 77.5845, 'LN', '#4ADE80')
ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    name = EXCLUDED.name,
    specialty = EXCLUDED.specialty,
    area_id = EXCLUDED.area_id,
    is_favorite = EXCLUDED.is_favorite,
    clinic_name = EXCLUDED.clinic_name,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    initials = EXCLUDED.initials,
    color = EXCLUDED.color;

-- 6. Seed initial products
INSERT INTO public.products (id, company_id, name, category, unit, price, icon) VALUES
-- Company 1 (PharmaCorp India / MediKL Pharma)
(1, '11111111-1111-1111-1111-111111111111', 'Cardiomax 5mg', 'Cardiac', 'Strip of 10', 120.00, '❤️'),
(2, '11111111-1111-1111-1111-111111111111', 'DermoClear Cream', 'Dermatology', '30g Tube', 250.00, '🧴'),
(3, '11111111-1111-1111-1111-111111111111', 'OmniVit Capsules', 'Vitamins', 'Box of 30', 180.00, '💊'),
(4, '11111111-1111-1111-1111-111111111111', 'GlucoShield 500mg', 'Anti-diabetic', 'Strip of 15', 95.00, '💉'),
(5, '11111111-1111-1111-1111-111111111111', 'PediCold Syrup', 'Pediatric', '100ml Bottle', 65.00, '🍼'),
(6, '11111111-1111-1111-1111-111111111111', 'BoneCalc Plus', 'Calcium', 'Box of 60', 320.00, '🦴'),
-- Company 2 (MediLife Solutions / PharmaNova Inc.)
(101, '22222222-2222-2222-2222-222222222222', 'NeuroCalm 10mg', 'Neurology', 'Strip of 10', 185.00, '🧠'),
(102, '22222222-2222-2222-2222-222222222222', 'ImmunoBoost Plus', 'Immunity', 'Box of 30', 340.00, '🛡️'),
(103, '22222222-2222-2222-2222-222222222222', 'GastroEase 20mg', 'Gastro', 'Strip of 15', 110.00, '🫃'),
(104, '22222222-2222-2222-2222-222222222222', 'FemCare Iron', 'Women Health', 'Box of 60', 275.00, '🌸'),
(105, '22222222-2222-2222-2222-222222222222', 'VisionPlus Drops', 'Ophthalmology', '10ml Bottle', 195.00, '👁️')
ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    price = EXCLUDED.price,
    icon = EXCLUDED.icon;

-- 7. Seed initial orders
INSERT INTO public.orders (id, company_id, user_id, doctor_name, area_name, amount, status, created_at) VALUES
-- Company 1, User 1 (Aviral - id: 1)
('ORD-20260522-001', '11111111-1111-1111-1111-111111111111', 1, 'Dr. Ramesh Gupta', 'Bandra West', 1560.00, 'approved', '2026-05-22T09:32:00Z'),
('ORD-20260522-002', '11111111-1111-1111-1111-111111111111', 1, 'Dr. Priya Sharma', 'Bandra West', 875.00, 'submitted', '2026-05-22T10:15:00Z'),
-- Company 2, User 2 (Test User Two - id: 2)
('ORD-20260522-003', '22222222-2222-2222-2222-222222222222', 2, 'Dr. Naveen Reddy', 'Koramangala', 1250.00, 'approved', '2026-05-22T10:00:00Z'),
('ORD-20260522-004', '22222222-2222-2222-2222-222222222222', 2, 'Dr. Arjun Shetty', 'Indiranagar', 980.00, 'submitted', '2026-05-22T11:30:00Z')
ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    user_id = EXCLUDED.user_id,
    doctor_name = EXCLUDED.doctor_name,
    area_name = EXCLUDED.area_name,
    amount = EXCLUDED.amount,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at;
