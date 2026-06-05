"use client";

import { useEffect, useState } from "react";

type PublisherOption = { id: string; name: string };
type AdvertiserOption = { id: string; name: string };
type VenueOption = { id: string; name: string; city: string; state: string };
type RestroomOption = { id: string; name: string; venueName: string };
type IssueOption = { id: string; title: string; venueName: string; status: string };
type RecentCampaign = { id: string; businessName: string; title: string; offer: string; ctaText: string; couponCode: string | null; createdAt: string };

type Props = {
  createAd: (formData: FormData) => void | Promise<void>;
  publishers: PublisherOption[];
  advertisers: AdvertiserOption[];
  venues: VenueOption[];
  restrooms: RestroomOption[];
  issues: IssueOption[];
  recentCampaigns: RecentCampaign[];
};

type Format = "Banner" | "Square" | "Tall" | "Footer";
type Campaign = {
  businessName: string;
  offer: string;
  audience: string;
  tone: string;
  format: Format;
  headline: string;
  subheadline: string;
  cta: string;
  coupon: string;
  imagePrompt: string;
};

const formats: Record<Format, { ratio: string; size: string; label: string; prompt: string }> = {
  Banner: { ratio: "aspect-[16/5]", size: "wide restroom issue banner", label: "16:5 hero", prompt: "wide horizontal banner ad, roomy headline safe area, cinematic sweep" },
  Square: { ratio: "aspect-square", size: "square social ad", label: "1:1 feed", prompt: "square social ad, balanced centered composition, bold retail graphic system" },
  Tall: { ratio: "aspect-[4/5]", size: "tall mobile ad", label: "4:5 mobile", prompt: "tall mobile placement, vertical composition, strong top hook and lower CTA zone" },
  Footer: { ratio: "aspect-[5/1]", size: "slim footer strip", label: "5:1 footer", prompt: "thin footer strip ad, compact message, left-to-right visual flow" }
};

const tones = ["Bold", "Premium", "Playful", "Local", "Urgent", "Minimal"];

function clean(value: string, fallback: string) {
  return value.trim() || fallback;
}

