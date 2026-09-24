import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project URL and anon key from environment variables
const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const envUrl = (metaEnv.VITE_SUPABASE_URL as string | undefined)?.trim();
const envAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

// Fallback dummy credentials when Supabase is not yet configured
const DUMMY_URL = 'https://placeholder.supabase.co';
const DUMMY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const SUPABASE_URL = envUrl && envUrl.startsWith('http') ? envUrl : DUMMY_URL;
export const SUPABASE_ANON_KEY = envAnonKey && envAnonKey.length > 10 ? envAnonKey : DUMMY_KEY;

export const PHOTO_BUCKET_NAME = 'potobucket';

/**
 * Check if a real Supabase configuration is provided in the environment
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    envUrl &&
    envUrl.startsWith('https://') &&
    !envUrl.includes('your-project') &&
    !envUrl.includes('placeholder') &&
    envAnonKey &&
    envAnonKey.length > 20 &&
    !envAnonKey.includes('your-anon')
  );
}

/**
 * Supabase client instance
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
