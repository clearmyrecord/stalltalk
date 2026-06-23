# Stall Talk

Stall Talk is a publisher-grade restroom media SaaS platform. A scanned QR code opens a venue/restroom-specific issue page with persistent sponsor inventory, local content, coupon CTAs, and analytics.

## Platform Hierarchy

```text
Publisher
 └── Distributor
      └── Venue
            └── Restroom
                  └── QR Code
                        └── Monthly Issue
```

## Stack

* Next.js App Router
* TypeScript
* Tailwind CSS
* Prisma
* PostgreSQL for production and local development
* Vercel-ready environment configuration
* Stripe-ready subscription and campaign models
* Multi-month advertiser campaign flights with Stripe Checkout metadata
* Server actions for MVP admin/portal workflows

## Setup

```bash
npm install
cp .env.example .env
npm run db:up
npx prisma migrate dev
npx prisma db seed
npm run check:phase2
npm run dev
```

Open these URLs after seeding:

* Marketing: http://localhost:3000/
* Demo QR issue: http://localhost:3000/issue/mgm-grand-las-vegas?qr=ST-MGM-CASINO-M-001
* Admin dashboard: http://localhost:3000/admin
* Advertiser portal: http://localhost:3000/portal/advertiser
* Distributor portal: http://localhost:3000/portal/distributor

## Local PostgreSQL

A `docker-compose.yml` file is included for local development. `npm run db:up` starts a PostgreSQL 16 container that matches the default `DATABASE_URL` in `.env.example`.

## Admin Routes

* `/admin` — SaaS dashboard
* `/admin/publishers` — publisher accounts
* `/admin/distributors` — distributor accounts and commission ownership
* `/admin/advertisers` — advertiser accounts
* `/admin/venues` — venues and restrooms
* `/admin/qr` — QR inventory, generation, assignment, and QR-level scans
* `/admin/articles` — article library with categories and scheduling
* `/admin/issues` — monthly issue list
* `/admin/issues/new` — issue creation
* `/admin/issues/[id]/edit` — issue editing and 1–8 ad slot assignment
* `/admin/issue-builder` — drag-and-drop-style layout planning surface
* `/admin/ads` — global/city/venue/restroom ad serving rules
* `/admin/ads/new` — AI Creative Studio
* `/admin/analytics` — scans, visitors, time on page, ad/coupon analytics, top venues, top advertisers
* `/admin/stripe` — monthly subscription, per-location pricing, and coupon campaign readiness

## GitHub Pages Shared Publishing

The static public Potty Favor page supports shared publication JSON files so content updates can appear on phones and other devices without adding a database or authentication layer. On page load, `script.js` fetches these files with cache busting before using browser-local fallback data:

1. `data/published-issue.json`
2. `data/published-ads.json`
3. localStorage issue/ad data
4. bundled demo data

Admin drafts and local previews still use localStorage. To publish shared content for GitHub Pages:

1. Open `admin/index.html`.
2. Edit the issue and ads.
3. Use **Publish Locally** only when you want the current browser to see the update immediately.
4. Use **Download Publish Bundle** to download `published-issue.json` and `published-ads.json`, then replace the matching files in `/data` on GitHub and commit them.
5. Or use **Copy Codex Publish Command** and paste the generated command into Codex/GitHub so the `/data` files can be updated and committed.

After GitHub Pages deploys the committed JSON files, all devices load the same shared issue and targeted ad slots.

## AI Creative Studio

The AI Creative Studio lives at `/admin/ads/new` and turns advertiser details into campaign creative.

Workflow:

1. **Business** — business name, category, website, phone, and logo context.
2. **Offer** — offer, coupon code, CTA button text, and expiration date.
3. **Audience** — tourists, locals, casino guests, sports fans, concert goers, convention attendees, or custom audience.
4. **Creative Direction** — tone, visual style, brand colors, and ad size.
5. **Generate Campaign** — creates Banner, Square, Tall, and Footer creative previews from one campaign brief.

