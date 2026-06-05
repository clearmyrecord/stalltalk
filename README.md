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

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL for production and local development
- Vercel-ready environment configuration
- Stripe-ready subscription and campaign models
- Server actions for MVP admin/portal workflows

## Setup

```bash
npm install
cp .env.example .env
npm run db:up
npx prisma migrate dev --name phase2_postgresql
npx prisma db seed
npm run check:phase2
npm run dev
```

Open these URLs after seeding:

- Marketing: <http://localhost:3000/>
- Demo QR issue: <http://localhost:3000/issue/mgm-grand-las-vegas?qr=ST-MGM-CASINO-M-001>
- Admin dashboard: <http://localhost:3000/admin>
- Advertiser portal: <http://localhost:3000/portal/advertiser>
- Distributor portal: <http://localhost:3000/portal/distributor>

## Local PostgreSQL

A `docker-compose.yml` file is included for local development. `npm run db:up` starts a PostgreSQL 16 container that matches the default `DATABASE_URL` in `.env.example`.

## Validation

`npm run check:phase2` runs a dependency-free structural validation that confirms the Phase 2 SaaS files, PostgreSQL schema, ad-serving priority, mobile sponsor persistence, analytics event coverage, and documentation are present. Run it before opening a PR or deploying to Vercel.

## Admin Routes

- `/admin` — SaaS dashboard
- `/admin/publishers` — publisher accounts
- `/admin/distributors` — distributor accounts and commission ownership
- `/admin/advertisers` — advertiser accounts
- `/admin/venues` — venues and restrooms
- `/admin/qr` — QR inventory, generation, assignment, and QR-level scans
- `/admin/articles` — article library with categories and scheduling
- `/admin/issues` — monthly issue list
- `/admin/issues/new` — issue creation
- `/admin/issues/[id]/edit` — issue editing and 1–8 ad slot assignment
- `/admin/issue-builder` — drag-and-drop-style layout planning surface
- `/admin/ads` — global/city/venue/restroom ad serving rules
- `/admin/analytics` — scans, visitors, time on page, ad/coupon analytics, top venues, top advertisers
- `/admin/stripe` — monthly subscription, per-location pricing, and coupon campaign readiness

## Ad Serving Priority

The public issue page fills eight sponsor positions using this priority:

1. Restroom ads
2. Venue ads
3. City ads
4. Global ads

Manual issue slots can still be assigned in the issue editor. The mobile issue layout keeps paid media visible with a sticky top sponsor, sticky bottom sponsor, inline sponsor cards, and an always-visible eight-position sponsor indicator. Desktop uses sticky left and right sponsor rails around the issue content.

## Analytics Events

The platform stores placeholder events for:

- QR scans
- Page views
- Unique and repeat visitors
- Time on page
- Ad impressions
- Ad clicks
- Coupon redemptions
- QR, venue, restroom, issue, advertiser, and ad attribution

## Seed Data

The seed creates:

- Publisher: Stall Talk Media
- Distributor: Vegas Restroom Network
- Venue: MGM Grand Las Vegas, Las Vegas, NV
- Restroom: Casino Floor Men’s Restroom
- QR code: `ST-MGM-CASINO-M-001`
- Issue: July 2024, Issue 81
- Advertisers and ads: Hooters, Columbus Zoo, bd’s Mongolian Grill, Honda Civic, TNA Wrestling, Graeter’s Ice Cream, Which Wich, and Energy Drink
- Category/article library records
- Stripe subscription, coupon campaign, commission report, and analytics placeholders

## Stripe Notes

Set these environment variables before connecting live billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_GLOBAL`
- `STRIPE_PRICE_CITY`
- `STRIPE_PRICE_VENUE`
- `STRIPE_PRICE_RESTROOM`

The database includes subscription and coupon campaign tables so live Stripe checkout/webhook routes can be added without changing the core data model.

## AI Creative Studio and Vercel Image Generation

The static `admin/` dashboard remains GitHub Pages compatible for issue editing, copy generation, HTML/CSS fallback ad previews, local campaign history, and local ad-slot publishing. Real AI image generation is handled by the Vercel serverless endpoint at `/api/generate-ad-image` so the browser never receives an OpenAI secret.

### Required Environment Variable

Set this variable in Vercel before using real image generation:

```bash
OPENAI_API_KEY=sk-...
```

Optional server-side tuning variables:

- `OPENAI_IMAGE_MODEL` — defaults to `dall-e-3`.
- `OPENAI_IMAGE_QUALITY` — defaults to `standard` for DALL·E and `auto` for `gpt-image-*` models.
- `OPENAI_IMAGE_OUTPUT_FORMAT` — defaults to `png` for `gpt-image-*` models.
- `OPENAI_IMAGE_RESPONSE_FORMAT` — defaults to `b64_json` for DALL·E models.
- `ALLOWED_ORIGIN` — comma-separated CORS origins, or `*` for demos.

### Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Add `OPENAI_API_KEY` in **Project Settings → Environment Variables** for Production, Preview, and Development as needed.
4. Deploy the project.
5. Open `/admin/` on the Vercel deployment and use **Ad Studio → AI Creative Studio → Generate Graphic Ad**.

If you host the static pages on GitHub Pages but the API on Vercel, set `admin/config.js` to point to the deployed Vercel function:

```js
window.STALLTALK_AD_IMAGE_ENDPOINT = "https://your-vercel-app.vercel.app/api/generate-ad-image";
```

### Test `/api/generate-ad-image`

With a deployed Vercel app or local Vercel dev server, send a POST request:

```bash
curl -X POST "https://your-vercel-app.vercel.app/api/generate-ad-image" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Nacho Average",
    "offer": "Half-price loaded fries after 9 PM",
    "audience": "concert crowds and casino guests",
    "tone": "Bold",
    "adSize": "Banner",
    "brandColors": "#ff2d2d, #ffd400, #7c2cff",
    "website": "https://nacho.example.com",
    "phone": "702-555-0199",
    "couponCode": "NACHO50",
    "visualStyle": "Neon Vegas poster",
    "optionalLogoUrl": ""
  }'
```

A successful response includes `imageUrl` or `imageBase64`, `promptUsed`, `headline`, `subheadline`, `ctaText`, `couponCode`, and `disclaimer`. If `OPENAI_API_KEY` is missing or the OpenAI request fails, the admin UI shows a clear error and keeps working with the HTML/CSS fallback preview.

### Why GitHub Pages Cannot Call OpenAI Directly

GitHub Pages serves only static frontend files. Any OpenAI API key placed in frontend JavaScript would be downloadable by every visitor, allowing unauthorized use of the account. The secure pattern is to keep `OPENAI_API_KEY` in a server-side environment variable and let a backend function, such as Vercel `/api/generate-ad-image`, call OpenAI on behalf of the admin UI.

### Local Storage Used by the Creative Studio

- `stalltalk_campaign_history` stores generated campaign history, including business name, offer, ad size, generated image data, prompt, creation time, and optional published slot.
- `stalltalk_ad_slots` stores published slot creative. Image-mode ads are saved with `adMode: "image"` and render on the homepage through `graphic-ad.js`.
