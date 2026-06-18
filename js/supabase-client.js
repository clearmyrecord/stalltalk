function readSupabaseConfig() {
  try {
    const nextPublicEnv = typeof process !== "undefined" ? process.env || {} : {};
    const runtimeConfig = typeof window !== "undefined" ? window : {};
    return {
      url: nextPublicEnv.NEXT_PUBLIC_SUPABASE_URL || runtimeConfig.STALLTALK_SUPABASE_URL || "",
      anonKey: nextPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || runtimeConfig.STALLTALK_SUPABASE_ANON_KEY || ""
    };
  } catch (error) {
    console.error("Supabase initialization failed", error);
    return { url: "", anonKey: "" };
  }
}

const supabaseConfig = readSupabaseConfig();

export const SUPABASE_URL = supabaseConfig.url;
export const SUPABASE_ANON_KEY = supabaseConfig.anonKey;

export function isSupabaseConfigured() {
  try {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_"));
  } catch (error) {
    console.error("Supabase configuration check failed", error);
    return false;
  }
}

export async function supabaseFetch(path, options = {}) {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
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
  } catch (error) {
    console.error("Supabase request failed", error);
    throw error;
  }
}
