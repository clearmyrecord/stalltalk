import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";

type StaticAd = (typeof publishedAds)[number];
export type PublicationAdLike = Partial<StaticAd> & {
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
  image?: string | null;
};

const activeFallbackAds: PublicationAdLike[] = publishedAds.filter((ad) => ad.active !== false);

export function getPublicationAds(ads: Array<PublicationAdLike | null | undefined> = []): PublicationAdLike[] {
  return Array.from({ length: 8 }, (_, index) => ads[index] || activeFallbackAds[index] || activeFallbackAds[index % activeFallbackAds.length]);
}

export function PublicationAdFallback({ ad, slotNumber, primary = false }: { ad?: PublicationAdLike | null; slotNumber: number; primary?: boolean }) {
  const fallback = activeFallbackAds[slotNumber - 1] || activeFallbackAds[0];
  const displayAd = ad || fallback;
  const sponsor = displayAd.businessName || displayAd.advertiserName || "Potty Favor Sponsor";
  const headline = displayAd.headline || displayAd.generatedHeadline || displayAd.title || sponsor;
  const body = displayAd.offer || displayAd.generatedSubheadline || "Reach restroom readers where phones are already in hand.";
  const cta = displayAd.ctaText || displayAd.cta || "Learn More";
  const href = displayAd.targetUrl || "/signin";
  const image = displayAd.artworkUrl || displayAd.image;

  return (
    <article className={`ad-card inline-ad ${primary ? "inline-ad-primary" : ""}`} id={`sponsor-slot-${slotNumber}`}>
      <span className="slot">Sponsor / Ad {slotNumber}</span>
      {image ? <img src={image} alt={`${sponsor} advertisement`} /> : <div className="ad-mark" aria-hidden="true">{sponsor.slice(0, 2).toUpperCase()}</div>}
      <p className="ad-sponsor">{sponsor}</p>
      <h3>{headline}</h3>
      <div className="ad-copy">
        <p>{body}</p>
      </div>
      <div className="ad-actions">
        <a href={href}>{cta}</a>
        {displayAd.couponCode ? <span className="coupon">{displayAd.couponCode}</span> : null}
      </div>
    </article>
  );
}

export function StaticArticle({ title, body, variant }: { title: string; body: string; variant: "feature-card" | "secondary-card" }) {
  return (
    <section className={`publication-content-block panel ${variant}`}>
      <h2>{title}</h2>
      <div className="article-copy">
        {body.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </section>
  );
}

export function StaticPublicationBlocks({ ads, mainFeature, secondaryFeature }: { ads: PublicationAdLike[]; mainFeature?: { title: string; body: string }; secondaryFeature?: { title: string; body: string } }) {
  const publicationAds = getPublicationAds(ads);
  return (
    <>
      <StaticHumor />
      <PublicationAdFallback ad={publicationAds[1]} slotNumber={2} />
      <StaticArticle title={mainFeature?.title || publishedIssue.mainFeatureTitle} body={mainFeature?.body || publishedIssue.mainFeatureBody} variant="feature-card" />
      <PublicationAdFallback ad={publicationAds[2]} slotNumber={3} />
      <QuotesBlock />
      <PublicationAdFallback ad={publicationAds[3]} slotNumber={4} />
      <StaticRestaurantBlock />
      <PublicationAdFallback ad={publicationAds[4]} slotNumber={5} />
      <DidYouKnowBlock />
      <PublicationAdFallback ad={publicationAds[5]} slotNumber={6} />
      <WordOfDayBlock />
      <StaticArticle title={secondaryFeature?.title || publishedIssue.secondaryFeatureTitle} body={secondaryFeature?.body || publishedIssue.secondaryFeatureBody} variant="secondary-card" />
      <PublicationAdFallback ad={publicationAds[6]} slotNumber={7} />
      <CalendarBlock />
      <PublicationAdFallback ad={publicationAds[7]} slotNumber={8} />
      <SubmitEventForm />
    </>
  );
}

function StaticHumor() { return <section className="publication-content-block humor-card panel"><p className="laughs">HA HA HA</p><h2>{publishedIssue.humorTitle}</h2><div className="article-copy single-column">{publishedIssue.humorBody.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>; }
function QuotesBlock() { return <section className="publication-content-block quotes-card panel"><h2>Inspirational <strong>Quotes</strong></h2><ul>{publishedIssue.quotes.map((quote) => <li key={quote}>{quote}</li>)}</ul></section>; }
function DidYouKnowBlock() { return <section className="publication-content-block did-card panel"><h2>Did you know?</h2><ol>{publishedIssue.didYouKnow.map((fact) => <li key={fact}>{fact}</li>)}</ol></section>; }
function WordOfDayBlock() { return <section className="publication-content-block word-card panel"><h2>Word-of-the-Day</h2><strong>{publishedIssue.wordOfTheDay}</strong><p>{publishedIssue.wordDefinition}</p></section>; }
function StaticRestaurantBlock() { return <section className="publication-content-block restaurant-review panel"><div className="card-label">Restaurant Review</div><div className="review-box"><div className="review-content"><h2>Worth the Stop</h2><h3>Featured Local Restaurant</h3><p>This month’s pick is a local spot with strong atmosphere, good service, and food that makes it worth coming back for. Perfect for a casual lunch, date night, or a quick bite before heading back out.</p><p className="review-rating">★★★★☆ 4/5</p><a href="#sponsor-slot-5" className="review-button">Read Full Review</a></div></div></section>; }
function CalendarBlock() { const days = Array.from({ length: 35 }, (_, index) => index + 1); return <section className="publication-content-block calendar-card panel" id="calendar"><h2>Calendar / Event Spotlight</h2><div className="calendar-layout"><div><div className="calendar-grid" aria-label="Published event calendar">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}{days.map((day) => <span key={day}>{day <= 30 ? day : ""}</span>)}</div><p>{publishedIssue.calendarText}</p></div><aside className="event-spotlight"><strong>Event Spotlight</strong><p>Submit local happenings to keep the monthly calendar moving.</p></aside></div></section>; }
function SubmitEventForm() { return <section className="publication-content-block submit-event-card panel" id="submit-event"><p className="directory-kicker">Community Calendar</p><h2>Submit a Local Event</h2><form><label>Event name<input name="eventName" placeholder="Friday Night Market" /></label><label>Date<input name="eventDate" type="date" /></label><label>Details<textarea name="details" placeholder="Tell readers what to know." /></label><button type="submit">Submit Event</button></form></section>; }
