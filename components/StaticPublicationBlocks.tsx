import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";
import { AD_DESKTOP_HEIGHT, AD_DESKTOP_WIDTH } from "@/lib/ad-config";

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
  if (!image)
    console.warn("Published ad missing imageUrl", {
      adId: displayAd.id,
      slotNumber,
    });

  const ctaText = displayAd.ctaText || displayAd.cta || "Learn More";

  return (
    <article
      className={`ad-card inline-ad ${primary ? "inline-ad-primary" : ""} ${image ? "" : "is-empty"}`}
      id={`ad-${slotNumber}`}
      data-ad-slot="content-ad"
      data-placement={slotNumber}
    >
      <span className="sponsored-label">Sponsored</span>
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
            width={AD_DESKTOP_WIDTH}
            height={AD_DESKTOP_HEIGHT}
            src={image}
            alt={`${sponsor} advertisement`}
          />
          <span className="ad-cta-button">{ctaText}</span>
        </a>
      ) : (
        <a className="ad-placeholder-link" href={href}>
          <strong>YOUR BUSINESS HERE</strong>
          <span>
            Reach thousands of monthly readers from inside Las Vegas venues.
          </span>
          <small>
            Restaurants • Bars • Casinos • Attractions • Local Businesses
          </small>
          <em>BECOME AN ADVERTISER</em>
          <b>pottyfavor.com/advertise</b>
        </a>
      )}
    </article>
  );
}

export function StaticArticle({
  title,
  body,
  variant,
}: {
  title: string;
  body: string;
  variant: "feature-card" | "secondary-card";
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
}: {
  ads: PublicationAdLike[];
  qrCode?: string | null;
  mainFeature?: { title: string; body: string };
  secondaryFeature?: { title: string; body: string };
}) {
  const publicationAds = getPublicationAds(ads);
  return (
    <>
      <StaticHumor />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[1]} slotNumber={2} />
      <StaticArticle
        title={mainFeature?.title || publishedIssue.mainFeatureTitle}
        body={mainFeature?.body || publishedIssue.mainFeatureBody}
        variant="feature-card"
      />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[2]} slotNumber={3} />
      <QuotesBlock />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[3]} slotNumber={4} />
      <StaticRestaurantBlock />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[4]} slotNumber={5} />
      <DidYouKnowBlock />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[5]} slotNumber={6} />
      <WordOfDayBlock />
      <StaticArticle
        title={secondaryFeature?.title || publishedIssue.secondaryFeatureTitle}
        body={secondaryFeature?.body || publishedIssue.secondaryFeatureBody}
        variant="secondary-card"
      />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[6]} slotNumber={7} />
      <CalendarBlock />
      <PublicationAdFallback qrCode={qrCode} ad={publicationAds[7]} slotNumber={8} />
      <SubmitEventForm />
    </>
  );
}

function StaticHumor() {
  return (
    <section className="publication-content-block humor-card panel">
      <p className="laughs">HA HA HA</p>
      <h2>{publishedIssue.humorTitle}</h2>
      <div className="article-copy single-column">
        {publishedIssue.humorBody.split("\n\n").map((paragraph) => (
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

function DidYouKnowBlock() {
  return (
    <section className="publication-content-block did-card panel">
      <div className="did-card-inner">
        <header className="did-card-header">
          <p className="editorial-kicker">Magazine Notes</p>
          <h2>Did You Know?</h2>
        </header>
        <ol className="did-list">
          {publishedIssue.didYouKnow.map((fact, index) => (
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
function StaticRestaurantBlock() {
  return (
    <section className="publication-content-block restaurant-review panel">
      <p className="card-label">Restaurant Review</p>
      <img
        src="/images/restaurant-review.jpg"
        alt="Featured local restaurant"
        className="review-photo review-hero"
      />
      <div className="review-content">
        <h2>Worth the Stop</h2>
        <h3>Featured Local Restaurant</h3>
        <p className="review-rating">★★★★½ 4.5/5</p>
        <p>
          This month’s pick is a local spot with strong atmosphere, good
          service, and food that makes it worth coming back for. Perfect for a
          casual lunch, date night, or a quick bite before heading back out.
        </p>
        <p className="review-address">Las Vegas, NV</p>
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
function CalendarBlock() {
  const days = Array.from({ length: 35 }, (_, index) => index + 1);
  return (
    <section
      className="publication-content-block calendar-card panel"
      id="calendar"
    >
      <h2>Calendar / Event Spotlight</h2>
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
          <p>{publishedIssue.calendarText}</p>
        </div>
        <aside className="event-spotlight">
          <strong>Event Spotlight</strong>
          <p>Submit local happenings to keep the monthly calendar moving.</p>
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
