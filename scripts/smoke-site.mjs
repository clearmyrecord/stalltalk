import { readFileSync, existsSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const issuePage = readFileSync("app/issue/[venueSlug]/page.tsx", "utf8");
const adminLayout = readFileSync("app/admin/layout.tsx", "utf8");
const actions = readFileSync("lib/actions.ts", "utf8");
const legacyReadme = readFileSync("legacy/localstorage-publishing/README.md", "utf8");
const demo = readFileSync("data/demo.json", "utf8");

assert(adminLayout.includes("requireAdmin"), "Admin layout must enforce admin authentication.");
assert(actions.includes("await requireAdmin()"), "Server actions must require admin authentication for production publishing workflows.");
assert(actions.includes("prisma.$transaction"), "Issue updates must be wrapped in Prisma transactions.");
assert(actions.includes("This issue was changed by another editor"), "Issue updates must enforce optimistic concurrency.");
assert(issuePage.includes('status: "PUBLISHED"') && issuePage.includes('article.status === "PUBLISHED"') && issuePage.includes('approvalStatus: "APPROVED"'), "Public issue rendering must require published issues, published articles, and approved venue content.");
assert(!existsSync("admin/index.html") && !existsSync("script.js") && legacyReadme.includes("Quarantined"), "Legacy localStorage publishing files must be quarantined outside runnable paths.");
assert(JSON.parse(demo).ads.length >= 8, "Demo data must seed all eight ad slots and may include targeted overrides.");

console.log("Production hardening smoke tests passed.");
