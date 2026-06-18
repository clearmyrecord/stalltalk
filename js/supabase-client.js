const env = typeof import.meta !== "undefined" ? import.meta.env || {} : {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || window.STALLTALK_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || window.STALLTALK_SUPABASE_ANON_KEY || "";

export function assertSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase public configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
}

export async function supabaseRequest(path, options = {}) {
  assertSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.hint || `Supabase request failed: ${response.status}`);
  return data;
}
