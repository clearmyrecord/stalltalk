import Link from "next/link";
import { createRestaurantReview, deleteRestaurantReview } from "@/lib/actions";
import { RestaurantReviewForm } from "@/components/RestaurantReviewForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RestaurantReviewsPage() {
  const [publishers, venues, reviews] = await Promise.all([
    prisma.publisher.findMany({ orderBy: { name: "asc" } }),
    prisma.venue.findMany({ orderBy: { name: "asc" } }),
    prisma.restaurantReview.findMany({ include: { publisher: true, venue: true }, orderBy: { createdAt: "desc" } })
  ]);

  return <section><h1 className="font-display text-7xl uppercase">Restaurant Reviews</h1><p className="mt-2 max-w-3xl font-bold">Create reusable Potty Favor dining reviews, publish globally, assign to one venue, or target multiple venue editions.</p><RestaurantReviewForm action={createRestaurantReview} publishers={publishers} venues={venues} />
    <div className="mt-6 grid gap-4 md:grid-cols-3">{reviews.map((review) => <article key={review.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="text-xs font-black uppercase text-stallRed">{review.status} • {review.venue?.name || (review.venueIds.length ? `${review.venueIds.length} venues` : "Global")}</p><h2 className="font-display text-4xl uppercase leading-none">{review.restaurantName}</h2><p className="mt-2 font-bold">{review.reviewHeadline}</p><p className="mt-2 text-sm font-black uppercase text-stallPurple">★ {Number(review.starRating).toFixed(1)} • {review.cuisineType || "Cuisine TBD"}</p><div className="mt-4 flex gap-2"><Link className="rounded bg-ink px-3 py-2 text-xs font-black uppercase text-white" href={`/admin/restaurant-reviews/${review.id}/edit`}>Edit</Link><form action={deleteRestaurantReview.bind(null, review.id)}><button className="rounded bg-stallRed px-3 py-2 text-xs font-black uppercase text-white">Delete</button></form></div></article>)}</div></section>;
}
