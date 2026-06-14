"use client";

import { useEffect, useState, useTransition } from "react";

type PublisherOption = { id: string; name: string };
type AdvertiserOption = { id: string; name: string };
type VenueOption = { id: string; name: string; city: string; state: string };
type RestroomOption = { id: string; name: string; venueName: string };
type IssueOption = { id: string; title: string; venueName: string; status: string };
type RecentCampaign = { id: string; businessName: string; title: string; offer: string; ctaText: string; couponCode: string | null; createdAt: string };
type SavedCampaign = { campaignId: string; businessName: string; headline: string; subheadline: string; ctaText: string; couponCode: string; adSize: "Mobile Sponsor Card"; imageUrl: string; promptUsed: string; createdAt: string; slotPublished?: number | null; selectedSlot?: number | null; targetUrl?: string | null; logoBase64?: string | null; publishStatus?: string | null };

type Props = {
  createAd: (formData: FormData) => void | Promise<void>;
  publishers: PublisherOption[];
  advertisers: AdvertiserOption[];
  venues: VenueOption[];
  restrooms: RestroomOption[];
  issues: IssueOption[];
  recentCampaigns: RecentCampaign[];
  savedCampaigns: SavedCampaign[];
};

type AdSize = "Mobile Sponsor Card";
type GeneratedCreative = {
  adSize: "Mobile Sponsor Card";
  imageUrl: string;
  promptUsed: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  couponCode: string;
  businessName?: string;
  model?: string;
  diagnostic?: ApiDiagnostic;
  campaignId?: string;
  historySaved?: boolean;
  historyError?: string;
  imageFallback?: boolean;
  imageError?: string;
  targetUrl?: string | null;
  selectedSlot?: number | null;
};

type CampaignHistoryItem = GeneratedCreative & { campaignId: string; businessName: string; createdAt: string; slotPublished?: number | null };

const audienceOptions = ["Tourists", "Locals", "Casino Guests", "Sports Fans", "Concert Goers", "Convention Attendees", "Custom Audience"];
const tones = ["Funny", "Luxury", "Professional", "Urgent", "Family Friendly", "Nightlife"];
const visualStyles = ["Vegas Neon", "Casino Luxury", "Sports Bar", "Restaurant", "Event Promotion", "Concert", "Modern Minimal"];
const MOBILE_SPONSOR_CARD: AdSize = "Mobile Sponsor Card";
const sizes: Record<AdSize, { label: string; className: string }> = {
  [MOBILE_SPONSOR_CARD]: { label: MOBILE_SPONSOR_CARD, className: "aspect-square" }
};

function safe(value: string | undefined, fallback: string) {
  return (value || "").trim() || fallback;
}

