import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const supabaseUrl = rawSupabaseUrl ? rawSupabaseUrl.replace(/\/+$/, "") : undefined;
const supabaseAnonKey = rawSupabaseAnonKey || undefined;

function isValidSupabaseUrl(url?: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const supabaseEnabled = Boolean(isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey);

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
