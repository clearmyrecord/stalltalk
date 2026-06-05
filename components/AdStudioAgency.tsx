"use client";

import { useEffect, useState, useTransition } from "react";

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

type AdSize = "Banner" | "Square" | "Tall" | "Footer";
type GeneratedCreative = {
  adSize: AdSize;
  imageUrl: string;
  promptUsed: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  couponCode: string;
  fallback?: boolean;
  error?: string;
  htmlCreative?: string;
};

type CampaignHistoryItem = GeneratedCreative & { campaignId: string; businessName: string; createdAt: string; slotPublished?: number };

const audienceOptions = ["Tourists", "Locals", "Casino Guests", "Sports Fans", "Concert Goers", "Convention Attendees", "Custom Audience"];
const tones = ["Funny", "Luxury", "Professional", "Urgent", "Family Friendly", "Nightlife"];
const visualStyles = ["Vegas Neon", "Casino Luxury", "Sports Bar", "Restaurant", "Event Promotion", "Concert", "Modern Minimal"];
const sizes: Record<AdSize, { label: string; className: string }> = {
  Banner: { label: "Banner", className: "aspect-[16/5]" },
  Square: { label: "Square", className: "aspect-square" },
  Tall: { label: "Tall", className: "aspect-[4/5]" },
  Footer: { label: "Footer", className: "aspect-[5/1]" }
};

function safe(value: string, fallback: string) {
  return value.trim() || fallback;
}