Real AI image generation is handled by the Vercel/Next.js API route:

```text
POST /api/generate-ad-image
```

GitHub Pages cannot securely call OpenAI directly because any API key placed in frontend JavaScript would be visible to visitors. The secure pattern is to keep `OPENAI_API_KEY` in a server-side environment variable and let Vercel call OpenAI.

## Required Environment Variables

Set this in Vercel before using real image generation:

```bash
OPENAI_API_KEY=sk-...
```

Optional image settings:

* `OPENAI_IMAGE_MODEL` — defaults to `dall-e-3`
* `OPENAI_IMAGE_QUALITY` — defaults to `standard` for DALL·E and `auto` for `gpt-image-*` models
* `OPENAI_IMAGE_OUTPUT_FORMAT` — defaults to `png` for `gpt-image-*` models
* `OPENAI_IMAGE_RESPONSE_FORMAT` — defaults to `b64_json` for DALL·E models
* `ALLOWED_ORIGIN` — comma-separated CORS origins, or `*` for demos

Stripe variables:

* `STRIPE_SECRET_KEY`
* `STRIPE_WEBHOOK_SECRET`
* `STRIPE_PRICE_GLOBAL`
* `STRIPE_PRICE_CITY`
* `STRIPE_PRICE_VENUE`
* `STRIPE_PRICE_RESTROOM`

## Test Image Generation

```bash
curl -X POST http://localhost:3000/api/generate-ad-image \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "BrewDog Las Vegas",
    "category": "Restaurant / Bar",
    "offer": "15% OFF",
    "audience": "Tourists",
    "tone": "Funny",
    "visualStyle": "Vegas Neon",
    "website": "https://example.com",
    "phone": "702-555-0100",
    "couponCode": "BREW15",
    "brandColors": "#ff2d55,#ffd400,#5b2cff",
    "adSize": "Banner"
  }'
```

A successful response includes:

* `imageUrl` or `imageBase64`
* `promptUsed`
* `headline`
* `subheadline`
* `ctaText`
* `couponCode`
* `disclaimer`

If `OPENAI_API_KEY` is missing or the OpenAI request fails, the UI shows a clear error and falls back to an HTML/SVG mock advertisement.

## Creative Studio Local Storage

* `stalltalk_campaign_history` stores generated campaign history, including business name, offer, ad size, generated image data, prompt, creation time, and optional published slot.
* `stalltalk_ad_slots` stores published Slot 1–8 creative assignments.
* Image-mode ads are saved with `adMode: "image"` and render on the homepage through `graphic-ad.js`.

## Ad Serving Priority

The public issue page fills eight sponsor positions using this priority:

1. Restroom ads
2. Venue ads
3. City ads
4. Global ads

Manual issue slots can still be assigned in the issue editor. The mobile issue layout keeps paid media visible with a sticky top sponsor, sticky bottom sponsor, inline sponsor cards, and an always-visible eight-position sponsor indicator. Desktop uses sticky left and right sponsor rails around the issue content.

## Analytics Events

The platform stores placeholder events for:

* QR scans
* Page views
* Unique and repeat visitors
* Time on page
* Ad impressions
* Ad clicks
* Coupon redemptions
* QR, venue, restroom, issue, advertiser, and ad attribution

## Seed Data

The seed creates:

* Publisher: Stall Talk Media
* Distributor: Vegas Restroom Network
* Venue: MGM Grand Las Vegas, Las Vegas, NV
* Restroom: Casino Floor Men’s Restroom
* QR code: `ST-MGM-CASINO-M-001`
* Issue: July 2024, Issue 81
* Advertisers and ads: Hooters, Columbus Zoo, bd’s Mongolian Grill, Honda Civic, TNA Wrestling, Graeter’s Ice Cream, Which Wich, and Energy Drink
* Category/article library records
* Stripe subscription, coupon campaign, commission report, and analytics placeholders

