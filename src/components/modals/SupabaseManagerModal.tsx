import React, { useState, useEffect } from 'react';
import {
  Database,
  Camera,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  Shield,
  Layers,
  Upload,
  ExternalLink,
  Code2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { isSupabaseConfigured, PHOTO_BUCKET_NAME, SUPABASE_URL } from '../../lib/supabase';
import { checkSupabaseHealth, SupabaseHealthCheck } from '../../services/supabaseService';
import { uploadPhotoToPotobucket } from '../../services/supabaseStorage';

interface SupabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  currentUserId?: string;
}

export const SupabaseManagerModal: React.FC<SupabaseManagerModalProps> = ({
  isOpen,
  onClose,
  currentUserRole = 'ADMIN',
  currentUserId = 'user-admin',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'potobucket' | 'schema'>('overview');
  const [health, setHealth] = useState<SupabaseHealthCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testUploadLoading, setTestUploadLoading] = useState(false);
  const [testUploadResult, setTestUploadResult] = useState<{ url: string; error?: string } | null>(null);

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkSupabaseHealth();
      setHealth(res);
    } catch {
      setHealth({
        isConfigured: false,
        canConnect: false,
        bucketExists: false,
        message: 'Could not execute health check.',
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sqlSchemaCode = `-- ====================================================================
-- FIBERX INVENTORY & DISPATCH MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL SCHEMA & PHOTO BUCKET SPECIFICATION
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'TECHNICIAN', 'OPERATOR');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. TABLE: PROFILES
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

-- 4. TABLE: TECHNICIANS
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

-- 5. TABLE: INVENTORY_ITEMS
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
    slot_label TEXT,
    paired_parent_id TEXT,
    is_slot_tied BOOLEAN DEFAULT false,
    customer_account_number TEXT,
    customer_name TEXT,
    customer_address TEXT,
    optical_rx TEXT,
    installation_date TIMESTAMPTZ,
    submitted_by_technician_id TEXT,
    submitted_by_technician_name TEXT,
    submitted_at TIMESTAMPTZ,
    verification_status TEXT DEFAULT 'PENDING',
    verified_by_admin_name TEXT,
    verified_at TIMESTAMPTZ,
    rejection_notes TEXT,
    photo_url TEXT,
    photo_storage_path TEXT,
    is_return_pending BOOLEAN DEFAULT false,
    return_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLE: ACCOUNT_CLOSURES
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

-- 7. TABLE: AUDIT_LOGS
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

-- 8. TABLE: INSTALLATION_PHOTOS
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
    photo_type TEXT DEFAULT 'INSTALLATION',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. SUPABASE STORAGE BUCKET: 'potobucket'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'potobucket',
    'potobucket',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 10. ENABLE RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_photos ENABLE ROW LEVEL SECURITY;

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

-- Storage bucket access policies
CREATE POLICY "Public potobucket Read" ON storage.objects FOR SELECT USING (bucket_id = 'potobucket');
CREATE POLICY "Public potobucket Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'potobucket');
CREATE POLICY "Public potobucket Update" ON storage.objects FOR UPDATE USING (bucket_id = 'potobucket');
CREATE POLICY "Public potobucket Delete" ON storage.objects FOR DELETE USING (bucket_id = 'potobucket');`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleTestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTestUploadLoading(true);
    setTestUploadResult(null);

    const res = await uploadPhotoToPotobucket({
      file,
      fileName: file.name,
      technicianId: currentUserId,
      accountNumber: 'TEST-ACC-001',
      photoType: 'INSTALLATION',
    });

    setTestUploadLoading(false);
    if (res.success) {
      setTestUploadResult({ url: res.publicUrl });
    } else {
      setTestUploadResult({ url: '', error: res.error || 'Upload failed' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#003B46] to-[#002B33] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Supabase Database & Storage Hub</h2>
                <span className="px-2 py-0.5 rounded-md bg-teal-400/20 border border-teal-400/30 text-[10px] font-mono text-teal-200 uppercase">
                  {PHOTO_BUCKET_NAME}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                PostgreSQL tables, technician/admin RBAC, and dedicated installation photo bucket
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-slate-50 gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'border-[#003B46] text-[#003B46]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Connection & Tables</span>
          </button>

          <button
            onClick={() => setActiveTab('potobucket')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'potobucket'
                ? 'border-[#003B46] text-[#003B46]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Photo Bucket (potobucket)</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'schema'
                ? 'border-[#003B46] text-[#003B46]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>SQL Schema (schema.sql)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className="p-4 rounded-xl border flex items-start justify-between bg-slate-50 border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isSupabaseConfigured() ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        {isSupabaseConfigured() ? 'Supabase Credentials Configured' : 'Local Storage Mode Active'}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSupabaseConfigured()
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isSupabaseConfigured() ? 'LIVE' : 'STANDBY'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {health?.message ||
                        (isSupabaseConfigured()
                          ? `Connected to ${SUPABASE_URL}`
                          : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live PostgreSQL sync.')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runHealthCheck}
                  disabled={isChecking}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>Check Health</span>
                </button>
              </div>

              {/* Database Tables Overview */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Database Tables & Architecture
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-slate-800">public.inventory_items</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold">Table</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Cables, ONTs, routers, paired slots, and installation status with optical power readings.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-slate-800">public.technicians</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold">Table</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Van assignments, custody metrics, territories, and supervisor contacts.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-slate-800">public.account_closures</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold">Table</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Field installations awaiting Admin verification, subscriber tags, and photos.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-slate-800">public.audit_logs</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold">Table</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Immutable chain-of-custody logging with timestamp, actor role, and item ID.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-slate-800">public.profiles</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold">Table</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      System users, administrator accounts, badge IDs, and RBAC permissions.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-teal-50/50 shadow-xs border-teal-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-teal-900">storage.potobucket</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-200 text-teal-900 font-bold">Bucket</span>
                    </div>
                    <p className="text-[11px] text-teal-800">
                      10MB photo bucket for ONT barcodes, power meters, customer installations, and damage tags.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Setup Instructions */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                  <Shield className="w-4 h-4 text-teal-600" />
                  <span>How to deploy to your Supabase Project</span>
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5">
                  <li>
                    Open your Supabase project dashboard at{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-teal-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      supabase.com/dashboard <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Click on <strong>SQL Editor</strong> in the left navigation sidebar.</li>
                  <li>Go to the <strong>SQL Schema (schema.sql)</strong> tab above and click <strong>Copy SQL Schema</strong>.</li>
                  <li>Paste into the Supabase SQL editor and click <strong>Run</strong>.</li>
                  <li>Add your project URL and Anon key into your project settings or environment.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: POTOBUCKET */}
          {activeTab === 'potobucket' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg border border-teal-200 text-teal-700 shadow-xs">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-teal-950">Supabase Storage Bucket: potobucket</h3>
                      <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                        PUBLIC READ
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-teal-900/80 leading-relaxed">
                      Used by field technicians to upload installation proof, ONT serial captures, optical RX meter readings,
                      and return condition photos. Used by Admins to verify closures before approval.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bucket Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-400 block">Bucket Identifier</span>
                  <span className="text-sm font-mono font-bold text-slate-800 mt-1 block">potobucket</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">storage.buckets.id</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-400 block">Max File Size</span>
                  <span className="text-sm font-bold text-slate-800 mt-1 block">10 MB per photo</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">file_size_limit = 10485760</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-400 block">Allowed MIME Types</span>
                  <span className="text-xs font-mono font-bold text-slate-800 mt-1 block">JPEG, PNG, WEBP, HEIC</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Auto-compressed in browser</span>
                </div>
              </div>

              {/* Live Photo Upload Tester */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-teal-600" />
                  <span>Test Upload to 'potobucket'</span>
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Upload an image to verify real-time bucket upload, path partitioning, and public URL generation.
                </p>

                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-[#003B46] hover:bg-[#002B33] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2 transition-all">
                    <Camera className="w-4 h-4" />
                    <span>{testUploadLoading ? 'Uploading to potobucket...' : 'Select Test Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleTestUpload}
                      disabled={testUploadLoading}
                      className="hidden"
                    />
                  </label>
                  {testUploadLoading && (
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {testUploadResult && (
                  <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 animate-in fade-in">
                    {testUploadResult.url ? (
                      <>
                        <img
                          src={testUploadResult.url}
                          alt="Test Upload"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded to potobucket
                          </span>
                          <a
                            href={testUploadResult.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-teal-700 font-mono truncate block hover:underline"
                          >
                            {testUploadResult.url}
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-red-600 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>{testUploadResult.error || 'Upload error'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RLS Policies Overview for Storage */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-xs font-bold text-slate-900 mb-2">Storage Access Security (RLS)</h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-800">Technicians</span>
                    <span className="text-[11px] text-emerald-700 font-medium">Can upload photos to their /technicians/ folder</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-800">Administrators</span>
                    <span className="text-[11px] text-emerald-700 font-medium">Can view, audit, and remove installation photos</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-800">Subscribers & Verification</span>
                    <span className="text-[11px] text-teal-700 font-medium">Public read URL for rapid barcode & optical inspection</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCHEMA.SQL */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">PostgreSQL Schema & Potobucket DDL</h4>
                  <p className="text-[11px] text-slate-500">
                    Execute this complete SQL script in your Supabase SQL Editor.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-lg bg-[#003B46] hover:bg-[#002B33] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                </button>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                <pre className="p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[380px] leading-relaxed">
                  {sqlSchemaCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Storage bucket: <strong className="font-mono text-slate-800">{PHOTO_BUCKET_NAME}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy Schema</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#003B46] hover:bg-[#002B33] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
