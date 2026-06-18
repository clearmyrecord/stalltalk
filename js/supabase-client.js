const env = import.meta.env || {};
const runtimeConfig = typeof window !== "undefined" ? window : {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || runtimeConfig.STALLTALK_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || runtimeConfig.STALLTALK_SUPABASE_ANON_KEY || "";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_"));
}

export async function supabaseFetch(path, options = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase request failed (${response.status}): ${detail || response.statusText}`);
  }

  if (response.status === 204) return null;
  return response.json();
}