function initials(value: string) {
  return clean(value, "AI").split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function buildCampaign(businessName: string, offer: string, audience: string, tone: string, format: Format): Campaign {
  const brand = clean(businessName, "Your Brand");
  const deal = clean(offer, "a limited-time offer");
  const target = clean(audience, "ready-to-buy local guests");
  const voice = clean(tone, "Bold");
  const couponSeed = brand.replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "STALL";
  const coupon = `${couponSeed}${new Date().getMonth() + 1}0`;
  const headline = voice === "Premium" ? `${brand}, elevated` : voice === "Urgent" ? `${deal} today` : `${brand} for ${target}`;
  const subheadline = `${deal} crafted for ${target}. ${voice} creative built for quick restroom-scroller attention.`;
  const cta = voice === "Urgent" ? "Claim It Now" : voice === "Minimal" ? "Get Offer" : "Tap to Claim";
  const imagePrompt = `Create a ${formats[format].size} for ${brand}. Campaign goal: promote ${deal}. Target audience: ${target}. Tone: ${voice}. Visual direction: Canva-polished layout, Meta Ads Manager clarity, OpenAI-style intelligent creative, high-contrast typography, modern brand shapes, ${formats[format].prompt}. Include no small unreadable body copy, no QR code, no fake logos, leave clean space for headline \"${headline}\" and CTA \"${cta}\". Output should feel premium, conversion-focused, and safe for a public restroom media network.`;

  return { businessName: brand, offer: deal, audience: target, tone: voice, format, headline, subheadline, cta, coupon, imagePrompt };
}

export function AdStudioAgency({ createAd, publishers, advertisers, venues, restrooms, issues, recentCampaigns }: Props) {
  const [businessName, setBusinessName] = useState("");
  const [offer, setOffer] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("Bold");
  const [format, setFormat] = useState<Format>("Banner");
  const [campaign, setCampaign] = useState<Campaign>(() => buildCampaign("", "", "", "Bold", "Banner"));
  const [history, setHistory] = useState<Campaign[]>([]);
  const [publisherId, setPublisherId] = useState(publishers[0]?.id ?? "");
  const [advertiserId, setAdvertiserId] = useState(advertisers[0]?.id ?? "");
  const [scope, setScope] = useState("GLOBAL");
  const [issueId, setIssueId] = useState(issues[0]?.id ?? "");
  const [slotNumber, setSlotNumber] = useState("1");
  const [generatedAt, setGeneratedAt] = useState("Draft");

  useEffect(() => {
    const raw = window.localStorage.getItem("stalltalk-ad-studio-history");
    if (!raw) return;

    try {
      setHistory(JSON.parse(raw) as Campaign[]);
    } catch {
      window.localStorage.removeItem("stalltalk-ad-studio-history");
    }
  }, []);

  const activeVenue = venues[0];

  function generateCampaign() {
    const next = buildCampaign(businessName, offer, audience, tone, format);
    const nextHistory = [next, ...history.filter((item) => item.imagePrompt !== next.imagePrompt)].slice(0, 6);
    setCampaign(next);
    setGeneratedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setHistory(nextHistory);
    window.localStorage.setItem("stalltalk-ad-studio-history", JSON.stringify(nextHistory));
  }

  function loadCampaign(item: Campaign) {
    setBusinessName(item.businessName);
    setOffer(item.offer);
    setAudience(item.audience);
    setTone(item.tone);
    setFormat(item.format);
    setCampaign(item);
    setGeneratedAt("Loaded from history");
  }

  const previewClass = formats[campaign.format].ratio;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border-4 border-ink bg-white shadow-brutal">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,44,255,.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,45,45,.18),transparent_28%)]" />
      <div className="relative grid gap-0 xl:grid-cols-[1.05fr_.95fr]">
        <div className="border-b-4 border-ink bg-ink p-5 text-white xl:border-b-0 xl:border-r-4">
          <p className="text-xs font-black uppercase tracking-[.35em] text-stallYellow">AI advertising agency</p>
          <h1 className="mt-2 font-display text-6xl uppercase leading-none md:text-8xl">Ad Studio</h1>
          <p className="mt-3 max-w-2xl text-lg font-black">A guided campaign room that turns a business, offer, audience, and tone into ready-to-publish creative for Stall Talk ad inventory.</p>

          <div className="mt-6 grid gap-3">
            {[{ step: "Step 1", label: "Business name", value: businessName, setValue: setBusinessName, placeholder: "e.g. Neon Taco Co." }, { step: "Step 2", label: "Offer", value: offer, setValue: setOffer, placeholder: "e.g. Free chips with any entrée" }, { step: "Step 3", label: "Target audience", value: audience, setValue: setAudience, placeholder: "e.g. late-night diners near the Strip" }].map((field) => (
              <label key={field.step} className="rounded-2xl border-2 border-white/20 bg-white/10 p-4 backdrop-blur">
                <span className="text-xs font-black uppercase tracking-widest text-stallYellow">{field.step}</span>
                <span className="mt-1 block font-display text-3xl uppercase">{field.label}</span>
                <input value={field.value} onChange={(event) => field.setValue(event.target.value)} placeholder={field.placeholder} className="mt-3 w-full rounded-xl border-2 border-white bg-white p-3 font-black text-ink outline-none focus:border-stallYellow" />
              </label>
            ))}

            <div className="rounded-2xl border-2 border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-widest text-stallYellow">Step 4</p>
              <h2 className="font-display text-3xl uppercase">Tone</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {tones.map((item) => <button key={item} type="button" onClick={() => setTone(item)} className={`rounded-full border-2 px-4 py-2 text-sm font-black uppercase ${tone === item ? "border-stallYellow bg-stallYellow text-ink" : "border-white bg-transparent text-white"}`}>{item}</button>)}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-stallYellow">Step 5</p>
                  <h2 className="font-display text-3xl uppercase">Generate Campaign</h2>
                </div>
                <select value={format} onChange={(event) => setFormat(event.target.value as Format)} className="rounded-xl border-2 border-white bg-white p-3 font-black text-ink">
                  {Object.keys(formats).map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <button type="button" onClick={generateCampaign} className="mt-4 w-full rounded-2xl bg-stallYellow px-5 py-4 font-black uppercase text-ink shadow-red transition hover:-translate-y-0.5">Generate Campaign</button>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Creative output</p>
              <h2 className="font-display text-5xl uppercase">Campaign Deck</h2>
            </div>
            <span className="rounded-full border-2 border-ink bg-paper px-3 py-2 text-xs font-black uppercase">{formats[campaign.format].label} • {generatedAt}</span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className={`relative ${previewClass} min-h-36 overflow-hidden rounded-[1.5rem] border-4 border-ink bg-ink shadow-purple`}>
              <div className="absolute inset-0 ad-gradient-8 opacity-95" />
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/25 blur-sm" />
              <div className="absolute bottom-4 right-4 rounded-2xl border-2 border-white/60 bg-white/20 p-4 text-white backdrop-blur">
                <p className="font-display text-5xl uppercase leading-none">{initials(campaign.businessName)}</p>
              </div>
              <div className="relative flex h-full flex-col justify-between p-5 text-white">
                <div>
                  <p className="inline-flex rounded-full bg-ink px-3 py-1 text-[10px] font-black uppercase tracking-widest text-stallYellow">AI graphic ad preview</p>
                  <h3 className="mt-3 max-w-2xl font-display text-4xl uppercase leading-none md:text-6xl">{campaign.headline}</h3>
                  <p className="mt-2 max-w-xl text-sm font-black md:text-base">{campaign.subheadline}</p>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <span className="rounded-xl bg-white px-4 py-3 font-black uppercase text-ink">{campaign.cta}</span>
                  <span className="rounded-xl border-2 border-white px-4 py-3 font-black uppercase">Code {campaign.coupon}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {["Banner", "Square", "Tall", "Footer"].map((item) => <button key={item} type="button" onClick={() => { setFormat(item as Format); setCampaign(buildCampaign(businessName || campaign.businessName, offer || campaign.offer, audience || campaign.audience, tone || campaign.tone, item as Format)); }} className={`rounded-2xl border-2 border-ink p-3 text-left font-black uppercase ${campaign.format === item ? "bg-stallYellow shadow-red" : "bg-white"}`}>{item}<span className="block text-xs normal-case text-ink/70">{formats[item as Format].label}</span></button>)}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-4 border-ink bg-paper p-4">
              <h3 className="font-display text-4xl uppercase">Campaign assets</h3>
              <dl className="mt-3 grid gap-3 text-sm font-bold">
                <div><dt className="text-xs font-black uppercase text-stallRed">Headline</dt><dd>{campaign.headline}</dd></div>
                <div><dt className="text-xs font-black uppercase text-stallRed">Subheadline</dt><dd>{campaign.subheadline}</dd></div>
                <div><dt className="text-xs font-black uppercase text-stallRed">CTA</dt><dd>{campaign.cta}</dd></div>
                <div><dt className="text-xs font-black uppercase text-stallRed">Coupon</dt><dd>{campaign.coupon}</dd></div>
              </dl>
            </div>

            <div className="rounded-2xl border-4 border-ink bg-ink p-4 text-white">
              <h3 className="font-display text-4xl uppercase text-stallYellow">AI Creative Brief</h3>
              <p className="mt-1 text-xs font-black uppercase tracking-widest text-white/70">Exact image-generation prompt</p>
              <textarea readOnly value={campaign.imagePrompt} className="mt-3 h-56 w-full rounded-xl border-2 border-white bg-white p-3 text-sm font-bold text-ink" />
              <p className="mt-2 text-xs font-bold text-white/70">Future AI image generation can send this prompt plus the selected format to an image model.</p>
            </div>
          </div>

          <form action={createAd} className="mt-5 rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stallPurple">Publish</p>
                <h3 className="font-display text-4xl uppercase">Send to Ad Slots 1-8</h3>
              </div>
              <button className="rounded-2xl bg-stallRed px-5 py-3 font-black uppercase text-white">Publish campaign</button>
            </div>

            <input type="hidden" name="businessName" value={campaign.businessName} />
            <input type="hidden" name="title" value={campaign.headline} />
            <input type="hidden" name="offer" value={campaign.subheadline} />
            <input type="hidden" name="ctaText" value={campaign.cta} />
            <input type="hidden" name="couponCode" value={campaign.coupon} />
            <input type="hidden" name="artworkUrl" value={`ai-image-prompt:${campaign.imagePrompt}`} />
            <input type="hidden" name="targetUrl" value="https://example.com" />
            <input type="hidden" name="status" value="ACTIVE" />
            <input type="hidden" name="monthlyPriceDollars" value="499" />
            <input type="hidden" name="stripePriceId" value="" />
            <input type="hidden" name="phone" value="" />
            <input type="hidden" name="city" value={activeVenue?.city ?? ""} />
            <input type="hidden" name="state" value={activeVenue?.state ?? ""} />

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-xs font-black uppercase text-ink/70">Publisher<select name="publisherId" value={publisherId} onChange={(event) => setPublisherId(event.target.value)} required className="rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink">{publishers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-black uppercase text-ink/70">Advertiser<select name="advertiserId" value={advertiserId} onChange={(event) => setAdvertiserId(event.target.value)} required className="rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink">{advertisers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-black uppercase text-ink/70">Scope<select name="scope" value={scope} onChange={(event) => setScope(event.target.value)} className="rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink"><option>GLOBAL</option><option>CITY</option><option>VENUE</option><option>RESTROOM</option></select></label>
              <label className="grid gap-1 text-xs font-black uppercase text-ink/70">Venue scope<select name="venueId" className="rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink"><option value="">Auto / no venue</option>{venues.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-black uppercase text-ink/70">Restroom scope<select name="restroomId" className="rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink"><option value="">Auto / no restroom</option>{restrooms.map((item) => <option key={item.id} value={item.id}>{item.venueName} • {item.name}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-black uppercase text-ink/70">Issue<select name="issueId" value={issueId} onChange={(event) => setIssueId(event.target.value)} className="rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink"><option value="">Save without slot</option>{issues.map((item) => <option key={item.id} value={item.id}>{item.title} • {item.venueName} • {item.status}</option>)}</select></label>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-8">
              {Array.from({ length: 8 }, (_, index) => String(index + 1)).map((item) => <label key={item} className={`cursor-pointer rounded-xl border-2 border-ink p-3 text-center font-black uppercase ${slotNumber === item ? "bg-stallYellow shadow-red" : "bg-paper"}`}><input className="sr-only" type="radio" name="slotNumber" value={item} checked={slotNumber === item} onChange={(event) => setSlotNumber(event.target.value)} />Slot {item}</label>)}
            </div>
          </form>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-4 border-ink bg-paper p-4">
              <h3 className="font-display text-4xl uppercase">Campaign history</h3>
              <div className="mt-3 grid gap-2">
                {history.length ? history.map((item, index) => <button key={`${item.imagePrompt}-${index}`} type="button" onClick={() => loadCampaign(item)} className="rounded-xl border-2 border-ink bg-white p-3 text-left"><span className="block font-black uppercase">{item.businessName}</span><span className="text-sm font-bold">{item.headline}</span></button>) : <p className="rounded-xl border-2 border-dashed border-ink bg-white p-3 font-bold">Generated campaigns will appear here during this session.</p>}
              </div>
            </div>
            <div className="rounded-2xl border-4 border-ink bg-white p-4">
              <h3 className="font-display text-4xl uppercase">Published campaigns</h3>
              <div className="mt-3 grid gap-2">
                {recentCampaigns.map((item) => <article key={item.id} className="rounded-xl border-2 border-ink bg-paper p-3"><p className="text-xs font-black uppercase text-stallRed">{new Date(item.createdAt).toLocaleDateString()}</p><h4 className="font-black uppercase">{item.businessName}</h4><p className="text-sm font-bold">{item.title}</p><p className="text-xs font-black uppercase text-stallPurple">{item.ctaText} {item.couponCode ? `• ${item.couponCode}` : ""}</p></article>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