## Vercel Deployment

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Create a PostgreSQL database and set `DATABASE_URL` to the Neon/Postgres connection string for **both Production and Preview** in **Project Settings → Environment Variables**.
4. Set `AUTH_SECRET` for **both Production and Preview** so role sessions can be created.
5. Add `OPENAI_API_KEY` in **Project Settings → Environment Variables**.
6. Add Stripe variables if billing is enabled.
7. Keep the Vercel build command configured as:

```bash
npm run vercel-build
```

The repository-level Vercel build command runs `prisma generate` and `next build` only. Prisma migrations are intentionally not part of the Vercel build because concurrent Production/Preview deployments can otherwise compete for Postgres advisory locks on Neon/Postgres and fail with Prisma `P1002` while running `prisma migrate deploy`.

Run committed migrations as a separate, serialized release step before deploying when schema changes are included:

```bash
npm run migrate:deploy
```

The migration helper runs `prisma migrate deploy` with retry/timeout handling for transient advisory-lock contention. Run only one migration job per target database at a time. Do not use `prisma db push` for normal deployments; reserve it for documented emergency-only database repair when migrations cannot be used.

After the first migration deploy, create seed users with `npx prisma db seed` against the production database or use the guarded bootstrap admin flow on `/signin`. The bootstrap flow only creates `admin@pottyfavor.com` when no admin user exists, then the password should be changed immediately.

If static pages are hosted on GitHub Pages but the API is hosted on Vercel, set `admin/config.js` to point to the deployed Vercel function:

```js
window.STALLTALK_AD_IMAGE_ENDPOINT = "https://your-vercel-app.vercel.app/api/generate-ad-image";
```

## Validation

Before opening a PR or deploying, run:

```bash
npm run check:phase2
npx prisma validate
npm run build
```

Manual checks:

The database includes subscription and coupon campaign tables so live Stripe checkout/webhook routes can be added without changing the core data model.

## AI Creative Studio + OpenAI Image Generation

The AI Creative Studio lives at `/admin/ads/new` and replaces manual ad creation with a guided campaign builder.

Workflow:

1. **Business** — business name, category, website, phone, and logo context.
2. **Offer** — offer, coupon code, CTA button text, and expiration date.
3. **Audience** — tourists, locals, casino guests, sports fans, concert goers, convention attendees, or a custom audience.
4. **Creative Direction** — tone, visual style, brand colors, and ad size.
5. **Generate Campaign** — creates Banner, Square, Tall, and Footer creative previews from one campaign brief.

The Vercel/Next.js API route is:

```text
POST /api/generate-ad-image
```

## Phase 3: Venue Network + Revenue Engine

Phase 3 turns Stall Talk / Potty Favor into a browser-stored restroom media network while preserving the existing public issue page, publisher dashboard, AI Creative Studio, ad slot publishing, and content publishing flows.

### Brand Structure

The dashboard now supports two brand layers:

* **Stall Talk** — the B2B platform for venues, advertisers, distributors, and publishers.
* **Potty Favor** — the consumer-facing restroom publication that guests see after scanning a QR code.

Brand settings are stored in `stalltalk_settings` and include active brand, logo text, tagline, and color theme.

### LocalStorage Data Model

Phase 3 remains frontend-only for GitHub Pages demos and stores network data in localStorage using these keys:

* `stalltalk_settings` — brand and issue identity settings.
* `stalltalk_venues` — venue CRM records with slugs, contacts, status, and notes.
* `stalltalk_qr_locations` — restroom / placement QR records with `qrId`, `venueId`, target URL, status, and scan-count placeholder.
* `stalltalk_issues` — draft, published, and archived venue issue records with content blocks and assigned ad slots.
* `stalltalk_advertisers` — advertiser CRM records, monthly spend, assigned venues, and assigned campaigns.
* `stalltalk_campaigns` — campaign records created manually or from the AI Creative Studio.
* `stalltalk_ad_slots` — eight-slot ad inventory with pricing, availability, advertiser, campaign, and flight dates.
* `stalltalk_analytics_events` — MVP analytics events for QR scans, issue views, ad impressions, ad clicks, and coupon clicks.
* `stalltalk_distributors` — distributor placeholder records with assigned venues and commission rate.

