import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";

type StaticAd = (typeof publishedAds)[number];
export type PublicationAdLike = Partial<StaticAd> & { businessName?: string; title?: string; generatedHeadline?: string | null; generatedSubheadline?: string | null; offer?: string; ctaText?: string; cta?: string; targetUrl?: string; couponCode?: string | null };

export function PublicationAdFallback({ ad, slotNumber, primary = false }: { ad?: PublicationAdLike; slotNumber: number; primary?: boolean }) {
  return (
    <article className={`ad-card inline-ad ${primary ? "inline-ad-primary" : ""} ${ad ? "" : "is-empty"}`} id={`sponsor-slot-${slotNumber}`}>
      <span className="slot">Ad {slotNumber}</span>
      <h3>{ad?.headline || ad?.businessName || "Available Sponsor Slot"}</h3>
      <div className="ad-copy">
        <p>{ad?.generatedHeadline || ad?.title || ad?.offer || "Advertise Here"}</p>
        <p>{ad?.generatedSubheadline || ad?.cta || "Reach restroom readers in this venue."}</p>
      </div>
      <div className="ad-actions">
        <a href={ad?.targetUrl || "/signin"}>{ad?.ctaText || ad?.cta || "Book Slot"}</a>
        {ad?.couponCode ? <span className="coupon">{ad.couponCode}</span> : null}
      </div>
    </article>
  );
}

export function StaticArticle({ title, body, variant }: { title: string; body: string; variant: "feature-card" | "secondary-card" }) {
  return (
    <section className={`panel ${variant}`}>
      <h2>{title}</h2>
      <div className="article-copy">
        {body.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </section>
  );
}

export function StaticPublicationBlocks({ ads, mainFeature, secondaryFeature }: { ads: PublicationAdLike[]; mainFeature?: { title: string; body: string }; secondaryFeature?: { title: string; body: string } }) {
  return (
    <>
      <StaticHumor />
      <PublicationAdFallback ad={ads[1]} slotNumber={2} />
      <StaticArticle title={mainFeature?.title || publishedIssue.mainFeatureTitle} body={mainFeature?.body || publishedIssue.mainFeatureBody} variant="feature-card" />
      <PublicationAdFallback ad={ads[2]} slotNumber={3} />
      <QuotesBlock />
      <PublicationAdFallback ad={ads[3]} slotNumber={4} />
      <StaticRestaurantBlock />
      <PublicationAdFallback ad={ads[4]} slotNumber={5} />
      <DidYouKnowBlock />
      <PublicationAdFallback ad={ads[5]} slotNumber={6} />
      <WordOfDayBlock />
      <StaticArticle title={secondaryFeature?.title || publishedIssue.secondaryFeatureTitle} body={secondaryFeature?.body || publishedIssue.secondaryFeatureBody} variant="secondary-card" />
      <PublicationAdFallback ad={ads[6]} slotNumber={7} />
      <CalendarBlock />
      <PublicationAdFallback ad={ads[7]} slotNumber={8} />
      <section className="sponsor-directory panel">
        <p className="directory-kicker">Sponsor Directory</p>
        <h2>Featured Potty Favor Sponsors</h2>
        <p>Every ad above is served by venue, city, state, or global targeting so local offers can travel with the publication without leaving the reading flow.</p>
        <div className="directory-grid" aria-label="Inline sponsor slot directory">
          {[
            "Slot 1 · Premium banner", "Slot 2 · Humor break", "Slot 3 · Feature break", "Slot 4 · Quote break", "Slot 5 · Restaurant Review", "Slot 6 · Trivia break", "Slot 7 · Feature break", "Slot 8 · Event break"
          ].map((label) => <span key={label}>{label}</span>)}
        </div>
      </section>
    </>
  );
}

function StaticHumor() { return <section className="humor-card panel wide"><p className="laughs">HA HA HA</p><h2>{publishedIssue.humorTitle}</h2><div className="article-copy single-column">{publishedIssue.humorBody.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>; }
function QuotesBlock() { return <section className="quotes-card panel"><h2>Inspirational <strong>Quotes</strong></h2><ul>{publishedIssue.quotes.map((quote) => <li key={quote}>{quote}</li>)}</ul></section>; }
function DidYouKnowBlock() { return <section className="did-card panel"><h2>Did you know?</h2><ol>{publishedIssue.didYouKnow.map((fact) => <li key={fact}>{fact}</li>)}</ol></section>; }
function WordOfDayBlock() { return <section className="word-card panel"><h2>Word-of-the-Day</h2><strong>{publishedIssue.wordOfTheDay}</strong><p>{publishedIssue.wordDefinition}</p></section>; }
function StaticRestaurantBlock() { return <section className="restaurant-review panel"><div className="card-label">Restaurant Review</div><div className="review-box"><div className="review-content"><h2>Worth the Stop</h2><h3>Featured Local Restaurant</h3><p>This month’s pick is a local spot with strong atmosphere, good service, and food that makes it worth coming back for. Perfect for a casual lunch, date night, or a quick bite before heading back out.</p><p className="review-rating">★★★★☆ 4/5</p><a href="#sponsor-slot-5" className="review-button">Read Full Review</a></div></div></section>; }
function CalendarBlock() { const days = Array.from({ length: 35 }, (_, index) => index + 1); return <section className="calendar-card panel double" id="calendar"><h2>Calendar / Event Spotlight</h2><div className="calendar-layout"><div><div className="calendar-grid" aria-label="Published event calendar">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}{days.map((day) => <span key={day}>{day <= 30 ? day : ""}</span>)}</div><p>{publishedIssue.calendarText}</p></div><aside className="event-spotlight"><strong>Event Spotlight</strong><p>Submit local happenings to keep the monthly calendar moving.</p></aside></div></section>; }
