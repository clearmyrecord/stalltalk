"use client";

import { useState } from "react";

async function uploadToCloudinary(file: File) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error("Cloudinary upload is not configured.");
  const data = new FormData();
  data.set("file", file);
  data.set("upload_preset", uploadPreset);
  data.set("folder", "stalltalk/restaurant-reviews");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: data });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary upload failed.");
  return String(result.secure_url);
}

export function RestaurantReviewForm({ action, publishers, venues, review }: any) {
  const assigned = new Set<string>(review?.venueIds || []);
  const [imageUrl, setImageUrl] = useState(review?.featuredImageUrl || "");
  const [uploadMessage, setUploadMessage] = useState("");
  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploadMessage("Uploading restaurant photo...");
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
      setUploadMessage("Photo uploaded and ready to save.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }
  return <form action={action} className="mt-4 grid gap-3 rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal md:grid-cols-2"><select name="publisherId" defaultValue={review?.publisherId} required className="rounded border-2 border-ink p-3 font-bold">{publishers.map((publisher: any) => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}</select><select name="venueId" defaultValue={review?.venueId || ""} className="rounded border-2 border-ink p-3 font-bold"><option value="">Global / no primary venue</option>{venues.map((venue: any) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select><input name="title" defaultValue={review?.title} placeholder="CMS title" required className="rounded border-2 border-ink p-3" /><input name="restaurantName" defaultValue={review?.restaurantName} placeholder="Restaurant name" required className="rounded border-2 border-ink p-3" /><label className="grid gap-2 rounded border-2 border-ink bg-paper p-3 font-black uppercase md:col-span-2">Featured restaurant photo upload<span className="text-sm normal-case font-bold">Uploads to Cloudinary and saves the returned URL for homepage/issue rendering.</span><input type="file" accept="image/*" onChange={(event) => void onUpload(event.target.files?.[0])} /><input name="featuredImageUrl" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Featured image URL / uploaded asset URL" className="rounded border-2 border-ink p-3 normal-case font-normal" />{uploadMessage ? <span className="text-sm normal-case text-stallPurple">{uploadMessage}</span> : null}</label><input name="starRating" type="number" step="0.1" min="0" max="5" defaultValue={review ? Number(review.starRating) : 4.8} className="rounded border-2 border-ink p-3" /><input name="cuisineType" defaultValue={review?.cuisineType || ""} placeholder="Cuisine type" className="rounded border-2 border-ink p-3" /><input name="address" defaultValue={review?.address || ""} placeholder="Address" className="rounded border-2 border-ink p-3" /><input name="city" defaultValue={review?.city || ""} placeholder="City" className="rounded border-2 border-ink p-3" /><input name="state" defaultValue={review?.state || ""} placeholder="State" className="rounded border-2 border-ink p-3" /><input name="websiteUrl" defaultValue={review?.websiteUrl || ""} placeholder="Website URL" className="rounded border-2 border-ink p-3" /><input name="instagramUrl" defaultValue={review?.instagramUrl || ""} placeholder="Instagram URL" className="rounded border-2 border-ink p-3" /><input name="facebookUrl" defaultValue={review?.facebookUrl || ""} placeholder="Facebook URL" className="rounded border-2 border-ink p-3" /><input name="reviewHeadline" defaultValue={review?.reviewHeadline} placeholder="Review headline" required className="rounded border-2 border-ink p-3 md:col-span-2" /><textarea name="reviewBody" defaultValue={review?.reviewBody} placeholder="Review body" required className="min-h-32 rounded border-2 border-ink p-3 md:col-span-2" /><input name="reviewerName" defaultValue={review?.reviewerName || "Potty Favor Review Team"} placeholder="Reviewer" required className="rounded border-2 border-ink p-3" /><input name="publishDate" type="datetime-local" defaultValue={review?.publishDate ? new Date(review.publishDate).toISOString().slice(0,16) : ""} className="rounded border-2 border-ink p-3" /><select name="status" defaultValue={review?.status || "DRAFT"} className="rounded border-2 border-ink p-3 font-bold"><option value="DRAFT">Save draft</option><option value="PUBLISHED">Publish immediately</option><option value="SCHEDULED">Schedule publication</option><option value="ARCHIVED">Archive</option></select><fieldset className="rounded border-2 border-ink p-3 md:col-span-2"><legend className="px-2 font-black uppercase">Multiple venue assignment</legend><div className="grid gap-2 md:grid-cols-3">{venues.map((venue: any) => <label key={venue.id} className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="venueIds" value={venue.id} defaultChecked={assigned.has(venue.id)} />{venue.name} ({venue.city}, {venue.state})</label>)}</div></fieldset><button className="rounded bg-ink p-3 font-black uppercase text-white md:col-span-2">Save Review</button></form>;
}
