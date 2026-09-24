-- ====================================================================
-- FIBERX INVENTORY & DISPATCH MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL SCHEMA & PHOTO BUCKET SPECIFICATION
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 2. CREATE ENUMS
-- ====================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'TECHNICIAN', 'OPERATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE inventory_status AS ENUM ('IN_STOCK', 'ASSIGNED', 'INSTALLED', 'UNDER_REPAIR', 'DEFECTIVE', 'RETURNED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_condition AS ENUM ('BRAND_NEW', 'GOOD_CONDITION', 'REFURBISHED', 'DAMAGED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('PENDING', 'AWAITING_VERIFICATION', 'VERIFIED_CONNECTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================================================
-- 3. TABLE: PROFILES (User accounts & credentials)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'ADMIN',
    badge_id TEXT,
    department TEXT,
    phone TEXT,
    status TEXT DEFAULT 'ACTIVE',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 4. TABLE: TECHNICIANS (Fleet roster & custody metrics)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    employee_id TEXT NOT NULL UNIQUE,
    phone TEXT,
    assigned_van TEXT,
    area TEXT,
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    contact_person TEXT,
    hub_address TEXT,
    active_job_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 5. TABLE: INVENTORY_ITEMS (Fiber optics hardware, ONTs, Routers, Cables)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    barcode TEXT,
    category TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    quantity INTEGER DEFAULT 1,
    unit TEXT DEFAULT 'pcs',
    condition TEXT DEFAULT 'BRAND_NEW',
    status TEXT DEFAULT 'IN_STOCK',
    current_location TEXT DEFAULT 'Main Warehouse Hub',
    assigned_technician_id TEXT REFERENCES public.technicians(id) ON DELETE SET NULL,
    assigned_technician_name TEXT,
    assigned_at TIMESTAMPTZ,
    assigned_by_user_id TEXT,
    assigned_by_user_name TEXT,
    
    -- Slot and Cable Pairing
    slot_label TEXT,
    paired_parent_id TEXT,
    is_slot_tied BOOLEAN DEFAULT false,
    
    -- Customer Closure & Provisioning
    customer_account_number TEXT,
    customer_name TEXT,
    customer_address TEXT,
    optical_rx TEXT,
    installation_date TIMESTAMPTZ,
    submitted_by_technician_id TEXT,
    submitted_by_technician_name TEXT,
    submitted_at TIMESTAMPTZ,
    
    -- Verification & Photos
    verification_status TEXT DEFAULT 'PENDING',
    verified_by_admin_name TEXT,
    verified_at TIMESTAMPTZ,
    rejection_notes TEXT,
    photo_url TEXT,
    photo_storage_path TEXT,
    
    -- Returns & Audits
    is_return_pending BOOLEAN DEFAULT false,
    return_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 6. TABLE: ACCOUNT_CLOSURES (Field tag submissions for Admin Approval)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.account_closures (
    id TEXT PRIMARY KEY,
    account_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    technician_id TEXT REFERENCES public.technicians(id) ON DELETE SET NULL,
    technician_name TEXT NOT NULL,
    technician_van TEXT,
    equipment_serial TEXT NOT NULL,
    equipment_model TEXT,
    optical_rx TEXT,
    status TEXT DEFAULT 'AWAITING_VERIFICATION',
    notes TEXT,
    installation_photos JSONB DEFAULT '[]'::jsonb,
    photo_url TEXT,
    verified_by_admin_name TEXT,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 7. TABLE: AUDIT_LOGS (Immutable Chain-of-Custody Log)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    item_id TEXT,
    item_name TEXT,
    serial_number TEXT,
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_role TEXT DEFAULT 'ADMIN',
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 8. TABLE: INSTALLATION_PHOTOS (Metadata ledger for 'potobucket')
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.installation_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_id TEXT NOT NULL DEFAULT 'potobucket',
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT DEFAULT 'image/jpeg',
    public_url TEXT NOT NULL,
    uploaded_by_user_id TEXT,
    uploaded_by_name TEXT,
    role TEXT,
    technician_id TEXT,
    account_number TEXT,
    equipment_serial TEXT,
    photo_type TEXT DEFAULT 'INSTALLATION', -- INSTALLATION, BARCODE_SCAN, METER_READING, RETURN_PROOF
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 9. SUPABASE STORAGE: CREATE AND CONFIGURE 'potobucket'
-- ====================================================================
-- Insert 'potobucket' into Supabase Storage buckets catalog
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'potobucket',
    'potobucket',
    true,
    10485760, -- 10MB per image
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760;

-- ====================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_photos ENABLE ROW LEVEL SECURITY;

-- Allow Public/Authenticated Read & Write for FiberX Operations
-- (Permissive for application-level authentication handled by FiberX Session)
CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public write on profiles" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Allow public read on technicians" ON public.technicians FOR SELECT USING (true);
CREATE POLICY "Allow public write on technicians" ON public.technicians FOR ALL USING (true);

CREATE POLICY "Allow public read on inventory_items" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Allow public write on inventory_items" ON public.inventory_items FOR ALL USING (true);

CREATE POLICY "Allow public read on account_closures" ON public.account_closures FOR SELECT USING (true);
CREATE POLICY "Allow public write on account_closures" ON public.account_closures FOR ALL USING (true);

CREATE POLICY "Allow public read on audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on installation_photos" ON public.installation_photos FOR SELECT USING (true);
CREATE POLICY "Allow public write on installation_photos" ON public.installation_photos FOR ALL USING (true);

-- ====================================================================
-- 11. STORAGE RLS POLICIES FOR 'potobucket'
-- ====================================================================
-- Allow public access to read/view photos in 'potobucket'
CREATE POLICY "Public potobucket Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'potobucket');

-- Allow technicians and admins to upload photos to 'potobucket'
CREATE POLICY "Public potobucket Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'potobucket');

-- Allow admins to update photos in 'potobucket'
CREATE POLICY "Public potobucket Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'potobucket');

-- Allow admins to delete photos from 'potobucket'
CREATE POLICY "Public potobucket Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'potobucket');

-- ====================================================================
-- 12. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_technicians_updated_at ON public.technicians;
CREATE TRIGGER tr_technicians_updated_at
    BEFORE UPDATE ON public.technicians
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER tr_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_account_closures_updated_at ON public.account_closures;
CREATE TRIGGER tr_account_closures_updated_at
    BEFORE UPDATE ON public.account_closures
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 13. OPTIMIZED INDEXES FOR HIGH-THROUGHPUT SEARCHES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_inventory_serial ON public.inventory_items (serial_number);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory_items (status);
CREATE INDEX IF NOT EXISTS idx_inventory_tech ON public.inventory_items (assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_inventory_account ON public.inventory_items (customer_account_number);
CREATE INDEX IF NOT EXISTS idx_closures_account ON public.account_closures (account_number);
CREATE INDEX IF NOT EXISTS idx_closures_tech ON public.account_closures (technician_id);
CREATE INDEX IF NOT EXISTS idx_audit_item ON public.audit_logs (item_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_photos_account ON public.installation_photos (account_number);
CREATE INDEX IF NOT EXISTS idx_photos_serial ON public.installation_photos (equipment_serial);

-- ====================================================================
-- 14. AUTOMATIC SUPABASE AUTH SYNCHRONIZATION (auth.users -> public.profiles)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        name,
        email,
        role,
        badge_id,
        department,
        phone,
        status
    )
    VALUES (
        new.id::text,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'ADMIN'),
        COALESCE(new.raw_user_meta_data->>'badgeId', 'FX-USR'),
        COALESCE(new.raw_user_meta_data->>'department', 'Operations'),
        new.raw_user_meta_data->>'phone',
        'ACTIVE'
    )
    ON CONFLICT (email) DO UPDATE
    SET
        id = EXCLUDED.id,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        badge_id = EXCLUDED.badge_id,
        department = EXCLUDED.department,
        updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger whenever a new account is registered in Supabase auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

