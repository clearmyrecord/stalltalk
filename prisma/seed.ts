import { AdScope, ContentBlockType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  await prisma.analyticsEvent.deleteMany();
  await prisma.issueAdSlot.deleteMany();
  await prisma.issueContentBlock.deleteMany();
  await prisma.issue.deleteMany();
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
  const venue = await prisma.venue.create({ data: { publisherId: publisher.id, distributorId: distributor.id, name: "MGM Grand Las Vegas", slug: "mgm-grand-las-vegas", city: "Las Vegas", state: "NV", address: "3799 S Las Vegas Blvd" } });
  const restroom = await prisma.restroom.create({ data: { venueId: venue.id, name: "Casino Floor Men’s Restroom", floor: "Casino", placement: "Sink wall QR sticker" } });
  const qrCode = await prisma.qrCode.create({ data: { publisherId: publisher.id, venueId: venue.id, restroomId: restroom.id, code: "ST-MGM-CASINO-M-001", label: "MGM Casino Men’s #001", destination: "/issue/mgm-grand-las-vegas?qr=ST-MGM-CASINO-M-001", status: "ASSIGNED" } });

  const categories = await Promise.all(["Funny", "Facts", "Entertainment", "Deals"].map((name) => prisma.category.create({ data: { publisherId: publisher.id, name, slug: name.toLowerCase(), color: name === "Deals" ? "#ff2d2d" : "#ffd400" } })));
  const articles = await Promise.all(blocks.map(([type, title, body], index) => prisma.article.create({ data: { publisherId: publisher.id, categoryId: categories[index % categories.length].id, title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), excerpt: body.slice(0, 110), body, status: "PUBLISHED", publishedAt: new Date("2024-07-01T12:00:00.000Z") } }))));

  const advertiserRecords = await Promise.all(sponsorAds.map(([businessName]) => prisma.advertiser.create({ data: { publisherId: publisher.id, name: businessName, slug: businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), contactEmail: `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "")}@example.com`, portalNote: "Seed advertiser can upload artwork, update coupons, and view analytics." } }))));
  const ads = await Promise.all(sponsorAds.map(([businessName, title, offer, scope, couponCode, monthlyPriceCents], index) => prisma.ad.create({
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
      restroomId: scope === "RESTROOM" ? restroom.id : null,
      monthlyPriceCents,
      stripePriceId: `price_seed_${scope.toLowerCase()}_${index + 1}`,
      campaignStartsAt: new Date("2024-07-01T00:00:00.000Z"),
      campaignEndsAt: new Date("2024-07-31T23:59:59.000Z")
    }
  })));

  const issue = await prisma.issue.create({ data: { publisherId: publisher.id, venueId: venue.id, restroomId: restroom.id, qrCodeId: qrCode.id, title: "Potty Favor", month: "July", year: 2024, issueNumber: 81, status: "PUBLISHED", publishedAt: new Date("2024-07-01T12:00:00.000Z") } });
  await prisma.issueContentBlock.createMany({ data: blocks.map(([type, title, body], index) => ({ issueId: issue.id, articleId: articles[index].id, type, title, body, sortOrder: index + 1, layout: { column: index % 2, row: Math.floor(index / 2), span: index === 6 ? 2 : 1 } })) });
  await prisma.issueAdSlot.createMany({ data: ads.map((ad, index) => ({ issueId: issue.id, adId: ad.id, slotNumber: index + 1, source: ad.scope })) });

  await prisma.stripeSubscription.create({ data: { advertiserId: advertiserRecords[0].id, adId: ads[0].id, stripeCustomerId: "cus_seed_hooters", stripeSubscriptionId: "sub_seed_monthly", status: "ACTIVE", locations: 1, monthlyAmountCents: 49900, currentPeriodEndsAt: new Date("2024-07-31T23:59:59.000Z") } });
  await prisma.commissionReport.create({ data: { distributorId: distributor.id, month: "July", year: 2024, grossRevenueCents: 329200, commissionCents: 65840, status: "OPEN" } });
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
