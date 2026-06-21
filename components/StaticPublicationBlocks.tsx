import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";
import { sponsorPlacementLabel, sponsorPlacementSection } from "@/lib/sponsor-placements";

type StaticAd = (typeof publishedAds)[number];
export type PublicationAdLike = Partial<StaticAd> & {
  id?: string;
  businessName?: string;
  advertiserName?: string;
  title?: string;
  headline?: string | null;
  generatedHeadline?: string | null;
  generatedSubheadline?: string | null;
  offer?: string | null;
  ctaText?: string | null;
  cta?: string | null;
  targetUrl?: string | null;
  couponCode?: string | null;
  artworkUrl?: string | null;
  creativeUrl?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  slotImageUrl?: string | null;
  campaignImage?: string | null;
  campaignImageUrl?: string | null;
  campaignId?: string | null;
};

const activeFallbackAds: PublicationAdLike[] = publishedAds.filter(
  (ad) => ad.active !== false,
);

export function getPublicationAds(
  ads: Array<PublicationAdLike | null | undefined> = [],
): PublicationAdLike[] {
  return Array.from(
    { length: 8 },
    (_, index) =>
      ads[index] ||
      activeFallbackAds[index] ||
      activeFallbackAds[index % activeFallbackAds.length],
  );
}

export function PublicationAdFallback({
  ad,
  slotNumber,
  qrCode,
  primary = false,
}: {
  ad?: PublicationAdLike | null;
  slotNumber: number;
  qrCode?: string | null;
  primary?: boolean;
}) {
  const fallback = activeFallbackAds[slotNumber - 1] || activeFallbackAds[0];
  const displayAd = ad || fallback;
  const sponsor =
    displayAd.businessName || displayAd.advertiserName || "Potty Favor Sponsor";
  const targetUrl = displayAd.targetUrl || "https://pottyfavor.com/advertise";
  const href = displayAd.id
    ? `/api/ads/click/${encodeURIComponent(displayAd.id)}?slot=${slotNumber}${qrCode ? `&qr=${encodeURIComponent(qrCode)}` : ""}&target=${encodeURIComponent(targetUrl)}`
    : targetUrl;
  const image =
    displayAd.imageUrl ||
    displayAd.artworkUrl ||
    displayAd.creativeUrl ||
    displayAd.slotImageUrl ||
    displayAd.campaignImage ||
    displayAd.campaignImageUrl ||
    displayAd.image;
  const placementLabel = sponsorPlacementLabel(slotNumber);
  const placementSection = sponsorPlacementSection(slotNumber);

  if (!image)
    console.warn("Published ad missing imageUrl", {
      adId: displayAd.id,
      slotNumber,
    });

  return (
    <section
      className={`issue-ad-placement ${image ? "" : "is-empty"}`}
      id={`ad-${slotNumber}`}
      data-ad-slot="content-ad"
      data-placement={slotNumber}
      data-sponsor-placement={placementLabel}
      data-section={placementSection}
      aria-label={placementLabel}
    >
      {image ? (
        <a
          className="published-ad-link generated-ad-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${sponsor} advertisement`}
        >
          <img
            className="generated-ad-image"
            src={image}
            alt={`${sponsor} advertisement`}
          />
        </a>
      ) : (
        <a className="ad-placeholder-link" href={href}>
          <strong>Advertise Here</strong>
          <span>Full-width editorial magazine ad placement inside Potty Favor.</span>
          <em>Claim This Spot</em>
        </a>
      )}
    </section>
  );
}