function limitText(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function shortenLabel(value: string, max = 28) {
  const normalized = safe(value, "").replace(/\s+/g, " ");
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trim()}…`;
}

type ApiDiagnostic = {
  apiStatus?: string;
  openAiStatus?: string;
  model?: string;
  errorType?: string;
  error?: string;
  openAiStatusCode?: number;
  requestId?: string | null;
  rateLimited?: boolean;
};

function diagnosticMessage(data: { error?: string; diagnostic?: ApiDiagnostic }) {
  const diagnostic = data.diagnostic;
  return [
    data.error ? `Error: ${data.error}` : "Image generation failed.",
    diagnostic?.apiStatus ? `API: ${diagnostic.apiStatus}` : "",
    diagnostic?.openAiStatus ? `OpenAI: ${diagnostic.openAiStatus}` : "",
    diagnostic?.model ? `Model: ${diagnostic.model}` : "",
    diagnostic?.errorType ? `Type: ${diagnostic.errorType}` : "",
    diagnostic?.openAiStatusCode ? `HTTP: ${diagnostic.openAiStatusCode}` : "",
    diagnostic?.requestId ? `Request ID: ${diagnostic.requestId}` : "",
    diagnostic?.rateLimited ? "Rate limited: yes" : ""
  ].filter(Boolean).join(" • ");
}

export function AdStudioAgency({ createAd, publishers, advertisers, venues, restrooms, issues, recentCampaigns, savedCampaigns }: Props) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState<ApiDiagnostic | null>(null);
  const [selectedCreativeIndex, setSelectedCreativeIndex] = useState(0);
  const [slotNumber, setSlotNumber] = useState("1");
  const [history, setHistory] = useState<CampaignHistoryItem[]>([]);
  const [creatives, setCreatives] = useState<GeneratedCreative[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    category: "",
    website: "",
    phone: "",
    logoName: "",
    logoBase64: "",
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
    setHistory(savedCampaigns.map((item) => ({ ...item, businessName: item.businessName, imageUrl: item.imageUrl || "", promptUsed: item.promptUsed || "", headline: item.headline || "", subheadline: item.subheadline || "", ctaText: item.ctaText || "Claim Offer", couponCode: item.couponCode || "", adSize: MOBILE_SPONSOR_CARD, createdAt: item.createdAt })));
  }, [savedCampaigns]);

  const selectedCreative = creatives[selectedCreativeIndex];
  const activeAudience = form.audience === "Custom Audience" ? safe(form.customAudience, "custom audience") : form.audience;
  const activeVenue = venues[0];

  function readLogo(file: File | undefined) {
    if (!file) {
      update("logoName", "");
      update("logoBase64", "");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, logoName: file.name, logoBase64: String(reader.result || "") }));
    reader.onerror = () => setError("Unable to read uploaded logo.");
    reader.readAsDataURL(file);
  }

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function overlayLogoOnImage(imageUrl: string) {
    if (!form.logoBase64 || !imageUrl) return imageUrl;
    const [baseImage, logoImage] = await Promise.all([loadCanvasImage(imageUrl), loadCanvasImage(form.logoBase64)]);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) return imageUrl;
    const scale = Math.max(canvas.width / baseImage.width, canvas.height / baseImage.height);
    const drawnWidth = baseImage.width * scale;
    const drawnHeight = baseImage.height * scale;
    context.drawImage(baseImage, (canvas.width - drawnWidth) / 2, (canvas.height - drawnHeight) / 2, drawnWidth, drawnHeight);
    const logoMaxWidth = canvas.width * 0.34;
    const logoMaxHeight = canvas.height * 0.16;
    const logoScale = Math.min(logoMaxWidth / logoImage.width, logoMaxHeight / logoImage.height, 1);
    const logoWidth = logoImage.width * logoScale;
    const logoHeight = logoImage.height * logoScale;
    const padding = 42;
    context.fillStyle = "rgba(255,255,255,.92)";
    roundRect(context, padding - 14, padding - 14, logoWidth + 28, logoHeight + 28, 22);
    context.fill();
    context.drawImage(logoImage, padding, padding, logoWidth, logoHeight);
    return canvas.toDataURL("image/png");
  }

  function fallbackCreative(adSize: AdSize, message: string, data?: Partial<GeneratedCreative>): GeneratedCreative {
    const headline = limitText(safe(data?.headline || form.offer, "Limited-Time Offer"), 34);
    return {
      adSize,
      imageUrl: "",
      promptUsed: data?.promptUsed || `Fallback styled ad card for ${safe(form.businessName, "Your Business")} using creative brief: ${safe(form.offer, "Limited-time offer")}.`,
      headline,
      subheadline: limitText(safe(data?.subheadline || `For ${activeAudience}`, "For nearby customers"), 46),
      ctaText: limitText(safe(data?.ctaText || form.ctaText, "Claim Offer"), 18),
      couponCode: limitText(safe(data?.couponCode || form.couponCode, ""), 16),
      businessName: safe(data?.businessName || form.businessName, "Your Business"),
      model: data?.model,
      diagnostic: data?.diagnostic,
      campaignId: data?.campaignId,
      historySaved: data?.historySaved,
      historyError: data?.historyError,
      imageFallback: true,
      imageError: message
    };
  }

  async function generateCampaign() {
    if (!canGenerate) return;
    setIsGenerating(true);
    setHasGenerated(false);
    setError("");
    const campaignBatchId = crypto.randomUUID();
    const adSize = MOBILE_SPONSOR_CARD;
    const base = { ...form, audience: activeAudience, campaignId: campaignBatchId, adSize, slot: Number(slotNumber) };
    const generated: GeneratedCreative[] = [];

    try {
        const response = await fetch("/api/generate-ad-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(base)
        });
        const raw = await response.text();
        let data;
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch (parseError) {
          const message = parseError instanceof Error ? parseError.message : "Invalid API JSON response.";
          throw new Error(`API JSON parse error: ${message}`);
        }
        setApiStatus(data.diagnostic || { apiStatus: response.ok ? "ok" : "failed", model: data.model });
        if (!response.ok || data.error) {
          const message = diagnosticMessage(data);
          generated.push(fallbackCreative(adSize, message, data));
          if (!error) setError(`Image generation fallback active. ${message}`);
        } else {
          generated.push({
          adSize,
          imageUrl: await overlayLogoOnImage(data.imageUrl),
          promptUsed: data.promptUsed,
          headline: data.headline,
          subheadline: data.subheadline,
          ctaText: data.ctaText,
          couponCode: data.couponCode,
          businessName: data.businessName,
          model: data.model,
          diagnostic: data.diagnostic,
          campaignId: data.campaignId,
          historySaved: data.historySaved,
          historyError: data.historyError,
          targetUrl: form.website || null,
          selectedSlot: Number(slotNumber)
          });
        }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Image generation failed.";
      generated.push(fallbackCreative(adSize, message));
      setError(`Image generation fallback active. ${message}`);
    }

    const nextHistory = generated.map((creative) => ({ ...creative, campaignId: creative.campaignId || campaignBatchId, businessName: safe(form.businessName, "Your Business"), createdAt: new Date().toISOString(), targetUrl: form.website || null, selectedSlot: Number(slotNumber) }));
    const mergedHistory = [...nextHistory, ...history].slice(0, 12);
    setCreatives(generated);
    setSelectedCreativeIndex(0);
    setHasGenerated(true);
    setHistory(mergedHistory);
    window.localStorage.setItem("stalltalk-ad-studio-history", JSON.stringify(mergedHistory));
    setStep(5);
    setIsGenerating(false);
  }

  function publish() {
    if (!selectedCreative) return;
    const formData = new FormData();
    const campaignId = selectedCreative.campaignId || crypto.randomUUID();
    formData.set("campaignId", campaignId);
    formData.set("publisherId", form.publisherId);
    formData.set("advertiserId", form.advertiserId);
    formData.set("businessName", safe(form.businessName, "Your Business"));
    formData.set("title", selectedCreative.headline);
    formData.set("offer", selectedCreative.subheadline);
    formData.set("artworkUrl", selectedCreative.imageUrl);
    formData.set("creativeType", "IMAGE");
    formData.set("htmlCreative", "");
    formData.set("promptUsed", selectedCreative.promptUsed);
    formData.set("generatedHeadline", selectedCreative.headline);
    formData.set("generatedSubheadline", selectedCreative.subheadline);
    formData.set("adSize", MOBILE_SPONSOR_CARD);
    formData.set("ctaText", selectedCreative.ctaText);
    formData.set("targetUrl", form.website || "#");
    formData.set("phone", form.phone);
    formData.set("logoBase64", form.logoBase64);
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

  const missingRequired = [
    form.businessName.trim() ? "" : "business name",
    form.offer.trim() ? "" : "offer",
    form.audience === "Custom Audience" && !form.customAudience.trim() ? "custom audience" : ""
  ].filter(Boolean);
  const canGenerate = missingRequired.length === 0;
  const generateButtonLabel = isGenerating
    ? "Generating AI Campaign…"
    : !canGenerate
      ? `Missing ${missingRequired.join(", ")}`
      : hasGenerated
        ? selectedCreative
          ? "Generated — Publish Ready"
          : "Generated"
        : "Generate Campaign";

  return (
    <section className="rounded-[2rem] border-4 border-ink bg-white p-4 shadow-brutal md:p-6">
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">AI Creative Studio</p>
          <h1 className="font-display text-6xl uppercase leading-none text-stallRed md:text-8xl">Campaign Builder</h1>
          <p className="mt-2 max-w-3xl text-lg font-bold">AI ad generator from a creative brief: enter business info, offer, audience, and creative direction, then generate ad copy plus a graphic through the existing /api/generate-ad-image route before publishing to a Stall Talk ad slot.</p>
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
        <Field label="Advertiser Website URL" value={form.website} onChange={(value) => update("website", value)} type="url" placeholder="https://example.com" />
        <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} />
        <label className="rounded-2xl border-2 border-ink bg-paper p-4 font-black uppercase md:col-span-2">Logo Upload<span className="mt-2 block text-sm normal-case text-ink/70">Persisted with the generated campaign and overlaid onto the final image before publishing.</span><input className="mt-3 w-full" type="file" accept="image/*" onChange={(event) => readLogo(event.target.files?.[0])} /></label>
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
        <div className="lg:col-span-2 rounded-2xl border-2 border-ink bg-stallYellow p-4 font-black uppercase">
          <span>Button state: </span>{isGenerating ? "generating" : !canGenerate ? `missing required fields (${missingRequired.join(", ")})` : selectedCreative ? "publish ready" : hasGenerated ? "generated" : "ready to generate"}
        </div>
        <div>
          <div className="mb-3 flex flex-wrap gap-2">{creatives.map((creative, index) => <button key={creative.adSize} className={`rounded-xl border-2 border-ink px-3 py-2 font-black uppercase ${selectedCreativeIndex === index ? "bg-stallYellow" : "bg-paper"}`} onClick={() => setSelectedCreativeIndex(index)}>{creative.adSize}</button>)}</div>
          {selectedCreative ? <PreviewCard creative={selectedCreative} /> : <p className="rounded-2xl border-2 border-dashed border-ink p-8 text-center font-black uppercase">Generate one locked Mobile Sponsor Card image.</p>}
          {apiStatus ? <StatusPanel diagnostic={apiStatus} /> : null}
          {error ? <p className="mt-3 rounded-xl border-2 border-stallRed bg-red-50 p-3 text-sm font-black text-stallRed">{error} Copy was still generated and a styled fallback ad preview is available.</p> : null}
        </div>
        <div className="rounded-2xl border-4 border-ink bg-paper p-4">
          <h3 className="font-display text-4xl uppercase">Edit Before Publish</h3>
          {selectedCreative ? <div className="mt-3 grid gap-3">
            <Field label="Headline" value={selectedCreative.headline} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, headline: value } : item))} />
            <Field label="Subheadline" value={selectedCreative.subheadline} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, subheadline: value } : item))} />
            <Field label="CTA" value={selectedCreative.ctaText} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, ctaText: value } : item))} />
            <Field label="Coupon" value={selectedCreative.couponCode} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, couponCode: value } : item))} />
            {!form.website.trim() ? <p className="rounded-xl border-2 border-stallRed bg-red-50 p-3 text-sm font-black uppercase text-stallRed">Admin warning: no advertiser website URL entered. The published image will render without a click link.</p> : null}
            <button className="rounded-xl border-4 border-ink bg-stallRed px-4 py-3 font-black uppercase text-white shadow-brutal disabled:opacity-50" disabled={isPending} onClick={publish}>{isPending ? "Publishing..." : `Publish to Slot ${slotNumber}`}</button>
          </div> : null}
        </div>
      </div> : null}

      <div className="mt-6 flex flex-wrap justify-between gap-3 border-t-4 border-ink pt-4">
        <button className="rounded-xl border-2 border-ink bg-paper px-4 py-2 font-black uppercase" onClick={() => setStep(Math.max(1, step - 1))}>Back</button>
        {step < 5 ? <button className="rounded-xl border-2 border-ink bg-stallYellow px-4 py-2 font-black uppercase" onClick={() => setStep(Math.min(5, step + 1))}>Next</button> : null}
        <button title={!canGenerate ? `Complete required fields: ${missingRequired.join(", ")}` : selectedCreative ? "Campaign generated and ready to publish" : "Generate AI ad copy and image creative"} className={`rounded-xl border-4 border-ink px-5 py-3 font-black uppercase text-white shadow-brutal disabled:cursor-not-allowed disabled:opacity-60 ${selectedCreative ? "bg-green-700" : !canGenerate ? "bg-stallPurple/70" : "bg-stallPurple"}`} disabled={!canGenerate || isGenerating} onClick={generateCampaign}>{generateButtonLabel}</button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <HistoryPanel title="Database Campaign History" items={history} onLoad={(item) => { setCreatives([item]); setSelectedCreativeIndex(0); if (item.selectedSlot) setSlotNumber(String(item.selectedSlot)); if (item.targetUrl) update("website", item.targetUrl); setStep(5); }} />
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

function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load generated image or uploaded logo for compositing."));
    image.src = src;
  });
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function PreviewCard({ creative }: { creative: GeneratedCreative }) {
  return <article className="rounded-[2rem] border-4 border-ink bg-white p-4 shadow-brutal"><div className={`${sizes[creative.adSize].className} overflow-hidden rounded-2xl border-4 border-ink bg-ink`}>{creative.imageUrl ? <img className="h-full w-full object-cover" src={creative.imageUrl} alt={`${creative.adSize} generated ad`} /> : <FallbackAd creative={creative} />}</div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="min-w-0"><p className="truncate text-xs font-black uppercase text-stallPurple">Business: {shortenLabel(creative.businessName || "Generated Sponsor", 30)}</p><h3 className="break-words font-display text-3xl uppercase leading-none md:text-4xl">{shortenLabel(creative.headline, 38)}</h3><p className="mt-2 break-words font-bold">{shortenLabel(creative.subheadline, 58)}</p><p className="mt-2 break-words font-black uppercase text-stallRed">{shortenLabel(creative.ctaText, 20)} • {shortenLabel(creative.couponCode, 18)}</p>{creative.imageFallback ? <p className="mt-2 text-xs font-black uppercase text-stallPurple">Styled fallback preview: {creative.imageError}</p> : null}{creative.historySaved === false ? <p className="mt-2 text-xs font-black uppercase text-stallRed">History save failed: {creative.historyError}</p> : null}</div><div className="rounded-xl border-2 border-ink bg-paper p-3"><p className="text-xs font-black uppercase tracking-widest text-stallRed">Prompt used</p><p className="mt-2 max-h-44 overflow-y-auto break-words text-sm font-bold">{creative.promptUsed}</p><p className="mt-2 text-xs font-black uppercase text-stallPurple">Model: {creative.model || creative.diagnostic?.model || "configured server model"}</p></div></div></article>;
}

function FallbackAd({ creative }: { creative: GeneratedCreative }) {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(255,216,76,.95),transparent_28%),linear-gradient(135deg,#13091f_0%,#33206f_48%,#0f5a78_100%)] p-8 text-white">
      <div className="absolute inset-5 rounded-[2rem] border border-white/25" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black uppercase tracking-wide text-ink shadow-brutal">Logo</div>
        <span className="rounded-full border border-white/40 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.22em]">Fallback Preview</span>
      </div>
      <div className="relative max-w-[78%]">
        <p className="mb-3 text-sm font-black uppercase tracking-[.25em] text-stallYellow">{creative.businessName || "Generated Sponsor"}</p>
        <h3 className="font-display text-5xl uppercase leading-[.86] drop-shadow md:text-7xl">{creative.headline}</h3>
        <p className="mt-4 rounded-2xl bg-white/15 p-3 text-xl font-black leading-tight backdrop-blur">{creative.subheadline}</p>
      </div>
      <div className="relative flex flex-wrap items-center gap-3">
        {creative.couponCode ? <span className="rounded-full border-2 border-dashed border-white bg-white px-5 py-3 text-sm font-black uppercase text-stallRed shadow-brutal">Code {creative.couponCode}</span> : null}
        <span className="rounded-full bg-stallYellow px-6 py-3 text-sm font-black uppercase text-ink shadow-brutal">{creative.ctaText}</span>
      </div>
    </div>
  );
}

function StatusPanel({ diagnostic }: { diagnostic: ApiDiagnostic }) {
  return <div className="mt-3 grid gap-2 rounded-xl border-2 border-ink bg-paper p-3 text-xs font-black uppercase md:grid-cols-4"><span>API: {diagnostic.apiStatus || "unknown"}</span><span>OpenAI: {diagnostic.openAiStatus || "unknown"}</span><span>Model: {diagnostic.model || "server default"}</span><span>{diagnostic.errorType ? `Error: ${diagnostic.errorType}` : "Image API ready"}</span></div>;
}

function HistoryPanel({ title, items, onLoad }: { title: string; items: CampaignHistoryItem[]; onLoad: (item: CampaignHistoryItem) => void }) {
  return <div className="rounded-2xl border-4 border-ink bg-white p-4"><h3 className="font-display text-4xl uppercase">{title}</h3><div className="mt-3 grid gap-2">{items.length ? items.map((item) => <button key={item.campaignId} className="rounded-xl border-2 border-ink bg-paper p-3 text-left" onClick={() => onLoad(item)}><p className="text-xs font-black uppercase text-stallRed">{new Date(item.createdAt).toLocaleString()} • {item.adSize}</p><h4 className="font-black uppercase">{item.businessName}</h4><p className="text-sm font-bold">{item.headline}</p><span className="mt-2 inline-block rounded-full bg-ink px-3 py-1 text-xs font-black uppercase text-white">Use Again / Republish</span></button>) : <p className="rounded-xl border-2 border-dashed border-ink p-4 font-bold">No saved database campaigns yet.</p>}</div></div>;
}