The **Data** tab includes **Export All Data**, **Import Data**, and **Reset Demo Network** controls for migration testing and local backup.

### QR URL Examples

QR target URLs follow this pattern:

```text
/?venue={venueSlug}&qr={qrId}
```

Examples:

```text
/?venue=brewdog-las-vegas&qr=mens-stall-1
/?venue=mgm-grand-las-vegas&qr=womens-stall-1
/?venue=lee-canyon&qr=mirror-1
```

When a venue and QR are present, the public page loads the matching venue, finds a published issue for that venue, displays venue/city metadata, records a `qr_scan`, records an `issue_view`, increments the QR scan-count placeholder, and renders active campaign slots for that venue. Without query parameters, it falls back to the default Las Vegas demo issue.

### Demo Workflow

1. Open `admin/index.html`.
2. Use **Reset Demo Network** in the Data tab to seed MGM Grand Las Vegas, BrewDog Las Vegas, Gilley’s Saloon, Lee Canyon, demo advertisers, demo campaigns, eight priced ad slots, and the Las Vegas Strip Distributor.
3. Open **Venues** to confirm venue CRM records and preview a venue issue.
4. Open **QR Network** to view restroom placements and QR previews.
5. Open **Issues** to duplicate, publish, archive, or preview venue-specific issues.
6. Open **Campaigns** or the **AI Creative Studio** to create campaigns and publish them into slots.
7. Scan or open a URL such as `/?venue=brewdog-las-vegas&qr=mens-stall-1`.
8. Return to **Analytics** and **Revenue** to see local event counts and estimated revenue calculations.

### Revenue and Distributor Notes

The revenue dashboard calculates estimates from the eight ad slot defaults:

* Slot 1 Top Sponsor — $250/month
* Slots 2–7 Inline Sponsor — $150/month each
* Slot 8 Footer Sponsor — $200/month

Active slot revenue is counted when a slot is sold or has a campaign assignment. Open slot opportunity is the sum of unfilled slot prices. Distributor commission is currently a placeholder calculation: assigned distributors earn 20% of assigned venue ad revenue.

### Future Backend Migration Notes

The Phase 3 localStorage model is intentionally shaped like backend tables. A future migration can map each key to database tables or API resources:

* venues, QR locations, issues, advertisers, campaigns, ad slots, analytics events, and distributors become authenticated CRUD endpoints.
* `qr_scan`, `issue_view`, `ad_impression`, `ad_click`, and `coupon_click` should move to append-only analytics ingestion.
* Revenue estimates can become invoice, Stripe subscription, and commission-report records.
* Export/import JSON can become a migration bridge for early customer pilots.

## Current QA Workflow (June 2026)

Stall Talk / Potty Favor supports two operating modes:

1. **Next.js/Vercel production mode** for dynamic API routes, Prisma-backed admin pages, OpenAI image generation, Stripe, and deployment health checks.
2. **Static GitHub Pages/demo mode** for `index.html` and `admin/index.html`, where venue, QR, content, ads, analytics, revenue, distributor, and campaign data are stored in browser `localStorage`.

For a stabilization pass, run the full validation set from the repository root:

```bash
npm run build
npx prisma validate
npm run check:phase2
node --check admin/admin.js
node --check script.js
node --check graphic-ad.js
npm run smoke:site
```

`prisma.config.ts` provides a non-secret local PostgreSQL fallback URL so `npx prisma validate` can succeed in QA environments that have not set `DATABASE_URL`. Real deployments should still provide their own production database URL.