export function StaticArticle({
  title,
  body,
  variant,
  subtitle,
}: {
  title: string;
  body: string;
  variant: "feature-card" | "secondary-card";
  subtitle?: string;
}) {
  return (
    <section className={`publication-content-block panel ${variant}`}>
      <p className="feature-eyebrow">
        {variant === "secondary-card" ? "FEATURE STORY" : "FEATURE"}
      </p>
      <h2>
        {variant === "secondary-card"
          ? "LAS VEGAS: THE CITY THAT SHOULD NOT EXIST"
          : title}
      </h2>
      {variant === "secondary-card" ? (
        <p className="feature-subtitle">
          How a desert railroad stop became one of the world's most visited
          cities.
        </p>
      ) : subtitle ? (
        <p className="feature-subtitle">{subtitle}</p>
      ) : null}
      <div className="article-copy">
        {body.split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export function StaticPublicationBlocks({
  ads,
  qrCode,
  mainFeature,
  secondaryFeature,
  blocks = [],
}: {
  ads: PublicationAdLike[];
  qrCode?: string | null;
  mainFeature?: { title: string; body: string };
  secondaryFeature?: { title: string; body: string };
  blocks?: Array<{ title: string; body: string; imageUrl?: string | null; layout?: any }>;
}) {
  const publicationAds = getPublicationAds(ads);
  const block = (key: string) => blocks.find((item) => item.layout?.key === key);
  return (
    <>
      <StaticHumor block={block("funny")} />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[1]} slotNumber={2} />
      <StaticArticle
        title={block("feature")?.title || mainFeature?.title || publishedIssue.mainFeatureTitle}
        subtitle={block("feature")?.layout?.subtitle || "The world's only city built entirely around entertainment."}
        body={block("feature")?.body || mainFeature?.body || publishedIssue.mainFeatureBody}
        variant="feature-card"
      />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[6]} slotNumber={7} />
      <StaticRestaurantBlock block={block("restaurant")} />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[2]} slotNumber={3} />
      <CalendarBlock block={block("events")} />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[3]} slotNumber={4} />
      <LocalDealsBlock block={block("deals")} />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[4]} slotNumber={5} />
      <DidYouKnowBlock block={block("trivia")} />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[5]} slotNumber={6} />
      <SubmitEventForm />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[7]} slotNumber={8} />
    </>
  );
}

