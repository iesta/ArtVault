import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requises dans .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function photoURL(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = supabase.storage.from("artwork-photos").getPublicUrl(path);
  return data.publicUrl;
}

export function docURL(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = supabase.storage.from("artwork-documents").getPublicUrl(path);
  return data.publicUrl;
}
