"use client";

import { useMemo, useState } from "react";
import { createAdvertiserCampaign } from "@/lib/actions";
import { FLIGHT_MONTH_OPTIONS, PRICE_PER_PLACEMENT_MONTH_CENTS, addMonthsToFlightMonth, calculateFlightTotal, flightEndMonth, normalizeFlightMonth } from "@/lib/campaign-flights";
import { money } from "@/lib/format";

type AdvertiserOption = { id: string; name: string };
type PlacementOption = { id: string; month: string; venueName: string; restroomName: string; qrCode: string; toiletLabel: string; slotNumber: number; priceCents: number; venueId?: string; city?: string; state?: string; venueType?: string };

export function AdvertiserCampaignForm({ advertisers, placements, selectedAdvertiserId, initialStartMonth }: { advertisers: AdvertiserOption[]; placements: PlacementOption[]; selectedAdvertiserId: string; initialStartMonth: string }) {
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([]);
  const [flightMonths, setFlightMonths] = useState(1);
  const [flightStartMonth, setFlightStartMonth] = useState(normalizeFlightMonth(initialStartMonth));
  const flightEnd = useMemo(() => flightEndMonth(flightStartMonth, flightMonths), [flightStartMonth, flightMonths]);
  const nextMonths = useMemo(() => Array.from({ length: 12 }, (_, index) => addMonthsToFlightMonth(normalizeFlightMonth(initialStartMonth), index)), [initialStartMonth]);
  const totalAmountCents = calculateFlightTotal(Math.max(1, selectedPlacements.length), flightMonths);

  function togglePlacement(id: string, checked: boolean) {
    setSelectedPlacements((current) => checked ? [...current, id] : current.filter((placementId) => placementId !== id));
  }

  return (
    <form action={createAdvertiserCampaign} className="mt-4 grid gap-3 md:grid-cols-2">
      <select name="advertiserId" defaultValue={selectedAdvertiserId} className="rounded border-2 border-ink p-3">{advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}</select>
      <select name="flightStartMonth" value={flightStartMonth} onChange={(event) => setFlightStartMonth(event.target.value)} className="rounded border-2 border-ink p-3" aria-label="Campaign flight start month">
        {nextMonths.map((month) => <option key={month} value={month}>Start {month}</option>)}
      </select>
      <select name="flightMonths" value={flightMonths} onChange={(event) => setFlightMonths(Number(event.target.value))} className="rounded border-2 border-ink p-3" aria-label="Campaign flight duration">
        {FLIGHT_MONTH_OPTIONS.map((months) => <option key={months} value={months}>{months} month{months === 1 ? "" : "s"}</option>)}
      </select>
      <div className="rounded-xl border-2 border-ink bg-white p-3 font-black uppercase">
        Flight ends {flightEnd} · {money(PRICE_PER_PLACEMENT_MONTH_CENTS)} × {Math.max(1, selectedPlacements.length)} placement{selectedPlacements.length === 1 ? "" : "s"} × {flightMonths} month{flightMonths === 1 ? "" : "s"} = {money(totalAmountCents)}
      </div>
      <fieldset className="grid gap-2 rounded-xl border-2 border-ink bg-white p-3 md:col-span-2">
        <legend className="px-2 font-black uppercase">Select one or multiple QR/toilet placements</legend>
        {placements.map((placement) => <label key={placement.id} className="flex gap-2 font-bold"><input type="checkbox" name="inventoryIds" value={placement.id} checked={selectedPlacements.includes(placement.id)} onChange={(event) => togglePlacement(placement.id, event.target.checked)} /> {placement.venueName} • Base month {placement.month} • {placement.restroomName || placement.qrCode || "Venue-wide"} • {placement.toiletLabel || "QR TBD"} • Slot {placement.slotNumber}</label>)}
        {placements.length === 0 ? <p className="font-black">No placements available to select for this start month.</p> : null}
      </fieldset>
      <input name="name" placeholder="Campaign name" className="rounded border-2 border-ink p-3" />
      <input name="budgetDollars" type="number" min="1" placeholder="Campaign budget dollars" className="rounded border-2 border-ink p-3" />
      <textarea name="description" placeholder="Campaign description / approval notes" className="rounded border-2 border-ink p-3 md:col-span-2" />
      <input name="businessName" placeholder="Business name" required className="rounded border-2 border-ink p-3" />
      <select name="creativeKind" className="rounded border-2 border-ink p-3"><option value="IMAGE">Image ad</option><option value="COUPON">Coupon ad</option><option value="SPONSORED_ARTICLE">Sponsored article</option><option value="RESTAURANT_PROMOTION">Restaurant promotion</option><option value="EVENT_PROMOTION">Event promotion</option></select>
      <input name="headline" placeholder="Ad headline" required className="rounded border-2 border-ink p-3" />
      <input name="creativeUrl" placeholder="Uploaded/generated creative image URL" className="rounded border-2 border-ink p-3" />
      <input name="targetUrl" placeholder="Website" className="rounded border-2 border-ink p-3" />
      <input name="ctaText" placeholder="CTA" className="rounded border-2 border-ink p-3" />
      <fieldset className="rounded-xl border-2 border-ink bg-white p-3 md:col-span-2"><legend className="px-2 font-black uppercase">Multi-select targeting</legend><div className="grid gap-2 md:grid-cols-5"><label className="font-bold"><input type="radio" name="targetType" value="GLOBAL_NETWORK" defaultChecked /> Global Network</label><label className="font-bold"><input type="radio" name="targetType" value="STATE" /> State</label><label className="font-bold"><input type="radio" name="targetType" value="CITY" /> City</label><label className="font-bold"><input type="radio" name="targetType" value="VENUE" /> Venue</label><label className="font-bold"><input type="radio" name="targetType" value="VENUE_TYPE" /> Venue Type</label></div><div className="mt-3 grid gap-2 md:grid-cols-4"><input name="targetStates" placeholder="NV" className="rounded border-2 border-ink p-2"/><input name="targetCities" placeholder="Las Vegas" className="rounded border-2 border-ink p-2"/><input name="targetVenueTypes" placeholder="restaurant / bar / casino resort" className="rounded border-2 border-ink p-2"/><select name="targetVenueIds" multiple className="rounded border-2 border-ink p-2">{placements.map((placement) => placement.venueId ? <option key={placement.id} value={placement.venueId}>{placement.venueName}</option> : null)}</select></div></fieldset>
      <textarea name="body" placeholder="Offer/body copy" required className="rounded border-2 border-ink p-3 md:col-span-2" />
      <button disabled={!selectedAdvertiserId || placements.length === 0 || selectedPlacements.length === 0} className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white disabled:opacity-50 md:col-span-2">Save {flightMonths}-month campaign draft · {money(totalAmountCents)}</button>
    </form>
  );
}
