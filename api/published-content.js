import { getLatestPublishedContent } from "./_published-content-store.js";

const ALLOWED_ORIGINS = new Set([
  "https://stalltalk.vercel.app",
  "https://clearmyrecord.github.io",
  "http://localhost:3000",
  "http://localhost:8080",
]);

function corsHeaders(req) {
  const origin = req.headers?.origin;
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://stalltalk.vercel.app",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function sendJson(req, res, status, payload) {
  Object.entries(corsHeaders(req)).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(req, res, 200, { ok: true });
  if (req.method !== "GET") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });

  try {
    const latest = await getLatestPublishedContent();
    if (!latest) return sendJson(req, res, 404, { ok: false, error: "No published content found." });
    return sendJson(req, res, 200, latest);
  } catch (error) {
    return sendJson(req, res, 500, { ok: false, error: error?.message || "Could not load published content." });
  }
}
