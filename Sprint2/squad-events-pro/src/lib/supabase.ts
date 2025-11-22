import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Vite exposes env vars under import.meta.env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let supabaseClient: SupabaseClient | null = null;

if (isSupabaseEnabled) {
  supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = supabaseClient;
