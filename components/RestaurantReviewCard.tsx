import type { RestaurantReview } from "@prisma/client";
import { recordReviewClick } from "@/lib/actions";
import { ReviewViewRecorder } from "@/components/ReviewViewRecorder";

type Props = {
  review: RestaurantReview;
  publisherId?: string | null;
  venueId?: string | null;
  issueId?: string | null;
  featured?: boolean;
};

export function RestaurantReviewCard({ review, publisherId, venueId, issueId, featured = false }: Props) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: review.restaurantName,
    image: review.featuredImageUrl || undefined,
    address: [review.address, review.city, review.state].filter(Boolean).join(", ") || undefined,
    servesCuisine: review.cuisineType || undefined,
    url: review.websiteUrl || undefined,
    review: {
      "@type": "Review",
      name: review.reviewHeadline,
      reviewBody: review.reviewBody,
      author: { "@type": "Person", name: review.reviewerName },
      reviewRating: { "@type": "Rating", ratingValue: Number(review.starRating), bestRating: 5 }
    }
  };

  return (
    <article className={`restaurant-review-card overflow-hidden rounded-[1.75rem] border-4 border-ink bg-white shadow-brutal ${featured ? "md:grid md:grid-cols-[1.15fr_.85fr]" : ""}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ReviewViewRecorder publisherId={publisherId || review.publisherId} venueId={venueId || review.venueId} issueId={issueId} restaurantReviewId={review.id} restaurantName={review.restaurantName} />
      <div className="min-w-0 bg-ink">
        {review.featuredImageUrl ? <img src={review.featuredImageUrl} alt={`${review.restaurantName} featured dish`} className="h-64 w-full object-cover md:h-full" /> : <div className="grid h-64 place-items-center bg-stallYellow p-6 text-center font-display text-5xl uppercase text-ink">{review.restaurantName}</div>}
      </div>
      <div className="min-w-0 p-4 md:p-6">
        <p className="text-xs font-black uppercase tracking-[.25em] text-stallPurple">Restaurant Review</p>
        <h3 className="mt-2 font-display text-5xl uppercase leading-none md:text-6xl">{review.restaurantName}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black uppercase">
          <span aria-label={`${review.starRating} out of 5 stars`} className="rounded-full bg-stallYellow px-3 py-1 text-ink">{stars(Number(review.starRating))} {Number(review.starRating).toFixed(1)}</span>
          {review.cuisineType ? <span className="rounded-full bg-ink px-3 py-1 text-white">{review.cuisineType}</span> : null}
        </div>
        {[review.address, review.city && review.state ? `${review.city}, ${review.state}` : review.city || review.state].filter(Boolean).map((line) => <p key={line} className="mt-1 text-sm font-bold uppercase text-ink/80">{line}</p>)}
        <h4 className="mt-4 text-2xl font-black uppercase text-stallRed">{review.reviewHeadline}</h4>
        <p className="mt-2 whitespace-pre-wrap text-base font-bold leading-relaxed md:text-lg">{review.reviewBody}</p>
        <p className="mt-3 text-sm font-black uppercase text-stallPurple">Reviewed by {review.reviewerName}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 text-center text-sm font-black uppercase sm:grid-cols-3">
          {review.websiteUrl ? <ReviewAction href={review.websiteUrl} label="Website" type="REVIEW_WEBSITE_CLICK" review={review} publisherId={publisherId} venueId={venueId} issueId={issueId} /> : null}
          {review.instagramUrl ? <ReviewAction href={review.instagramUrl} label="Instagram" type="REVIEW_SOCIAL_CLICK" review={review} publisherId={publisherId} venueId={venueId} issueId={issueId} /> : null}
          {review.facebookUrl ? <ReviewAction href={review.facebookUrl} label="Facebook" type="REVIEW_SOCIAL_CLICK" review={review} publisherId={publisherId} venueId={venueId} issueId={issueId} /> : null}
        </div>
      </div>
    </article>
  );
}

function ReviewAction({ href, label, type, review, publisherId, venueId, issueId }: { href: string; label: string; type: string; review: RestaurantReview; publisherId?: string | null; venueId?: string | null; issueId?: string | null }) {
  return <form action={recordReviewClick}><input type="hidden" name="publisherId" value={publisherId || review.publisherId} /><input type="hidden" name="venueId" value={venueId || review.venueId || ""} /><input type="hidden" name="issueId" value={issueId || ""} /><input type="hidden" name="type" value={type} /><input type="hidden" name="path" value={href} /><input type="hidden" name="targetUrl" value={href} /><input type="hidden" name="metadata" value={JSON.stringify({ restaurantReviewId: review.id, restaurantName: review.restaurantName, channel: label })} /><button className="block w-full rounded-xl border-2 border-ink bg-stallYellow px-4 py-3 text-ink shadow-brutal" formAction={recordReviewClick}>{label}</button></form>;
}

function stars(rating: number) {
  return "★★★★★".slice(0, Math.round(rating)).padEnd(5, "☆");
}
