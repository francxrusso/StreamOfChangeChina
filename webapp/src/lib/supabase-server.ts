import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasServerSupabaseConfig() {
  return Boolean(supabaseUrl && (serviceRoleKey || anonKey));
}

export function createServerSupabaseClient() {
  if (!hasServerSupabaseConfig()) {
    return null;
  }

  return createClient(supabaseUrl as string, (serviceRoleKey || anonKey) as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
