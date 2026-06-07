import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const index = readFileSync("index.html", "utf8");
const admin = readFileSync("admin/index.html", "utf8");
const publicScript = readFileSync("script.js", "utf8");
const adminScript = readFileSync("admin/admin.js", "utf8");
const styles = readFileSync("style.css", "utf8");
const demo = readFileSync("data/demo.json", "utf8");

assert((index.match(/data-ad-slot="[1-8]"/g) || []).length === 8, "Public page must include one inline instance of each of the eight ad slots.");
assert(index.includes("data-field=\"missionText\"") && index.includes("data-list=\"didYouKnow\""), "Public page must expose Potty Favor print-template content regions.");
assert(admin.includes("Content") && admin.includes("Venues / QR Codes") && admin.includes("Import / Export"), "Admin page must expose required Phase 1 tabs.");
assert(publicScript.includes("detectUserMarketByIp") && publicScript.includes("ad_impression") && publicScript.includes("qr_scan"), "Public script must include IP hook placeholder and analytics events.");
assert(adminScript.includes("pottyfavor_issue") && adminScript.includes("qrUrlForSlug") && adminScript.includes("Publish"), "Admin script must save Phase 1 localStorage data and generate QR URLs.");
assert(styles.includes("inline-ad") && styles.includes("sponsor-directory") && styles.includes("print-grid"), "Styles must support inline premium ads and magazine layout.");
assert(JSON.parse(demo).ads.length >= 8, "Demo data must seed all eight ad slots and may include targeted overrides.");

console.log("Static Potty Favor smoke tests passed.");
