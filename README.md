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
3. Create a PostgreSQL database and set `DATABASE_URL`.
4. Add `OPENAI_API_KEY` in **Project Settings → Environment Variables**.
5. Add Stripe variables if billing is enabled.
6. Deploy.
7. Run Prisma migrations against production:

```bash
npx prisma migrate deploy
```

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

* Generate a campaign at `/admin/ads/new` with and without `OPENAI_API_KEY`.
* Confirm all four ad sizes render in preview mode.
* Publish a generated creative to Slot 1–8.
* Confirm the homepage loads generated slot artwork.
* Confirm the public issue page renders image ads, HTML fallback ads, and responsive mobile/desktop ad layouts.
