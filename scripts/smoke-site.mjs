import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const index = readFileSync("index.html", "utf8");
const admin = readFileSync("admin/index.html", "utf8");
const publicScript = readFileSync("script.js", "utf8");
const adminScript = readFileSync("admin/admin.js", "utf8");
const graphicAd = readFileSync("graphic-ad.js", "utf8");
const styles = readFileSync("style.css", "utf8");
const apiRoute = readFileSync("app/api/generate-ad-image/route.ts", "utf8");
const healthRoute = readFileSync("app/api/system-health/route.ts", "utf8");

assert((index.match(/data-ad="[1-8]"/g) || []).length >= 8, "Public page must include all eight ad slots.");
assert(index.includes("script.js") && index.includes("graphic-ad.js"), "Public page must load public issue scripts.");
assert(admin.includes("Content Studio") && admin.includes("QR Network") && admin.includes("Revenue"), "Admin page must expose Phase 3 tabs.");
assert(adminScript.includes("ST-MGM-CASINO-M-001"), "Demo QR route must include the requested MGM QR id.");
assert(publicScript.includes("seedDemoNetworkIfMissing") && publicScript.includes("recordAdImpressionOnce"), "Public issue must seed demo routing and de-dupe ad impressions.");
assert(graphicAd.includes("stallTalkShortText") && styles.includes("graphic-size-footer"), "Graphic ads must shorten text and support footer sizing.");
assert(apiRoute.includes("NextResponse.json") && apiRoute.includes("Missing OPENAI_API_KEY"), "Ad image endpoint must return JSON diagnostics for missing OpenAI configuration.");
assert(healthRoute.includes("runImageTest") && healthRoute.includes("deployment"), "System health endpoint must expose OpenAI/deployment diagnostics.");

console.log("Static smoke tests passed.");
