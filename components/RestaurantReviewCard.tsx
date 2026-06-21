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
  const imageUrl = review.photoUrl || review.featuredImageUrl;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: review.restaurantName,
    image: imageUrl || undefined,
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
    <article className={`restaurant-review-card overflow-hidden rounded-[1.75rem] border-4 border-ink bg-white p-4 shadow-brutal md:p-5 ${featured ? "md:p-6" : ""}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ReviewViewRecorder publisherId={publisherId || review.publisherId} venueId={venueId || review.venueId} issueId={issueId} restaurantReviewId={review.id} restaurantName={review.restaurantName} />
      {imageUrl ? <img src={imageUrl} alt={`${review.restaurantName} featured dish`} className="aspect-video w-full rounded-[20px] object-cover" /> : <div className="grid aspect-video w-full place-items-center rounded-[20px] bg-stallYellow p-6 text-center font-display text-5xl uppercase text-ink">{review.restaurantName}</div>}
      <div className="min-w-0 pt-5">
        <p className="text-xs font-black uppercase tracking-[.25em] text-stallPurple">Restaurant Review</p>
        <h3 className="mt-2 font-display text-5xl uppercase leading-none md:text-6xl">{review.restaurantName}</h3>
        <p aria-label={`${review.starRating} out of 5 stars`} className="mt-3 text-xl font-black text-stallYellow [text-shadow:1px_1px_0_#111]">{stars(Number(review.starRating))} <span className="text-sm text-ink [text-shadow:none]">{Number(review.starRating).toFixed(1)}</span></p>
        {review.cuisineType ? <p className="mt-2 text-sm font-black uppercase text-stallPurple">{review.cuisineType}</p> : null}
        <p className="mt-3 whitespace-pre-wrap text-base font-bold leading-relaxed md:text-lg">{review.reviewHeadline}</p>
        {review.websiteUrl ? <div className="mt-5"><ReviewAction href={review.websiteUrl} label="Read Full Review" type="REVIEW_WEBSITE_CLICK" review={review} publisherId={publisherId} venueId={venueId} issueId={issueId} /></div> : null}
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
