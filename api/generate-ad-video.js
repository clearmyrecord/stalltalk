function safeText(value, fallback = "") {
  return String(value || "").trim() || fallback;
}

function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  let payload;
  try {
    payload = parseBody(req);
  } catch (error) {
    res.status(400).json({ error: `Invalid JSON body: ${error.message}` });
    return;
  }

  res.status(501).json({
    error: "Video ad generation is scaffolded but not enabled yet.",
    status: "not_enabled",
    metadata: {
      sponsorName: safeText(payload.sponsorName || payload.businessName, "Local Sponsor"),
      offer: safeText(payload.offer, ""),
      category: safeText(payload.category || payload.businessCategory, ""),
      city: safeText(payload.city, ""),
      tone: safeText(payload.tone, ""),
      callToAction: safeText(payload.callToAction || payload.cta || payload.ctaText, ""),
      slot: safeText(payload.slot, ""),
    },
  });
};
