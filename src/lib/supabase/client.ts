import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Normalizes Supabase URL to ensure it points to project root:
 * - Removes leading/trailing quotes and spaces
 * - Strips accidental paths like /rest/v1, /rest/v1/, /auth/v1, /storage/v1
 * - Strips trailing slashes
 */
export function normalizeSupabaseUrl(rawUrl?: string): string {
  let url = (rawUrl || '').trim().replace(/^["']|["']$/g, '');
  if (!url) {
    url = 'https://ekkveifmfrhbkfozujgm.supabase.co';
  }
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // Strip accidental subpaths like /rest/v1, /rest/v1/, /auth/v1, /storage/v1
  url = url.replace(/\/(rest|auth|storage|functions)(\/v\d+.*|\/.*)?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

export function getSupabaseAnonKey(rawKey?: string): string {
  const key = (rawKey || '').trim().replace(/^["']|["']$/g, '');
  return key || 'sb_publishable_GFFo7rCM0Vv8DZYCVla2mw_DsJQ1Z4A';
}

let _client: SupabaseClient | null = null;
let _clientUrl: string | null = null;
let _clientKey: string | null = null;

export function createClient(): SupabaseClient {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = getSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (_client && _clientUrl === url && _clientKey === key) {
    return _client;
  }

  _client = createSupabaseClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  _clientUrl = url;
  _clientKey = key;
  return _client;
}

export const supabase = createClient();
