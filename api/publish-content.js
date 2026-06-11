import { savePublishedContent, sanitizePublishedContent } from "./_published-content-store.js";

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Publish-Token",
    Vary: "Origin",
  };
}

function sendJson(req, res, status, payload) {
  Object.entries(corsHeaders(req)).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
}

function tokenFromRequest(req) {
  const headerToken = req.headers?.["x-admin-publish-token"] || req.headers?.["X-Admin-Publish-Token"];
  const auth = String(req.headers?.authorization || "");
  const bearerToken = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  return String(headerToken || bearerToken || req.body?.publishToken || req.body?.adminPublishToken || "").trim();
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(req, res, 200, { ok: true });
  if (req.method !== "POST") return sendJson(req, res, 405, { ok: false, error: "Method not allowed." });

  const expectedToken = String(process.env.ADMIN_PUBLISH_TOKEN || "").trim();
  if (!expectedToken || tokenFromRequest(req) !== expectedToken) {
    return sendJson(req, res, 401, { ok: false, error: "Unauthorized publish request." });
  }

  try {
    const payload = sanitizePublishedContent({
      ...req.body,
      publishedAt: req.body?.publishedAt || new Date().toISOString(),
    });

    const published = await savePublishedContent(payload);
    return sendJson(req, res, 200, { ok: true, ...published });
  } catch (error) {
    return sendJson(req, res, error?.statusCode || 500, { ok: false, error: error?.message || "Publish failed.", code: error?.code || "PUBLISH_FAILED" });
  }
}
