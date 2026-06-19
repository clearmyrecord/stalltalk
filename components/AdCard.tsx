import type { Ad } from "@prisma/client";
import { initials } from "@/lib/format";
import { recordAnalytics } from "@/lib/actions";

type Props = {
  ad: Ad & { slotNumber?: number; source?: string };
  slotNumber: number;
  issueId: string;
  publisherId?: string | null;
  venueId?: string | null;
  restroomId?: string | null;
  qrCodeId?: string | null;
  compact?: boolean;
  chip?: boolean;
};

export function AdCard({ ad, slotNumber, issueId, publisherId, venueId, restroomId, qrCodeId, compact = false, chip = false }: Props) {
  const articleClasses = chip
    ? "flex min-w-[10rem] max-w-[11rem] flex-col rounded-xl border-2 border-ink bg-white p-2 shadow-brutal"
    : "rounded-[1.75rem] border-4 border-ink bg-white p-4 shadow-brutal md:grid md:min-h-0 md:grid-cols-[minmax(0,360px)_1fr] md:gap-5 md:p-5";

  return (
    <article className={articleClasses}>
      <div className="mb-2 flex items-center justify-between gap-2 md:col-span-2">
        <span className="rounded-full bg-ink px-2 py-1 text-[10px] font-black uppercase tracking-widest text-stallYellow">Ad {slotNumber}</span>
        <span className="rounded-full bg-stallPurple px-2 py-1 text-[10px] font-black uppercase text-white">{ad.source || ad.scope}</span>
      </div>
      <CreativeFrame ad={ad} slotNumber={slotNumber} compact={compact || chip} chip={chip} />
      <div className={chip ? "" : "mt-3 md:mt-0"}>
        <h3 className={`${chip ? "mt-2 line-clamp-1 text-lg" : "text-4xl md:text-6xl"} font-display uppercase leading-none tracking-tight`}>{ad.businessName}</h3>
        <p className={`${chip ? "line-clamp-1 text-[11px]" : "mt-2 text-lg md:text-xl"} font-black uppercase text-stallRed`}>{ad.generatedHeadline || ad.title}</p>
        {!chip ? <p className={`${compact ? "line-clamp-2" : ""} mt-2 text-base font-bold md:text-lg`}>{ad.generatedSubheadline || ad.offer}</p> : null}
      </div>
      <div className={`mt-2 grid ${chip ? "grid-cols-1 gap-1 text-[10px]" : "grid-cols-2 gap-2 text-[12px] md:col-start-2"} text-center font-black uppercase`}>
        <TrackingButton label={chip ? "Open" : ad.ctaText} type="AD_CLICK" ad={ad} issueId={issueId} publisherId={publisherId} venueId={venueId} restroomId={restroomId} qrCodeId={qrCodeId} slotNumber={slotNumber} dark />
        <TrackingButton label={chip ? "Coupon" : ad.couponCode || "Coupon"} type="COUPON_REDEMPTION" ad={ad} issueId={issueId} publisherId={publisherId} venueId={venueId} restroomId={restroomId} qrCodeId={qrCodeId} slotNumber={slotNumber} />
      </div>
      {!chip ? <p className="mt-2 truncate text-xs font-bold md:col-start-2">{ad.phone || ad.targetUrl}</p> : null}
    </article>
  );
}

export function AdPlaceholder({ slotNumber, chip = false }: { slotNumber: number; chip?: boolean }) {
  const articleClasses = chip
    ? "inline-ad is-empty min-w-[10rem] max-w-[11rem] rounded-xl border-2 border-dashed border-ink bg-paper p-2 text-ink shadow-brutal"
    : "inline-ad is-empty rounded-[1.75rem] border-4 border-dashed border-ink bg-paper p-5 text-ink shadow-brutal";

  return (
    <article className={articleClasses}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-ink px-2 py-1 text-[10px] font-black uppercase tracking-widest text-stallYellow">Ad {slotNumber}</span>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-stallPurple ring-2 ring-ink">Premium</span>
      </div>
      <div className={`grid ${chip ? "min-h-16" : "min-h-40"} place-items-center rounded-xl border-2 border-dashed border-ink bg-white/80 p-4 text-center font-black uppercase text-ink shadow-inner`}>
        Advertise Here
      </div>
      <h3 className={`${chip ? "mt-2 text-lg" : "mt-4 text-4xl md:text-6xl"} font-display uppercase leading-none text-ink`}>Available Sponsor Slot</h3>
      {!chip ? <p className="mt-2 text-lg font-black uppercase text-stallRed">Reach restroom readers in this venue.</p> : null}
      <a className={`${chip ? "mt-2 px-3 py-2 text-xs" : "mt-4 px-4 py-3 text-sm"} inline-flex w-fit rounded-full bg-stallPurple font-black uppercase text-white shadow-brutal`} href="/admin/stripe">Book Slot</a>
    </article>
  );
}

function CreativeFrame({ ad, slotNumber, compact, chip }: { ad: Ad; slotNumber: number; compact: boolean; chip: boolean }) {
  const frame = "ad-creative-frame relative aspect-square overflow-hidden rounded-xl border-2 border-ink bg-ink shadow-inner";
  const linkedArtwork = ad.targetUrl && ad.targetUrl !== "#";

  if (ad.creativeType === "VIDEO" && ad.videoUrl) {
    return <div className={frame}><video className="h-full w-full object-cover" src={ad.videoUrl} autoPlay muted loop playsInline /></div>;
  }

  if (ad.creativeType === "HTML" && ad.htmlCreative) {
    return <div className={frame} dangerouslySetInnerHTML={{ __html: ad.htmlCreative }} />;
  }

  if (ad.artworkUrl) {
    return linkedArtwork ? <a className={frame} href={ad.targetUrl} target="_blank" rel="noopener noreferrer"><img className="h-full w-full object-cover" src={ad.artworkUrl} alt={`${ad.businessName} advertisement`} /></a> : <div className={frame}><img className="h-full w-full object-cover" src={ad.artworkUrl} alt={`${ad.businessName} advertisement`} /></div>;
  }

  return <div className={`ad-gradient-${slotNumber} grid aspect-square place-items-center rounded-xl border-2 border-ink text-center text-3xl font-black text-white shadow-inner`}>{initials(ad.businessName)}</div>;
}

function TrackingButton({ label, type, ad, issueId, publisherId, venueId, restroomId, qrCodeId, slotNumber, dark = false }: { label: string; type: string; ad: Ad; issueId: string; publisherId?: string | null; venueId?: string | null; restroomId?: string | null; qrCodeId?: string | null; slotNumber: number; dark?: boolean }) {
  return (
    <form action={recordAnalytics}>
      <input type="hidden" name="publisherId" value={publisherId || ""} />
      <input type="hidden" name="venueId" value={venueId || ""} />
      <input type="hidden" name="restroomId" value={restroomId || ""} />
      <input type="hidden" name="qrCodeId" value={qrCodeId || ""} />
      <input type="hidden" name="issueId" value={issueId} />
      <input type="hidden" name="advertiserId" value={ad.advertiserId || ""} />
      <input type="hidden" name="adId" value={ad.id} />
      <input type="hidden" name="slotNumber" value={slotNumber} />
      <input type="hidden" name="type" value={type} />
      <button className={`w-full rounded-lg px-2 py-2 ${dark ? "bg-ink text-white" : "bg-stallYellow text-ink"}`} formAction={recordAnalytics}>{label}</button>
    </form>
  );
}