function dataUrlFromSvg(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function fallbackCreative(input: Record<string, string>, adSize: AdSize, error?: string): GeneratedCreative {
  const business = safe(input.businessName, "Your Business");
  const offer = safe(input.offer, "Limited-Time Offer");
  const couponCode = safe(input.couponCode, business.replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() + "15");
  const headline = `${offer}`;
  const subheadline = `${business} for ${safe(input.audience, "nearby guests")}`;
  const ctaText = safe(input.ctaText, "Claim Offer");
  const colors = safe(input.brandColors, "#ff2d55,#ffd400,#5b2cff").split(",").map((color) => color.trim()).filter(Boolean);
  const [primary = "#ff2d55", secondary = "#ffd400", accent = "#5b2cff"] = colors;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${primary}"/><stop offset=".55" stop-color="${accent}"/><stop offset="1" stop-color="#111827"/></linearGradient></defs><rect width="1200" height="700" rx="48" fill="url(#g)"/><circle cx="1040" cy="130" r="170" fill="${secondary}" opacity=".9"/><text x="72" y="130" font-family="Arial Black,Arial" font-size="44" fill="white">${business.toUpperCase()}</text><text x="72" y="300" font-family="Arial Black,Arial" font-size="92" fill="${secondary}">${headline.toUpperCase()}</text><text x="76" y="388" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="white">${subheadline}</text><rect x="72" y="486" width="360" height="92" rx="24" fill="${secondary}"/><text x="104" y="546" font-family="Arial Black,Arial" font-size="34" fill="#111827">${ctaText.toUpperCase()}</text><text x="72" y="636" font-family="Arial Black,Arial" font-size="34" fill="white">CODE ${couponCode}</text></svg>`;
  return {
    adSize,
    imageUrl: dataUrlFromSvg(svg),
    promptUsed: `HTML/CSS fallback ad for ${business}: ${offer}, audience ${safe(input.audience, "nearby guests")}, tone ${safe(input.tone, "Professional")}, style ${safe(input.visualStyle, "Vegas Neon")}.`,
    headline,
    subheadline,
    ctaText,
    couponCode,
    fallback: true,
    error,
    htmlCreative: svg
  };
}

export function AdStudioAgency({ createAd, publishers, advertisers, venues, restrooms, issues, recentCampaigns }: Props) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selectedCreativeIndex, setSelectedCreativeIndex] = useState(0);
  const [slotNumber, setSlotNumber] = useState("1");
  const [history, setHistory] = useState<CampaignHistoryItem[]>([]);
  const [creatives, setCreatives] = useState<GeneratedCreative[]>([]);
  const [form, setForm] = useState({
    businessName: "",
    category: "",
    website: "",
    phone: "",
    logoName: "",
    offer: "",
    couponCode: "",
    ctaText: "Claim Offer",
    expirationDate: "",
    audience: "Tourists",
    customAudience: "",
    tone: "Professional",
    visualStyle: "Vegas Neon",
    brandColors: "#ff2d55, #ffd400, #5b2cff",
    publisherId: publishers[0]?.id ?? "",
    advertiserId: advertisers[0]?.id ?? "",
    issueId: issues[0]?.id ?? "",
    scope: "GLOBAL"
  });

  useEffect(() => {
    const raw = window.localStorage.getItem("stalltalk-ad-studio-history") || window.localStorage.getItem("stalltalk-ai-creative-history");
    if (!raw) return;
    try {
      setHistory(JSON.parse(raw) as CampaignHistoryItem[]);
    } catch {
      window.localStorage.removeItem("stalltalk-ad-studio-history");
    }
  }, []);

  const selectedCreative = creatives[selectedCreativeIndex];
  const activeAudience = form.audience === "Custom Audience" ? safe(form.customAudience, "custom audience") : form.audience;
  const activeVenue = venues[0];

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generateCampaign() {
    setIsGenerating(true);
    setError("");
    const base = { ...form, audience: activeAudience };
    const generated: GeneratedCreative[] = [];

    for (const adSize of Object.keys(sizes) as AdSize[]) {
      try {
        const response = await fetch("/api/generate-ad-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...base, adSize })
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || "Image generation failed.");
        generated.push({
          adSize,
          imageUrl: data.imageUrl,
          promptUsed: data.promptUsed,
          headline: data.headline,
          subheadline: data.subheadline,
          ctaText: data.ctaText,
          couponCode: data.couponCode,
          fallback: data.fallback,
          error: data.error,
          htmlCreative: data.htmlCreative
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Image generation failed.";
        generated.push(fallbackCreative(base, adSize, message));
        setError(message);
      }
    }

    const nextHistory = generated.map((creative) => ({ ...creative, campaignId: crypto.randomUUID(), businessName: safe(form.businessName, "Your Business"), createdAt: new Date().toISOString() }));
    const mergedHistory = [...nextHistory, ...history].slice(0, 12);
    setCreatives(generated);
    setSelectedCreativeIndex(0);
    setHistory(mergedHistory);
    window.localStorage.setItem("stalltalk-ad-studio-history", JSON.stringify(mergedHistory));
    setStep(5);
    setIsGenerating(false);
  }

  function publish() {
    if (!selectedCreative) return;
    const formData = new FormData();
    const campaignId = crypto.randomUUID();
    formData.set("campaignId", campaignId);
    formData.set("publisherId", form.publisherId);
    formData.set("advertiserId", form.advertiserId);
    formData.set("businessName", safe(form.businessName, "Your Business"));
    formData.set("title", selectedCreative.headline);
    formData.set("offer", selectedCreative.subheadline);
    formData.set("artworkUrl", selectedCreative.imageUrl);
    formData.set("creativeType", selectedCreative.fallback ? "HTML" : "IMAGE");
    formData.set("htmlCreative", selectedCreative.htmlCreative || "");
    formData.set("promptUsed", selectedCreative.promptUsed);
    formData.set("generatedHeadline", selectedCreative.headline);
    formData.set("generatedSubheadline", selectedCreative.subheadline);
    formData.set("adSize", selectedCreative.adSize);
    formData.set("ctaText", selectedCreative.ctaText);
    formData.set("targetUrl", form.website || "#");
    formData.set("phone", form.phone);
    formData.set("couponCode", selectedCreative.couponCode);
    formData.set("status", "ACTIVE");
    formData.set("scope", form.scope);
    formData.set("issueId", form.issueId);
    formData.set("slotNumber", slotNumber);
    formData.set("monthlyPriceDollars", "0");

    startTransition(() => {
      void createAd(formData);
    });
  }

  const canGenerate = form.businessName.trim() && form.offer.trim();

  return (
    <section className="rounded-[2rem] border-4 border-ink bg-white p-4 shadow-brutal md:p-6">
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">AI Creative Studio</p>
          <h1 className="font-display text-6xl uppercase leading-none text-stallRed md:text-8xl">Campaign Builder</h1>
          <p className="mt-2 max-w-3xl text-lg font-bold">Guided AI agency workflow for real graphic ad generation, multi-size output, preview editing, campaign history, and one-click publishing to Stall Talk ad slots.</p>
        </div>
        <div className="rounded-2xl border-4 border-ink bg-paper p-4">
          <p className="text-xs font-black uppercase tracking-widest text-stallRed">Publish Target</p>
          <select className="mt-2 w-full rounded-xl border-2 border-ink p-2 font-bold" value={form.issueId} onChange={(event) => update("issueId", event.target.value)}>
            {issues.map((issue) => <option key={issue.id} value={issue.id}>{issue.title} • {issue.venueName}</option>)}
          </select>
          <select className="mt-2 w-full rounded-xl border-2 border-ink p-2 font-bold" value={slotNumber} onChange={(event) => setSlotNumber(event.target.value)}>
            {Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Slot {index + 1}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-6 grid gap-2 md:grid-cols-5">
        {["Business", "Offer", "Audience", "Creative", "Generate"].map((label, index) => (
          <button key={label} className={`rounded-xl border-2 border-ink px-3 py-2 text-sm font-black uppercase ${step === index + 1 ? "bg-stallYellow" : "bg-paper"}`} onClick={() => setStep(index + 1)}>{index + 1}. {label}</button>
        ))}
      </div>

      {step === 1 ? <div className="grid gap-4 md:grid-cols-2">
        <Field label="Business Name" value={form.businessName} onChange={(value) => update("businessName", value)} />
        <Field label="Category" value={form.category} onChange={(value) => update("category", value)} placeholder="Restaurant, bar, attraction..." />
        <Field label="Website" value={form.website} onChange={(value) => update("website", value)} />
        <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} />
        <label className="rounded-2xl border-2 border-ink bg-paper p-4 font-black uppercase md:col-span-2">Logo Upload<span className="mt-2 block text-sm normal-case text-ink/70">Stored client-side for now; use the logo name as brand context.</span><input className="mt-3 w-full" type="file" accept="image/*" onChange={(event) => update("logoName", event.target.files?.[0]?.name || "")} /></label>
      </div> : null}

      {step === 2 ? <div className="grid gap-4 md:grid-cols-2">
        <Field label="Offer" value={form.offer} onChange={(value) => update("offer", value)} placeholder="15% OFF, free appetizer..." />
        <Field label="Coupon Code" value={form.couponCode} onChange={(value) => update("couponCode", value)} />
        <Field label="CTA Button Text" value={form.ctaText} onChange={(value) => update("ctaText", value)} />
        <Field label="Expiration Date" value={form.expirationDate} onChange={(value) => update("expirationDate", value)} type="date" />
      </div> : null}

      {step === 3 ? <div className="grid gap-3 md:grid-cols-3">
        {audienceOptions.map((option) => <button key={option} className={`rounded-2xl border-2 border-ink p-4 font-black uppercase ${form.audience === option ? "bg-stallYellow" : "bg-paper"}`} onClick={() => update("audience", option)}>{option}</button>)}
        {form.audience === "Custom Audience" ? <div className="md:col-span-3"><Field label="Custom Audience" value={form.customAudience} onChange={(value) => update("customAudience", value)} /></div> : null}
      </div> : null}

      {step === 4 ? <div className="grid gap-6 lg:grid-cols-2">
        <ChoiceGroup title="Tone" options={tones} value={form.tone} onChange={(value) => update("tone", value)} />
        <ChoiceGroup title="Visual Style" options={visualStyles} value={form.visualStyle} onChange={(value) => update("visualStyle", value)} />
        <div className="lg:col-span-2"><Field label="Brand Colors" value={form.brandColors} onChange={(value) => update("brandColors", value)} placeholder="#ff2d55, #ffd400, #5b2cff" /></div>
      </div> : null}

      {step === 5 ? <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">{creatives.map((creative, index) => <button key={creative.adSize} className={`rounded-xl border-2 border-ink px-3 py-2 font-black uppercase ${selectedCreativeIndex === index ? "bg-stallYellow" : "bg-paper"}`} onClick={() => setSelectedCreativeIndex(index)}>{creative.adSize}</button>)}</div>
          {selectedCreative ? <PreviewCard creative={selectedCreative} /> : <p className="rounded-2xl border-2 border-dashed border-ink p-8 text-center font-black uppercase">Generate a campaign to preview Banner, Square, Tall, and Footer creatives.</p>}
          {error ? <p className="mt-3 rounded-xl border-2 border-stallRed bg-red-50 p-3 text-sm font-black text-stallRed">OpenAI fallback mode: {error}</p> : null}
        </div>
        <div className="rounded-2xl border-4 border-ink bg-paper p-4">
          <h3 className="font-display text-4xl uppercase">Edit Before Publish</h3>
          {selectedCreative ? <div className="mt-3 grid gap-3">
            <Field label="Headline" value={selectedCreative.headline} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, headline: value } : item))} />
            <Field label="Subheadline" value={selectedCreative.subheadline} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, subheadline: value } : item))} />
            <Field label="CTA" value={selectedCreative.ctaText} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, ctaText: value } : item))} />
            <Field label="Coupon" value={selectedCreative.couponCode} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, couponCode: value } : item))} />
            <button className="rounded-xl border-4 border-ink bg-stallRed px-4 py-3 font-black uppercase text-white shadow-brutal disabled:opacity-50" disabled={isPending} onClick={publish}>{isPending ? "Publishing..." : `Publish to Slot ${slotNumber}`}</button>
          </div> : null}
        </div>
      </div> : null}

      <div className="mt-6 flex flex-wrap justify-between gap-3 border-t-4 border-ink pt-4">
        <button className="rounded-xl border-2 border-ink bg-paper px-4 py-2 font-black uppercase" onClick={() => setStep(Math.max(1, step - 1))}>Back</button>
        {step < 5 ? <button className="rounded-xl border-2 border-ink bg-stallYellow px-4 py-2 font-black uppercase" onClick={() => setStep(Math.min(5, step + 1))}>Next</button> : null}
        <button className="rounded-xl border-4 border-ink bg-stallPurple px-5 py-3 font-black uppercase text-white shadow-brutal disabled:opacity-50" disabled={!canGenerate || isGenerating} onClick={generateCampaign}>{isGenerating ? "Generating 4 sizes..." : "Generate Campaign"}</button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <HistoryPanel title="Local AI Campaign History" items={history} onLoad={(item) => { setCreatives([item]); setSelectedCreativeIndex(0); setStep(5); }} />
        <div className="rounded-2xl border-4 border-ink bg-white p-4">
          <h3 className="font-display text-4xl uppercase">Published Ad History</h3>
          <div className="mt-3 grid gap-2">{recentCampaigns.map((item) => <article key={item.id} className="rounded-xl border-2 border-ink bg-paper p-3"><p className="text-xs font-black uppercase text-stallRed">{new Date(item.createdAt).toLocaleDateString()}</p><h4 className="font-black uppercase">{item.businessName}</h4><p className="text-sm font-bold">{item.title}</p><p className="text-xs font-black uppercase text-stallPurple">{item.ctaText} {item.couponCode ? `• ${item.couponCode}` : ""}</p></article>)}</div>
        </div>
      </div>

      <p className="mt-6 text-sm font-bold text-ink/70">Default venue context: {activeVenue ? `${activeVenue.name}, ${activeVenue.city}` : "Add venues to target campaigns."} Restroom options loaded: {restrooms.length}. Publisher: {publishers.find((publisher) => publisher.id === form.publisherId)?.name || "None"}. Advertiser: {advertisers.find((advertiser) => advertiser.id === form.advertiserId)?.name || "None"}.</p>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="block font-black uppercase">{label}<input className="mt-2 w-full rounded-xl border-2 border-ink bg-white p-3 font-bold normal-case" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ChoiceGroup({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <div><h3 className="mb-2 font-display text-4xl uppercase">{title}</h3><div className="grid gap-2 sm:grid-cols-2">{options.map((option) => <button key={option} className={`rounded-2xl border-2 border-ink p-3 font-black uppercase ${value === option ? "bg-stallYellow" : "bg-paper"}`} onClick={() => onChange(option)}>{option}</button>)}</div></div>;
}

function PreviewCard({ creative }: { creative: GeneratedCreative }) {
  return <article className="rounded-[2rem] border-4 border-ink bg-white p-4 shadow-brutal"><div className={`${sizes[creative.adSize].className} overflow-hidden rounded-2xl border-4 border-ink bg-ink`}><img className="h-full w-full object-cover" src={creative.imageUrl} alt={`${creative.adSize} generated ad`} /></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div><p className="text-xs font-black uppercase text-stallPurple">Headline</p><h3 className="font-display text-4xl uppercase">{creative.headline}</h3><p className="mt-2 font-bold">{creative.subheadline}</p><p className="mt-2 font-black uppercase text-stallRed">{creative.ctaText} • {creative.couponCode}</p></div><div className="rounded-xl border-2 border-ink bg-paper p-3"><p className="text-xs font-black uppercase tracking-widest text-stallRed">Prompt used</p><p className="mt-2 max-h-44 overflow-y-auto text-sm font-bold">{creative.promptUsed}</p>{creative.fallback ? <p className="mt-2 text-xs font-black uppercase text-stallRed">Fallback HTML/CSS mock advertisement</p> : null}</div></div></article>;
}

function HistoryPanel({ title, items, onLoad }: { title: string; items: CampaignHistoryItem[]; onLoad: (item: CampaignHistoryItem) => void }) {
  return <div className="rounded-2xl border-4 border-ink bg-white p-4"><h3 className="font-display text-4xl uppercase">{title}</h3><div className="mt-3 grid gap-2">{items.length ? items.map((item) => <button key={item.campaignId} className="rounded-xl border-2 border-ink bg-paper p-3 text-left" onClick={() => onLoad(item)}><p className="text-xs font-black uppercase text-stallRed">{new Date(item.createdAt).toLocaleString()} • {item.adSize}</p><h4 className="font-black uppercase">{item.businessName}</h4><p className="text-sm font-bold">{item.headline}</p></button>) : <p className="rounded-xl border-2 border-dashed border-ink p-4 font-bold">No local campaigns yet.</p>}</div></div>;
}
