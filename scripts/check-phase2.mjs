import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "app/admin/publishers/page.tsx",
  "app/admin/distributors/page.tsx",
  "app/admin/advertisers/page.tsx",
  "app/admin/qr/page.tsx",
  "app/admin/articles/page.tsx",
  "app/admin/issue-builder/page.tsx",
  "app/admin/stripe/page.tsx",
  "app/portal/advertiser/page.tsx",
  "app/portal/distributor/page.tsx",
  "app/api/analytics/route.ts",
  "app/api/stripe/checkout/route.ts",
  "app/api/stripe/webhook/route.ts",
  "lib/ad-serving.ts",
  "prisma/schema.prisma",
  "prisma/seed.ts"
];

const schema = readFileSync("prisma/schema.prisma", "utf8");
const issuePage = readFileSync("app/issue/[slug]/page.tsx", "utf8");
const adServing = readFileSync("lib/ad-serving.ts", "utf8");
const readme = readFileSync("README.md", "utf8");

const expectations = [
  [schema.includes('provider = "postgresql"'), "Prisma datasource must use PostgreSQL"],
  [["Publisher", "Distributor", "Advertiser", "Venue", "Restroom", "QrCode", "Issue", "Article", "Ad", "AnalyticsEvent", "StripeSubscription", "CommissionReport"].every((model) => schema.includes(`model ${model}`)), "Schema must include Phase 2 SaaS models"],
  [["RESTROOM", "VENUE", "CITY", "GLOBAL"].every((scope) => schema.includes(scope)), "Schema must include all ad scopes"],
  [["SCAN", "PAGE_VIEW", "TIME_ON_PAGE", "AD_IMPRESSION", "AD_CLICK", "COUPON_REDEMPTION"].every((event) => schema.includes(event)), "Schema must include required analytics event types"],
  [adServing.includes('["RESTROOM", "VENUE", "CITY", "GLOBAL"]'), "Ad serving priority must be Restroom > Venue > City > Global"],
  [issuePage.includes("sticky top") && issuePage.includes("fixed inset-x-0 bottom-0") && issuePage.includes("grid grid-cols-8"), "Mobile issue page must keep top, bottom, and 8-position sponsor UI visible"],
  [readme.includes("Publisher\n └── Distributor") && readme.includes("PostgreSQL") && readme.includes("Stripe"), "README must document hierarchy, PostgreSQL, and Stripe readiness"]
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Missing required files:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

const failures = expectations.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  console.error(`Phase 2 validation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log("Phase 2 platform validation passed.");