## Environment Variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Vercel/Prisma production | PostgreSQL connection string used by Prisma-backed pages and APIs. Missing database records are guarded so public pages show diagnostics/placeholders instead of crashing. |
| `OPENAI_API_KEY` | AI Creative Studio image generation | Required by `/api/generate-ad-image`. Missing keys return clear JSON diagnostics and the admin does not silently publish fallback ads. |
| `OPENAI_IMAGE_MODEL` | Optional image model override | Defaults to `gpt-image-1.5`; supported image models are validated by the API route. |
| `OPENAI_IMAGE_QUALITY` | Optional image quality | Defaults to `medium` for GPT image models. |
| `OPENAI_IMAGE_OUTPUT_FORMAT` | Optional image format | Defaults to `png`. |
| `STRIPE_SECRET_KEY` / webhook settings | Stripe workflows | Needed only for live Stripe checkout/webhook routes. |

## Vercel Deployment

1. Connect the repository to Vercel.
2. Set `DATABASE_URL` and `AUTH_SECRET` for both Production and Preview in Vercel Project Settings, plus any live API keys.
3. Confirm Vercel's build command is `npm run vercel-build`; `vercel.json` pins that command for this repo. This command delegates to the safe production build (`prisma generate && next build`) and does not acquire Prisma migration locks.
4. If the deploy includes committed Prisma migrations, run `npm run migrate:deploy` once against the target database before the Vercel deployment, or from a single serialized CI/release job. Do not let multiple Vercel builds run migrations against the same Neon/Postgres database concurrently.
5. Deploy the Next.js app. The build runs `prisma generate` before `next build`, while Prisma-backed routes remain dynamic and guard database reads.
6. Seed production with `npx prisma db seed` when demo users are desired, or let `/signin` create the guarded emergency `admin@pottyfavor.com` bootstrap account if no admin exists.
7. Do not use `prisma db push` for normal deployments; use it only as an explicitly documented emergency-only database repair step.
8. Visit `/api/system-health`, `/admin/startup-diagnostics`, and `/admin/settings` → **Test OpenAI Connection** to confirm database, seed/bootstrap admin, OpenAI, and publish-engine diagnostics.

## GitHub Pages / Static Mode

Static mode uses:

- `/index.html` for the public Potty Favor issue.
- `/admin/index.html` for the localStorage admin dashboard.
- `window.STALLTALK_AD_IMAGE_ENDPOINT` in `admin/config.js` to point static admin users at a deployed Vercel `/api/generate-ad-image` endpoint.

If the endpoint is unavailable or returns non-JSON, the admin now shows a clear connection diagnostic. Static mode seeds the MGM Grand demo venue/QR/issue when needed, including:

```text
/?venue=mgm-grand-las-vegas&qr=ST-MGM-CASINO-M-001
```

## AI Creative Studio

The AI Creative Studio is intentionally image-first:

- **Generate Copy** creates editable campaign copy only.
- **Generate Graphic Ad** calls the configured API endpoint.
- Missing or failed OpenAI configuration returns exact diagnostics.
- Failed generation leaves the ad in a pending state and blocks slot publishing.
- Long business names, headlines, offers, CTAs, coupons, and contact text are shortened and wrapped safely across Banner, Square, Tall, and Footer ad sizes.
- Publishing to Slot 1–8 creates/updates an active local campaign and updates the public homepage slots.

## Phase 3 Venue Network

The static admin supports demo/localStorage workflows for:

- Venues and venue-specific issue previews.
- QR locations and QR previews.
- Issues and issue duplication.
- Eight ad inventory slots with pricing and availability.
- Advertisers, campaigns, publish/pause status, and revenue estimates.
- Analytics events: `qr_scan`, `issue_view`, `ad_impression`, `ad_click`, and `coupon_click`.
- Distributors and placeholder commissions.
- Data export/import/reset across the Stall Talk storage keys without cross-key corruption.

Canonical localStorage keys:

