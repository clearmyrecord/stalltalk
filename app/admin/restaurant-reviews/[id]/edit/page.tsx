import { notFound } from "next/navigation";
import { updateRestaurantReview } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { RestaurantReviewForm } from "@/components/RestaurantReviewForm";

export const dynamic = "force-dynamic";
export default async function EditRestaurantReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [review, publishers, venues] = await Promise.all([prisma.restaurantReview.findUnique({ where: { id } }), prisma.publisher.findMany({ orderBy: { name: "asc" } }), prisma.venue.findMany({ orderBy: { name: "asc" } })]);
  if (!review) notFound();
  return <section><h1 className="font-display text-7xl uppercase">Edit Review</h1><RestaurantReviewForm action={updateRestaurantReview.bind(null, review.id)} publishers={publishers} venues={venues} review={review} /></section>;
}