function StaticHumor({ block }: { block?: { title: string; body: string } }) {
  return (
    <section className="publication-content-block humor-card panel">
      <p className="laughs">HA HA HA</p>
      <h2>{block?.title || publishedIssue.humorTitle}</h2>
      <div className="article-copy single-column">
        {(block?.body || publishedIssue.humorBody).split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
function splitQuote(quote: string) {
  const match = quote.match(/^(.*)\s[—-]\s([^—-]+)$/);

  if (!match) {
    return { text: quote, author: "Unknown" };
  }

  return { text: match[1], author: match[2] };
}

function QuotesBlock() {
  return (
    <section className="publication-content-block quotes-card panel">
      <header className="quotes-hero" aria-labelledby="quotes-heading">
        <h2 id="quotes-heading">✦ INSPIRATIONAL QUOTES ✦</h2>
      </header>
      <ul className="quote-list">
        {publishedIssue.quotes.map((quote) => {
          const { text, author } = splitQuote(quote);

          return (
            <li className="quote-card" key={quote}>
              <span className="quote-text">{text}</span>
              <cite>— {author}</cite>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LocalDealsBlock({ block }: { block?: { title: string; body: string } }) {
  return (
    <section className="publication-content-block secondary-card panel">
      <p className="feature-eyebrow">Local Deals</p>
      <h2>{block?.title || "Deals Worth Leaving the Stall For"}</h2>
      <div className="article-copy">
        {(block?.body || "Fresh venue-friendly offers, coupons, and neighborhood specials for Potty Favor readers.\n\nCheck this issue’s sponsor panels for timely discounts, featured experiences, and limited-time local offers near your venue.").split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </section>
  );
}

function DidYouKnowBlock({ block }: { block?: { title: string; body: string } }) {
  return (
    <section className="publication-content-block did-card panel">
      <div className="did-card-inner">
        <header className="did-card-header">
          <p className="editorial-kicker">Magazine Notes</p>
          <h2 className="did-you-know-title trivia-title magazine-notes-title">{block?.title || "Did You Know?"}</h2>
        </header>
        <ol className="did-list">
          {(block?.body ? block.body.split("\n").filter(Boolean) : publishedIssue.didYouKnow).map((fact, index) => (
            <li key={fact}>
              <span className="did-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="did-fact">{fact}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
function WordOfDayBlock() {
  return (
    <section className="publication-content-block word-card panel">
      <p className="word-eyebrow">DAILY DISCOVERY</p>
      <h2>WORD OF THE DAY</h2>
      <div className="word-divider" />
      <strong>{publishedIssue.wordOfTheDay}</strong>
      <p className="word-part">noun</p>
      <p className="word-definition">{publishedIssue.wordDefinition}</p>
      <p className="word-example">
        “Use today’s word before dessert and sound instantly more interesting.”
      </p>
    </section>
  );
}
function StaticRestaurantBlock({ block }: { block?: { title: string; body: string; imageUrl?: string | null; layout?: any } }) {
  return (
    <section className="publication-content-block restaurant-review panel">
      <p className="card-label">Restaurant Review</p>
      <img
        src={block?.imageUrl || block?.layout?.imageUrl || "/images/restaurant-review.jpg"}
        alt="Featured local restaurant"
        className="review-photo review-hero"
      />
      <div className="review-content">
        <h2>{block?.layout?.reviewHeadline || block?.title || "Worth the Stop"}</h2>
        <h3>{block?.layout?.restaurantName || "Featured Local Restaurant"}</h3>
        <p className="review-rating">★★★★½ 4.5/5</p>
        {(block?.body || "This month’s pick is a local spot with strong atmosphere, good service, and food that makes it worth coming back for. Perfect for a casual lunch, date night, or a quick bite before heading back out.\n\nLas Vegas, NV").split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="review-actions">
          <a href="https://pottyfavor.com/advertise" className="review-button">
            Visit Website
          </a>
          <a href="#ad-5" className="review-button secondary">
            Read Full Review
          </a>
        </div>
      </div>
    </section>
  );
}
function CalendarBlock({ block }: { block?: { title: string; body: string; layout?: any } }) {
  const days = Array.from({ length: 35 }, (_, index) => index + 1);
  return (
    <section
      className="publication-content-block calendar-card panel"
      id="calendar"
    >
      <h2>{block?.title || "Calendar / Event Spotlight"}</h2>
      <div className="calendar-layout">
        <div>
          <div className="calendar-grid" aria-label="Published event calendar">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span className="calendar-weekday" key={day}>
                {day}
              </span>
            ))}
            {days.map((day) => (
              <span key={day}>{day <= 30 ? day : ""}</span>
            ))}
          </div>
          <p>{block?.body || publishedIssue.calendarText}</p>
        </div>
        <aside className="event-spotlight">
          <strong>Event Spotlight</strong>
          <p>{block?.layout?.eventDescription || "Submit local happenings to keep the monthly calendar moving."}</p>
        </aside>
      </div>
    </section>
  );
}
function SubmitEventForm() {
  return (
    <section
      className="publication-content-block submit-event-card panel"
      id="submit-event"
    >
      <p className="directory-kicker">Community Calendar</p>
      <h2>Submit a Local Event</h2>
      <p>
        Got something happening nearby? Submit your event for Potty Favor
        review.
      </p>
      <form className="event-form">
        <label>
          Event Title
          <input name="title" required />
        </label>
        <label className="full">
          Event Description
          <textarea name="description" />
        </label>
        <label>
          Venue Name
          <input name="venueName" required />
        </label>
        <label>
          Date
          <input name="eventDate" type="date" required />
        </label>
        <label>
          Start Time
          <input name="startTime" type="time" />
        </label>
        <label>
          Category
          <select name="category">
            <option>Nightlife</option>
            <option>Concert</option>
            <option>Sports</option>
            <option>Restaurant / Bar</option>
            <option>Community</option>
            <option>Convention</option>
            <option>Local Deal</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          Website or Ticket Link
          <input name="website" type="url" />
        </label>
        <label>
          Contact Email
          <input name="submittedByEmail" type="email" required />
        </label>
        <div className="full actions">
          <button type="submit">Submit Event</button>
        </div>
      </form>
    </section>
  );
}
