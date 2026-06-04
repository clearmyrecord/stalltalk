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
