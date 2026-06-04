import type { Ad } from "@prisma/client";
import { initials } from "@/lib/format";
import { recordAnalytics } from "@/lib/actions";

type Props = { ad: Ad & { slotNumber?: number; source?: string }; slotNumber: number; issueId: string; publisherId?: string | null; venueId?: string | null; restroomId?: string | null; qrCodeId?: string | null; compact?: boolean };

export function AdCard({ ad, slotNumber, issueId, publisherId, venueId, restroomId, qrCodeId, compact = false }: Props) {
  const gradient = `ad-gradient-${slotNumber}`;
  return (
    <article className="rounded-2xl border-4 border-ink bg-white p-2 shadow-brutal">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-ink px-2 py-1 text-[10px] font-black uppercase tracking-widest text-stallYellow">Ad #{slotNumber}</span>
        <span className="rounded-full bg-stallPurple px-2 py-1 text-[10px] font-black uppercase text-white">{ad.source || ad.scope}</span>
      </div>
      <div className={`${gradient} grid ${compact ? "h-16" : "h-28"} place-items-center rounded-xl border-2 border-ink text-center text-3xl font-black text-white shadow-inner`}>
        {ad.artworkUrl ? <span className="px-2 text-xs">{ad.artworkUrl}</span> : initials(ad.businessName)}
      </div>
      <h3 className="mt-2 font-display text-2xl uppercase leading-none tracking-tight">{ad.businessName}</h3>
      <p className="text-sm font-black uppercase text-stallRed">{ad.title}</p>
      <p className={`${compact ? "line-clamp-2" : ""} text-sm font-bold`}>{ad.offer}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[11px] font-black uppercase">
        <TrackingButton label={ad.ctaText} type="AD_CLICK" ad={ad} issueId={issueId} publisherId={publisherId} venueId={venueId} restroomId={restroomId} qrCodeId={qrCodeId} slotNumber={slotNumber} dark />
        <TrackingButton label={ad.couponCode || "Coupon"} type="COUPON_REDEMPTION" ad={ad} issueId={issueId} publisherId={publisherId} venueId={venueId} restroomId={restroomId} qrCodeId={qrCodeId} slotNumber={slotNumber} />
      </div>
      <p className="mt-2 truncate text-xs font-bold">{ad.phone || ad.targetUrl}</p>
    </article>
  );
}

function TrackingButton({ label, type, ad, issueId, publisherId, venueId, restroomId, qrCodeId, slotNumber, dark = false }: { label: string; type: string; ad: Ad; issueId: string; publisherId?: string | null; venueId?: string | null; restroomId?: string | null; qrCodeId?: string | null; slotNumber: number; dark?: boolean }) {
  return (
    <form action={recordAnalytics}>
      <input type="hidden" name="publisherId" value={publisherId || ""} />
      <input type="hidden" name="venueId" value={venueId || ""} />
      <input type="hidden" name="restroomId" value={restroomId || ""} />
      <input type="hidden" name="qrCodeId" value={qrCodeId || ""} />
      <input type="hidden" name="issueId" value={issueId} />
      <input type="hidden" name="advertiserId" value={ad.advertiserId} />
      <input type="hidden" name="adId" value={ad.id} />
      <input type="hidden" name="slotNumber" value={slotNumber} />
      <input type="hidden" name="type" value={type} />
      <button className={`w-full rounded-lg px-2 py-2 ${dark ? "bg-ink text-white" : "bg-stallYellow text-ink"}`} formAction={recordAnalytics}>{label}</button>
    </form>
  );
}
