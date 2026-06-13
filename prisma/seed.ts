import { scryptSync, randomBytes } from "node:crypto";
import { AdScope, ContentBlockType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const sponsorAds = [
  ["Hooters", "Wings After the Win", "Free fried pickles with any 10-wing order.", "VENUE", "STALLWINGS", 49900],
  ["Columbus Zoo", "Wild Weekend", "Save $5 on admission and meet somebody hairier than your group chat.", "GLOBAL", "ZOOLOO", 19900],
  ["bd’s Mongolian Grill", "Build Your Bowl", "Two-for-one stir-fry bowls before 6 PM.", "CITY", "BDSTIR", 29900],
  ["Honda Civic", "Civic Energy", "Lease-ready style with gas mileage your wallet can respect.", "GLOBAL", "CIVIC81", 19900],
  ["TNA Wrestling", "Body Slams Live", "Ringside seats, loud crowds, and restroom-line drama.", "CITY", "STALLSLAM", 29900],
  ["Graeter’s Ice Cream", "Scoop There It Is", "Buy one scoop, get one half off after dinner.", "RESTROOM", "POTTYPOP", 69900],
  ["Which Wich", "Superior Sandwiches", "Free chips with any large wich today.", "VENUE", "WICH81", 49900],
  ["Energy Drink", "Flush the Fatigue", "Two cans for $5 when your night refuses to end.", "RESTROOM", "ZAPSTALL", 69900]
] as const;

const blocks = [
  [ContentBlockType.JOKE, "Restroom Thought of the Month", "If a bathroom has a couch, is it hospitality or a cry for help? Either way, hydrate."],
  [ContentBlockType.FACT, "Did You Know?", "A QR sticker can be tied to a specific restroom, letting sponsors buy the exact audience and location they want."],
  [ContentBlockType.QUOTE, "Quote Worth Washing For", "Be the person who replaces the roll: quiet leadership, immediate impact, universal gratitude."],
  [ContentBlockType.ARTICLE, "Word of the Day: Serendipity", "Serendipity means a lucky discovery. Example: finding a great taco deal while pretending to answer emails."],
  [ContentBlockType.CALENDAR, "Las Vegas Entertainment Calendar", "Friday: rooftop DJ set. Saturday: comedy late show. Sunday: recovery brunch with extra napkins."],
  [ContentBlockType.COUPON, "Local Deals", "Show any participating sponsor this issue and ask for the Stall Talk special. Coupon redemptions are tracked for campaign reporting."],
  [ContentBlockType.ARTICLE, "Featured Article: The Art of the Perfect Exit", "A graceful exit requires timing, confidence, and pretending you knew exactly which direction the sink was the entire time."],
  [ContentBlockType.EVENT, "Event Spotlight", "This month’s spotlight is a neon night market with food trucks, pop-up artists, and enough dessert to justify a second lap."]
] as const;

async function main() {
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.advertiserInvoice.deleteMany();
  await prisma.adCreative.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.adCampaignPlacement.deleteMany();
  await prisma.adCampaign.deleteMany();
  await prisma.adSlotInventory.deleteMany();
  await prisma.toiletLocation.deleteMany();
  await prisma.venueContentDraft.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.stalltalkCampaignHistory.deleteMany();
  await prisma.stalltalkAdSlot.deleteMany();
  await prisma.issueAdSlot.deleteMany();
  await prisma.issueContentBlock.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.restaurantReview.deleteMany();
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();
  await prisma.stripeSubscription.deleteMany();
  await prisma.commissionReport.deleteMany();
  await prisma.couponCampaign.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.advertiser.deleteMany();
  await prisma.qrCode.deleteMany();
  await prisma.restroom.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.distributor.deleteMany();
  await prisma.publisher.deleteMany();

  const publisher = await prisma.publisher.create({ data: { name: "Stall Talk Media", slug: "stall-talk-media", contactEmail: "ops@stalltalk.local" } });
  const distributor = await prisma.distributor.create({ data: { publisherId: publisher.id, name: "Vegas Restroom Network", slug: "vegas-restroom-network", contactEmail: "vegas@stalltalk.local", commissionRate: 0.2 } });
  const demoVenues = await Promise.all([
    { name: "MGM Grand", slug: "mgm-grand", address: "3799 S Las Vegas Blvd", city: "Las Vegas", state: "NV", venueType: "casino resort" },
    { name: "New York-New York", slug: "new-york-new-york", address: "3790 S Las Vegas Blvd", city: "Las Vegas", state: "NV", venueType: "casino resort" },
    { name: "Bellagio", slug: "bellagio", address: "3600 S Las Vegas Blvd", city: "Las Vegas", state: "NV", venueType: "casino resort" },
    { name: "Local Restaurant Demo", slug: "local-restaurant-demo", address: "Demo Restaurant Row", city: "Las Vegas", state: "NV", venueType: "restaurant" },
    { name: "Local Bar Demo", slug: "local-bar-demo", address: "Demo Bar District", city: "Las Vegas", state: "NV", venueType: "bar" }
  ].map((item) => prisma.venue.create({ data: { publisherId: publisher.id, distributorId: distributor.id, ...item } })));
  const [venue, newYorkVenue, bellagioVenue, restaurantVenue, barVenue] = demoVenues;
  const restroom = await prisma.restroom.create({ data: { venueId: venue.id, name: "Casino Floor Men’s Restroom", floor: "Casino", placement: "Sink wall QR sticker" } });
  const qrCode = await prisma.qrCode.create({ data: { publisherId: publisher.id, venueId: venue.id, restroomId: restroom.id, code: "ST-MGM-CASINO-M-001", label: "MGM Casino Men’s #001", destination: "/issue?venue=mgm-grand&qr=ST-MGM-CASINO-M-001", status: "ASSIGNED" } });
  const toiletLocation = await prisma.toiletLocation.create({ data: { venueId: venue.id, restroomId: restroom.id, qrCodeId: qrCode.id, name: "Casino Floor Men’s QR", label: "MGM Casino QR #001", placement: "Sink wall QR sticker" } });
  await prisma.adSlotInventory.createMany({ data: Array.from({ length: 4 }, (_, index) => ({ venueId: venue.id, restroomId: restroom.id, qrCodeId: qrCode.id, toiletLocationId: toiletLocation.id, slotNumber: index + 1, month: "2026-07", priceCents: 5000, status: "OPEN" })) });

  const categories = await Promise.all(["Funny", "Facts", "Entertainment", "Deals"].map((name) => prisma.category.create({ data: { publisherId: publisher.id, name, slug: name.toLowerCase(), color: name === "Deals" ? "#ff2d2d" : "#ffd400" } })));
  const articles = await Promise.all(
    blocks.map(([type, title, body], index) =>
      prisma.article.create({
        data: {
          publisherId: publisher.id,
          categoryId: categories[index % categories.length].id,
          title,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          excerpt: body.slice(0, 110),
          body,
          status: "PUBLISHED",
          publishedAt: new Date("2024-07-01T12:00:00.000Z")
        }
      })
    )
  );

  const advertiserRecords = await Promise.all(
    sponsorAds.map(([businessName]) =>
      prisma.advertiser.create({
        data: {
          publisherId: publisher.id,
          name: businessName,
          slug: businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          contactEmail: `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "")}@example.com`,
          portalNote: "Seed advertiser can upload artwork, update coupons, and view analytics."
        }
      })
    )
  );
  const featureAdvertisers = await Promise.all(["MGM Resorts", "Local Restaurant Demo", "Local Bar Demo", "Tourism Demo", "Event Promotion Demo"].map((name) => prisma.advertiser.create({ data: { publisherId: publisher.id, name, slug: `${slug(name)}-advertiser`, contactEmail: `${slug(name)}@example.com`, portalNote: "Feature #6 demo advertiser for direct campaign management, billing, targeting, and analytics." } })));

  const ads = await Promise.all(
    sponsorAds.map(([businessName, title, offer, scope, couponCode, monthlyPriceCents], index) =>
      prisma.ad.create({
        data: {
          publisherId: publisher.id,
          advertiserId: advertiserRecords[index].id,
          businessName,
          title,
          offer,
          ctaText: index % 2 ? "Claim Deal" : "Tap Offer",
          targetUrl: "https://example.com",
          phone: `702-555-01${String(index + 1).padStart(2, "0")}`,
          couponCode,
          scope: scope as AdScope,
          city: scope === "CITY" ? "Las Vegas" : null,
          state: scope === "CITY" ? "NV" : null,
          venueId: scope === "VENUE" ? venue.id : null,
          venueIds: scope === "VENUE" ? [venue.id, restaurantVenue.id] : [],
          restroomId: scope === "RESTROOM" ? restroom.id : null,
          monthlyPriceCents,
          stripePriceId: `price_seed_${scope.toLowerCase()}_${index + 1}`,
          campaignStartsAt: new Date("2024-07-01T00:00:00.000Z"),
          campaignEndsAt: new Date("2024-07-31T23:59:59.000Z")
        }
      })
    )
  );


  await prisma.restaurantReview.createMany({ data: [
    { publisherId: publisher.id, title: "Best Burger Feature", restaurantName: "Best Burger", venueId: venue.id, venueIds: [venue.id], featuredImageUrl: "https://placehold.co/1200x800/fdca40/111111?text=Best+Burger", starRating: 4.8, cuisineType: "Burgers", address: "3799 S Las Vegas Blvd", city: "Las Vegas", state: "NV", websiteUrl: "https://example.com/best-burger", instagramUrl: "https://instagram.com/example", facebookUrl: "https://facebook.com/example", reviewHeadline: "A double-stack worth leaving the casino floor for", reviewBody: "Juicy patties, crisp pickles, and a sauce that survives late-night cravings make this an easy MGM Grand Edition pick.", reviewerName: "Potty Favor Review Team", publishDate: new Date("2026-07-01T12:00:00.000Z"), status: "PUBLISHED" },
    { publisherId: publisher.id, title: "Steakhouse Spotlight", restaurantName: "Velvet Booth Steakhouse", venueIds: [venue.id, bellagioVenue.id], featuredImageUrl: "https://placehold.co/1200x800/111111/fdca40?text=Steakhouse", starRating: 4.9, cuisineType: "Steakhouse", address: "Las Vegas Strip", city: "Las Vegas", state: "NV", websiteUrl: "https://example.com/steakhouse", instagramUrl: "https://instagram.com/example", facebookUrl: "https://facebook.com/example", reviewHeadline: "Classic Strip polish with a serious sear", reviewBody: "Order the ribeye medium-rare and split the wedge salad. The room feels celebratory without slowing down the night.", reviewerName: "Stall Talk Dining Desk", publishDate: new Date("2026-07-02T12:00:00.000Z"), status: "PUBLISHED" },
    { publisherId: publisher.id, title: "Pizza Restaurant Review", restaurantName: "Slice & Neon Pizza", venueId: newYorkVenue.id, venueIds: [newYorkVenue.id], featuredImageUrl: "https://placehold.co/1200x800/ff2d2d/ffffff?text=Pizza", starRating: 4.6, cuisineType: "Pizza", address: "3790 S Las Vegas Blvd", city: "Las Vegas", state: "NV", websiteUrl: "https://example.com/pizza", instagramUrl: "https://instagram.com/example", facebookUrl: "https://facebook.com/example", reviewHeadline: "Foldable slices for between-show hunger", reviewBody: "A crisp base, stretchy cheese, and fast counter service make this a restroom-scan friendly recommendation.", reviewerName: "Potty Favor Review Team", publishDate: new Date("2026-07-03T12:00:00.000Z"), status: "PUBLISHED" },
    { publisherId: publisher.id, title: "Local Bar & Grill Review", restaurantName: "Local Bar & Grill", featuredImageUrl: "https://placehold.co/1200x800/7d4cff/ffffff?text=Bar+%26+Grill", starRating: 4.5, cuisineType: "Bar & Grill", address: "Demo Bar District", city: "Las Vegas", state: "NV", websiteUrl: "https://example.com/bar-grill", instagramUrl: "https://instagram.com/example", facebookUrl: "https://facebook.com/example", reviewHeadline: "Global pick: cold drinks, hot baskets, easy wins", reviewBody: "Reliable wings, friendly bartenders, and enough TVs to make every seat feel intentional. A strong global fallback for any edition.", reviewerName: "Stall Talk Dining Desk", publishDate: new Date("2026-07-04T12:00:00.000Z"), status: "PUBLISHED" }
  ] });

  const issue = await prisma.issue.create({ data: { publisherId: publisher.id, venueId: venue.id, restroomId: restroom.id, qrCodeId: qrCode.id, title: "Potty Favor", month: "July", year: 2024, issueNumber: 81, status: "PUBLISHED", publishedAt: new Date("2024-07-01T12:00:00.000Z") } });
  await prisma.issueContentBlock.createMany({ data: [
    ...blocks.map(([type, title, body], index) => ({ issueId: issue.id, articleId: articles[index].id, type, title, body, sortOrder: index + 1, layout: { column: index % 2, row: Math.floor(index / 2), span: index === 6 ? 2 : 1 } })),
    { issueId: issue.id, type: ContentBlockType.EVENT, title: "MGM Grand Edition: Arena Afterparty", body: "MGM Grand guests get a venue-only afterparty reminder and late-night snack tip.", venueIds: [venue.id], sortOrder: 9, layout: { venueSpecific: true } },
    { issueId: issue.id, type: ContentBlockType.EVENT, title: "New York-New York Edition: Big Apple Coaster Tip", body: "Scan from New York-New York to see coaster timing, pub specials, and bridge photo-op notes.", venueIds: [newYorkVenue.id], sortOrder: 10, layout: { venueSpecific: true } },
    { issueId: issue.id, type: ContentBlockType.ARTICLE, title: "Bellagio Edition: Fountain Timing", body: "Bellagio readers see a subtle fountain-show reminder plus conservatory crowd tips.", venueIds: [bellagioVenue.id], sortOrder: 11, layout: { venueSpecific: true } },
    { issueId: issue.id, type: ContentBlockType.COUPON, title: "Local Restaurant Demo Edition", body: "Restaurant scanners see a local chef special and table-turn timing note.", venueIds: [restaurantVenue.id], sortOrder: 12, layout: { venueSpecific: true } },
    { issueId: issue.id, type: ContentBlockType.COUPON, title: "Local Bar Demo Edition", body: "Bar scanners see happy-hour timing and late-night ride-share reminders.", venueIds: [barVenue.id], sortOrder: 13, layout: { venueSpecific: true } }
  ] });
  await prisma.issueAdSlot.createMany({ data: ads.map((ad, index) => ({ issueId: issue.id, adId: ad.id, slotNumber: index + 1, source: ad.scope })) });
  await prisma.stalltalkAdSlot.createMany({
    data: ads.map((ad, index) => ({
      slotNumber: index + 1,
      adId: ad.id,
      publisherId: publisher.id,
      business: ad.businessName,
      creativeType: "IMAGE",
      image: ad.artworkUrl,
      headline: ad.title,
      subheadline: ad.offer,
      ctaText: ad.ctaText,
      couponCode: ad.couponCode,
      targetUrl: ad.targetUrl,
      phone: ad.phone
    }))
  });


  const sampleInventory = await prisma.adSlotInventory.findFirstOrThrow({ where: { venueId: venue.id, slotNumber: 1, month: "2026-07" } });
  const draftInventory = await prisma.adSlotInventory.findFirstOrThrow({ where: { venueId: venue.id, slotNumber: 2, month: "2026-07" } });
  const samplePaidCampaign = await prisma.adCampaign.create({ data: { advertiserId: featureAdvertisers[0].id, inventoryId: sampleInventory.id, placements: { create: [{ inventoryId: sampleInventory.id }] }, adId: ads[0].id, name: "Summer Hooters restroom flight", businessName: "Hooters", headline: "Wings After the Win", body: "Free fried pickles with any 10-wing order.", creativeUrl: "https://placehold.co/600x600/fdca40/111111?text=Hooters", targetUrl: "https://example.com", ctaText: "Claim Deal", months: 3, locationCount: 1, priceCents: 15000, flightStartMonth: "2026-07", flightEndMonth: "2026-09", flightMonths: 3, pricePerPlacementMonthCents: 5000, placementCount: 1, totalAmountCents: 15000, status: "ACTIVE", approvalStatus: "APPROVED", paidAt: new Date("2026-06-15T12:00:00.000Z"), startsAt: new Date("2026-07-01T00:00:00.000Z"), endsAt: new Date("2026-09-30T23:59:59.999Z"), submittedAt: new Date("2026-06-10T12:00:00.000Z"), approvedAt: new Date("2026-06-11T12:00:00.000Z"), publishedAt: new Date("2026-06-15T12:00:00.000Z") } });
  await prisma.payment.create({ data: { campaignId: samplePaidCampaign.id, advertiserId: featureAdvertisers[0].id, amountCents: 15000, status: "SUCCEEDED", stripeSessionId: "cs_seed_phase2b_paid" } });
  await prisma.adCreative.create({ data: { campaignId: samplePaidCampaign.id, advertiserId: featureAdvertisers[0].id, kind: "BANNER", imageUrl: "https://placehold.co/600x600/fdca40/111111?text=MGM+Resorts", headline: "MGM Summer Dining", body: "Resort guests get dining, show, and nightlife offers across MGM properties.", callToAction: "Explore MGM", destinationUrl: "https://example.com/mgm", approvalStatus: "APPROVED" } });
  await prisma.advertiserInvoice.create({ data: { advertiserId: featureAdvertisers[0].id, campaignId: samplePaidCampaign.id, invoiceNumber: "INV-2026-0001", amountCents: 15000, status: "PAID", paidAt: new Date("2026-06-15T12:00:00.000Z"), stripeCustomerId: "cus_seed_mgm" } });
  await prisma.ad.update({ where: { id: ads[0].id }, data: { campaignStartsAt: samplePaidCampaign.startsAt, campaignEndsAt: samplePaidCampaign.endsAt } });
  await prisma.adCampaign.create({ data: { advertiserId: advertiserRecords[1].id, inventoryId: draftInventory.id, placements: { create: [{ inventoryId: draftInventory.id }] }, name: "Zoo August draft", businessName: "Columbus Zoo", headline: "Wild Weekend", body: "Save $5 on admission and meet somebody hairier than your group chat.", creativeUrl: "https://placehold.co/600x600/7d4cff/ffffff?text=Zoo", targetUrl: "https://example.com", ctaText: "Save $5", months: 1, locationCount: 1, priceCents: 5000, flightStartMonth: "2026-08", flightEndMonth: "2026-08", flightMonths: 1, pricePerPlacementMonthCents: 5000, placementCount: 1, totalAmountCents: 5000, status: "DRAFT", approvalStatus: "SUBMITTED", startsAt: new Date("2026-08-01T00:00:00.000Z"), endsAt: new Date("2026-08-31T23:59:59.999Z"), submittedAt: new Date("2026-06-12T12:00:00.000Z") } });
  await prisma.venueContentDraft.createMany({ data: [
    { venueId: venue.id, contentType: "ANNOUNCEMENT", title: "MGM late-night bites", body: "Ask the host stand about late-night restaurant specials before the next show.", approvalStatus: "APPROVED", submittedAt: new Date("2026-06-08T12:00:00.000Z"), approvedAt: new Date("2026-06-09T12:00:00.000Z") },
    { venueId: venue.id, contentType: "EVENT", location: "MGM Grand Pool Entrance", startsAt: new Date("2026-07-05T20:00:00.000Z"), endsAt: new Date("2026-07-05T23:00:00.000Z"), title: "Pool entrance reminder", body: "Draft reminder for guests scanning from the casino floor restroom.", approvalStatus: "SUBMITTED", submittedAt: new Date("2026-06-10T12:00:00.000Z") }
  ] });

  await prisma.venueMediaAsset.createMany({ data: [
    { venueId: venue.id, assetType: "LOGO", title: "MGM Grand Logo", url: "https://placehold.co/600x300/111111/fdca40?text=MGM+Grand" },
    { venueId: newYorkVenue.id, assetType: "IMAGE", title: "New York-New York Exterior", url: "https://placehold.co/1200x800/ff2d2d/ffffff?text=NYNY" },
    { venueId: bellagioVenue.id, assetType: "GALLERY", title: "Bellagio Fountains", url: "https://placehold.co/1200x800/111111/fdca40?text=Bellagio", galleryName: "Resort Highlights" },
    { venueId: restaurantVenue.id, assetType: "IMAGE", title: "Restaurant Demo Dish", url: "https://placehold.co/1200x800/fdca40/111111?text=Restaurant" },
    { venueId: barVenue.id, assetType: "IMAGE", title: "Bar Demo Happy Hour", url: "https://placehold.co/1200x800/7d4cff/ffffff?text=Happy+Hour" }
  ] });

  await prisma.stripeSubscription.create({ data: { advertiserId: advertiserRecords[0].id, adId: ads[0].id, stripeCustomerId: "cus_seed_hooters", stripeSubscriptionId: "sub_seed_monthly", status: "ACTIVE", locations: 1, monthlyAmountCents: 49900, currentPeriodEndsAt: new Date("2024-07-31T23:59:59.000Z") } });
  await prisma.commissionReport.create({ data: { distributorId: distributor.id, month: "July", year: 2024, grossRevenueCents: 329200, commissionCents: 65840, status: "OPEN" } });
  await prisma.user.createMany({ data: [
    { email: process.env.ADMIN_EMAIL || "admin@pottyfavor.com", name: "Potty Favor Admin", role: "ADMIN", passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "admin-password-change-me") },
await prisma.user.createMany({
  data: [
    {
      email: process.env.ADMIN_EMAIL || "admin@pottyfavor.com",
      name: "Potty Favor Admin",
      role: "ADMIN",
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "admin-password-change-me")
    },
    {
      email: process.env.ADVERTISER_EMAIL || "advertiser@pottyfavor.com",
      name: "Seed Advertiser",
      role: "ADVERTISER",
      advertiserId: featureAdvertisers[0].id,
      passwordHash: hashPassword(process.env.ADVERTISER_PASSWORD || "advertiser-password-change-me")
    },
    {
      email: process.env.VENUE_EMAIL || "venue@pottyfavor.com",
      name: "Seed Venue Manager",
      role: "VENUE_MANAGER",
      venueId: venue.id,
      passwordHash: hashPassword(process.env.VENUE_PASSWORD || "venue-password-change-me")
    },
    {
      email: process.env.DISTRIBUTOR_EMAIL || "distributor@pottyfavor.com",
      name: "Seed Distributor",
      role: "DISTRIBUTOR",
      passwordHash: hashPassword(process.env.DISTRIBUTOR_PASSWORD || "distributor-password-change-me")
    }
  ]
});
  ] });

  await prisma.couponCampaign.create({ data: { advertiserId: advertiserRecords[5].id, name: "Graeter’s July Scoops", couponCode: "POTTYPOP", budgetCents: 25000, redemptionLimit: 500, startsAt: new Date("2024-07-01T00:00:00.000Z"), endsAt: new Date("2024-07-31T23:59:59.000Z") } });
  await prisma.analyticsEvent.createMany({ data: [
    { publisherId: publisher.id, venueId: venue.id, restroomId: restroom.id, qrCodeId: qrCode.id, issueId: issue.id, type: "SCAN", visitorId: "visitor-a", sessionId: "session-a", path: qrCode.destination },
    { publisherId: publisher.id, venueId: venue.id, restroomId: restroom.id, qrCodeId: qrCode.id, issueId: issue.id, type: "PAGE_VIEW", visitorId: "visitor-a", sessionId: "session-a", path: qrCode.destination },
    { publisherId: publisher.id, venueId: venue.id, restroomId: restroom.id, qrCodeId: qrCode.id, issueId: issue.id, adId: ads[0].id, advertiserId: advertiserRecords[0].id, type: "AD_CLICK", slotNumber: 1, visitorId: "visitor-a", sessionId: "session-a" },
    { publisherId: publisher.id, venueId: venue.id, restroomId: restroom.id, qrCodeId: qrCode.id, issueId: issue.id, adId: ads[5].id, advertiserId: advertiserRecords[5].id, type: "COUPON_REDEMPTION", slotNumber: 6, visitorId: "visitor-b", sessionId: "session-b" },
    { publisherId: publisher.id, venueId: venue.id, restroomId: restroom.id, qrCodeId: qrCode.id, issueId: issue.id, type: "TIME_ON_PAGE", durationMs: 94000, visitorId: "visitor-a", sessionId: "session-a" }
  ] });
}

main().finally(async () => prisma.$disconnect());