```text
stalltalk_settings
stalltalk_venues
stalltalk_qr_locations
stalltalk_issues
stalltalk_advertisers
stalltalk_campaigns
stalltalk_ad_slots
stalltalk_analytics_events
stalltalk_distributors
stalltalk_campaign_history
```

## QA Checklist

- Public issue loads on mobile and desktop with eight visible sponsor placements.
- Default demo issue works without query parameters.
- MGM venue/QR URL routes correctly and increments the scan-count placeholder.
- Articles expand/collapse and update labels.
- Image ads render when generated image data exists.
- HTML/demo ads render only for existing demo or campaign creative; pending AI failures are not publishable.
- Empty slots show clean placeholders.
- Admin tabs load: Dashboard, Content Studio, Ad Studio, Preview, Settings, Venues, QR Network, Issues, Ad Inventory, Advertisers, Campaigns, Analytics, Revenue, Distributors, and Data.
- Content Studio generate/save/publish/reset flows update preview and public issue data.
- Ad Studio endpoint failures show diagnostics, while successful image results can publish to Slots 1–8.
- Analytics records one ad impression per slot per page load, plus QR scans, issue views, ad clicks, and coupon clicks.
- Data import rejects invalid JSON with a friendly error.
- `npm run build`, `npx prisma validate`, `npm run check:phase2`, JS syntax checks, and `npm run smoke:site` pass before release.

## Phase 2A paid advertiser inventory environment

Set these variables in Vercel or your local `.env` before enabling paid advertiser inventory:

- `DATABASE_URL` — PostgreSQL connection string used by Prisma.
- `ADMIN_PUBLISH_TOKEN` — server-side token required by `/api/publish-content`; do not embed it in frontend code.
- `STRIPE_SECRET_KEY` — Stripe secret key for Checkout session creation.
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret for marking campaigns paid.
- `NEXT_PUBLIC_SITE_URL` — canonical site URL used for Stripe success/cancel redirects.
- `AUTH_SECRET` — random secret used to hash role-session tokens.

Optional seeded account variables:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `ADVERTISER_EMAIL`, `ADVERTISER_PASSWORD`
- `VENUE_EMAIL`, `VENUE_PASSWORD`

If auth or Stripe variables are missing, the app shows setup messages and keeps the existing admin/public publishing surfaces available instead of crashing.

## Phase 2A workflow

Advertisers reserve inventory at `$50 × number of QR/toilet locations × number of months`, save draft creative, and use Stripe Checkout. Webhook-confirmed payments mark campaigns paid; only paid and approved campaigns are eligible for live ad-slot publishing. Venue users can draft property-specific content for admin approval without editing global admin content.

## Phase 2B Role-Based Dashboards

### Login URLs

* Sign in: `http://localhost:3000/signin`
* Admin dashboard: `http://localhost:3000/admin/dashboard`
* Advertiser dashboard: `http://localhost:3000/portal/advertiser`
* Venue dashboard: `http://localhost:3000/portal/venue`

After successful login, users are redirected by role:

* `ADMIN` → `/admin/dashboard`
* `ADVERTISER` → `/portal/advertiser`
* `VENUE` → `/portal/venue`

Each dashboard includes a logout action. When `AUTH_SECRET` and `DATABASE_URL` are configured, role dashboards redirect unauthorized users back to `/signin?error=role`.

### Required environment variables

* `DATABASE_URL` — PostgreSQL connection string for Prisma-backed dashboards, Stripe records, campaigns, venue drafts, and sessions.
* `AUTH_SECRET` — random secret used to hash session tokens.
* `NEXT_PUBLIC_SITE_URL` — public base URL for Stripe Checkout success/cancel redirects.
* `STRIPE_SECRET_KEY` — Stripe secret key for Checkout session creation.
* `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret for marking paid campaigns.
* `OPENAI_API_KEY` — required only for live AI Creative Studio image generation.
* `ADMIN_PUBLISH_TOKEN` — required for protected Publish Live API calls.

The UI shows setup notices when auth, database, or Stripe variables are missing.

### Seed users

`npx prisma db seed` creates example role accounts:

| Role | Email | Default password |
| --- | --- | --- |
| Admin | `admin@pottyfavor.com` | `admin-password-change-me` |
| Advertiser | `advertiser@pottyfavor.com` | `advertiser-password-change-me` |
| Venue | `venue@pottyfavor.com` | `venue-password-change-me` |

Override these with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADVERTISER_EMAIL`, `ADVERTISER_PASSWORD`, `VENUE_EMAIL`, and `VENUE_PASSWORD` before seeding.

### Role descriptions

* `ADMIN` users manage all venues, QR/toilet locations, ad inventory, advertiser campaigns, payments, venue content drafts, content editing, and Publish Live status.
* `ADVERTISER` users view and filter available inventory, select one or multiple placements, choose a start month and 1/2/3/6/12-month flight duration, see live pricing, save creative drafts, preview campaigns, and pay with Stripe Checkout.
* `VENUE` users view only assigned venues/properties, QR/toilet locations, active campaigns in their properties, and property-specific content drafts. Venue users cannot edit global Potty Favor content or approve their own drafts.


### Multi-month advertiser campaign flights

Advertiser campaigns support campaign flights that run for 1, 2, 3, 6, or 12 months. The advertiser portal collects a start month and duration, calculates the end month, and previews the total using the business rule:

```text
$50 × selected QR/toilet placements × selected months
```

Each campaign stores `flightStartMonth`, `flightEndMonth`, `flightMonths`, `pricePerPlacementMonthCents`, `placementCount`, and `totalAmountCents`. Paid or active campaigns block any later booking that overlaps the same QR/toilet slot for the same month range. Public ad serving respects the stored flight start/end dates, and the admin dashboard displays the flight range, duration, total amount, and active/upcoming/expired flight status.

### Stripe webhook setup

1. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_SITE_URL` locally or in Vercel.
2. In Stripe Dashboard, create a webhook endpoint pointing to:

   ```text
   https://your-domain.example/api/stripe/webhook
   ```

3. Subscribe the endpoint to `checkout.session.completed`.
4. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Create or seed an advertiser campaign, click **Pay with Stripe Checkout**, complete the Checkout flow, and confirm the webhook changes the campaign to paid. Checkout amounts are calculated as `$50 × selected QR/toilet placements × selected months`, and Stripe metadata includes `campaignId`, `placementCount`, `flightMonths`, `flightStartMonth`, and `flightEndMonth`.

### Basic testing checklist

* Sign in as `admin@pottyfavor.com` and confirm `/admin/dashboard` shows venues, QR/toilet locations, inventory, campaigns, payments, and venue draft approval actions.
* Sign in as `advertiser@pottyfavor.com` and confirm inventory filters, multi-placement selection, start month selection, flight duration selection, live price preview, campaign draft save, preview cards, and Stripe Checkout setup notices work.
* Sign in as `venue@pottyfavor.com` and confirm only assigned venues/properties, QR/toilet locations, active campaigns, and venue draft statuses appear.
* Attempt to open another role’s dashboard and confirm the app redirects to `/signin?error=role` when auth is configured.
* Approve/reject an advertiser campaign and a venue content draft from the admin dashboard, including rejection reasons.
* Confirm a paid + approved advertiser campaign is eligible for public ad serving only during its flight dates and approved venue content appears on the matching public venue issue.
* Run `npx prisma validate`, `npm run build`, `npm run smoke:site`, `node --check admin/admin.js`, and `node --check script.js` before release.

## Issue scheduling cron

Vercel calls `/api/scheduler/publish-issues` hourly (`0 * * * *`). Configure `CRON_SECRET` in environment variables; the scheduler endpoint requires `Authorization: Bearer $CRON_SECRET` for cron calls, while admin/manual mode requires an authenticated ADMIN.
