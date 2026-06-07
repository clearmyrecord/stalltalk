"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

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

type AdSize = "Potty Favor Slot" | "Banner" | "Square" | "Tall" | "Footer";
type CreativeStatus = "draft" | "winner" | "published";
type GeneratedCreative = {
  adSize: AdSize;
  imageUrl: string;
  promptUsed: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  couponCode: string;
  businessName?: string;
  conceptLabel?: string;
  contactInfo?: string;
  logoInstruction?: string;
  model?: string;
  diagnostic?: ApiDiagnostic;
  campaignId?: string;
  historySaved?: boolean;
  historyError?: string;
  status?: CreativeStatus;
};

type CampaignHistoryItem = GeneratedCreative & { campaignId: string; businessName: string; createdAt: string; slotPublished?: number };

type IndustryTemplate = {
  category: string;
  headlineHint: string;
  offer: string;
  ctaText: string;
  couponCode: string;
  audience: string;
  tone: string;
  visualStyle: string;
  scanGoal: string;
};

const audienceOptions = ["Tourists", "Locals", "Casino Guests", "Sports Fans", "Concert Goers", "Convention Attendees", "Custom Audience"];
const tones = ["Funny", "Luxury", "Professional", "Urgent", "Family Friendly", "Nightlife"];
const visualStyles = ["Magazine Ad", "Vegas Neon", "Casino Luxury", "Sports Bar", "Restaurant", "Event Promotion", "Concert", "Modern Minimal"];
const stepLabels = ["Business", "Offer", "Audience", "Agency", "Generate"];
const sizes: Record<AdSize, { label: string; className: string; dimensions: string; note: string }> = {
  "Potty Favor Slot": { label: "Potty Favor Slot", className: "aspect-[4/3]", dimensions: "4:3 safe crop • 1024×768 art direction", note: "Primary publication slot shown to restroom readers." },
  Banner: { label: "Banner", className: "aspect-[16/5]", dimensions: "16:5 safe crop", note: "Wide sponsor strip." },
  Square: { label: "Square", className: "aspect-square", dimensions: "1:1", note: "Social and issue-card reuse." },
  Tall: { label: "Tall", className: "aspect-[4/5]", dimensions: "4:5", note: "Vertical magazine/mobile placement." },
  Footer: { label: "Footer", className: "aspect-[5/1]", dimensions: "5:1 safe crop", note: "Slim footer sponsorship." }
};
const sizeOrder = Object.keys(sizes) as AdSize[];
const localHistoryKey = "stalltalk-ad-studio-history";

const industryTemplates: IndustryTemplate[] = [
  { category: "Restaurant", headlineHint: "Make the craving obvious in under 5 seconds.", offer: "Free appetizer with any entree", ctaText: "Show This Ad", couponCode: "BITE15", audience: "Tourists", tone: "Family Friendly", visualStyle: "Restaurant", scanGoal: "Hero food photo, huge offer, fast directions, coupon visible." },
  { category: "Casino", headlineHint: "Sell excitement, rewards, and VIP energy without clutter.", offer: "$25 free play for new rewards members", ctaText: "Join Rewards", couponCode: "LUCKY25", audience: "Casino Guests", tone: "Luxury", visualStyle: "Casino Luxury", scanGoal: "Premium gaming atmosphere, jackpot energy, legally-safe offer framing." },
  { category: "Home Services", headlineHint: "Lead with trust, speed, and the exact problem solved.", offer: "$49 same-day service call", ctaText: "Call Now", couponCode: "FIX49", audience: "Locals", tone: "Professional", visualStyle: "Modern Minimal", scanGoal: "Clear service category, phone number, trust cues, emergency readability." },
  { category: "Event", headlineHint: "Turn the date, act, or occasion into the main memory hook.", offer: "2-for-1 tickets this weekend", ctaText: "Get Tickets", couponCode: "GO2FOR1", audience: "Concert Goers", tone: "Nightlife", visualStyle: "Event Promotion", scanGoal: "Date/time prominence, venue cue, high-energy magazine poster look." },
  { category: "Retail", headlineHint: "Make the discount and product category impossible to miss.", offer: "20% off one item today", ctaText: "Shop Today", couponCode: "SAVE20", audience: "Locals", tone: "Urgent", visualStyle: "Magazine Ad", scanGoal: "Sale badge, product lifestyle image, short urgency line, coupon block." },
  { category: "Transportation", headlineHint: "Promise convenience, reliability, and immediate booking.", offer: "$10 off airport rides", ctaText: "Book Ride", couponCode: "RIDE10", audience: "Tourists", tone: "Professional", visualStyle: "Modern Minimal", scanGoal: "Vehicle/route visual, phone or URL, easy booking CTA, trust cue." }
];

function safe(value: string, fallback: string) {
  return value.trim() || fallback;
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

export function AdStudioAgency({ createAd, publishers, advertisers, venues, restrooms, issues, recentCampaigns }: Props) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLabel, setGenerationLabel] = useState("");
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState<ApiDiagnostic | null>(null);
  const [selectedCreativeIndex, setSelectedCreativeIndex] = useState(0);
  const [slotNumber, setSlotNumber] = useState("1");
  const [history, setHistory] = useState<CampaignHistoryItem[]>([]);
  const [creatives, setCreatives] = useState<GeneratedCreative[]>([]);
  const [form, setForm] = useState({
    businessName: "",
    category: "Restaurant",
    website: "",
    phone: "",
    logoName: "",
    offer: "Free appetizer with any entree",
    couponCode: "BITE15",
    ctaText: "Show This Ad",
    expirationDate: "",
    headlineHint: "Make the craving obvious in under 5 seconds.",
    scanGoal: "Hero food photo, huge offer, fast directions, coupon visible.",
    audience: "Tourists",
    customAudience: "",
    tone: "Family Friendly",
    visualStyle: "Restaurant",
    brandColors: "#ff2d55, #ffd400, #5b2cff",
    publisherId: publishers[0]?.id ?? "",
    advertiserId: advertisers[0]?.id ?? "",
    issueId: issues[0]?.id ?? "",
    scope: "GLOBAL"
  });

  useEffect(() => {
    const raw = window.localStorage.getItem(localHistoryKey) || window.localStorage.getItem("stalltalk-ai-creative-history");
    if (!raw) return;
    try {
      setHistory(JSON.parse(raw) as CampaignHistoryItem[]);
    } catch {
      window.localStorage.removeItem(localHistoryKey);
    }
  }, []);

  const selectedCreative = creatives[selectedCreativeIndex];
  const activeAudience = form.audience === "Custom Audience" ? safe(form.customAudience, "custom audience") : form.audience;
  const activeVenue = venues[0];
  const activeTemplate = useMemo(() => industryTemplates.find((template) => template.category === form.category) || industryTemplates[0], [form.category]);
  const canGenerate = form.businessName.trim() && form.offer.trim();

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyTemplate(template: IndustryTemplate) {
    setForm((current) => ({
      ...current,
      category: template.category,
      offer: template.offer,
      couponCode: template.couponCode,
      ctaText: template.ctaText,
      audience: template.audience,
      tone: template.tone,
      visualStyle: template.visualStyle,
      headlineHint: template.headlineHint,
      scanGoal: template.scanGoal
    }));
  }

  function persistHistory(items: GeneratedCreative[], status: CreativeStatus = "draft") {
    const nextHistory = items.map((creative) => ({
      ...creative,
      status: creative.status || status,
      campaignId: creative.campaignId || crypto.randomUUID(),
      businessName: safe(form.businessName, "Your Business"),
      createdAt: new Date().toISOString()
    }));
    const mergedHistory = [...nextHistory, ...history].slice(0, 24);
    setHistory(mergedHistory);
    window.localStorage.setItem(localHistoryKey, JSON.stringify(mergedHistory));
  }

  async function generateOne(base: Record<string, string | number>, adSize: AdSize, conceptNumber: number, conceptCount: number) {
    const response = await fetch("/api/generate-ad-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...base, adSize, conceptNumber, conceptCount })
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
    if (!response.ok || data.error) throw new Error(diagnosticMessage(data));
    return {
      adSize,
      imageUrl: data.imageUrl,
      promptUsed: data.promptUsed,
      headline: data.headline,
      subheadline: data.subheadline,
      ctaText: data.ctaText,
      couponCode: data.couponCode,
      businessName: data.businessName,
      conceptLabel: data.conceptLabel,
      contactInfo: data.contactInfo,
      logoInstruction: data.logoInstruction,
      model: data.model,
      diagnostic: data.diagnostic,
      campaignId: data.campaignId,
      historySaved: data.historySaved,
      historyError: data.historyError,
      status: "draft" as CreativeStatus
    };
  }

  async function generateCreativeSet(mode: "campaign" | "concepts" | "variation") {
    if (!canGenerate) return;
    setIsGenerating(true);
    setGenerationLabel(mode === "concepts" ? "Generating 3 agency concepts..." : mode === "variation" ? "Regenerating variation..." : "Generating Potty Favor slot campaign...");
    setError("");
    const campaignBatchId = crypto.randomUUID();
    const selectedSize = selectedCreative?.adSize || "Potty Favor Slot";
    const adSizes = mode === "campaign" ? sizeOrder : [selectedSize];
    const conceptCount = mode === "concepts" ? 3 : 1;
    const base = {
      ...form,
      audience: activeAudience,
      campaignId: campaignBatchId,
      contactInfo: [form.phone, form.website].filter(Boolean).join(" • "),
      logoInstruction: form.logoName ? `Use a clean logo area labeled ${form.logoName.replace(/\.[^.]+$/, "")}.` : `Reserve a clean logo area for ${safe(form.businessName, "the brand")} logo.`,
      templateScanGoal: activeTemplate.scanGoal,
      requestMode: mode,
      variationOf: mode === "variation" ? selectedCreative?.campaignId || selectedCreative?.conceptLabel || "current creative" : ""
    };
    const generated: GeneratedCreative[] = [];

    try {
      for (let conceptNumber = 1; conceptNumber <= conceptCount; conceptNumber += 1) {
        for (const adSize of adSizes) {
          const creative = await generateOne(base, adSize, conceptNumber, conceptCount);
          generated.push(creative);
          setCreatives(mode === "variation" ? [...creatives, ...generated] : [...generated]);
        }
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Image generation failed.";
      setError(message);
      if (generated.length) {
        setCreatives(mode === "variation" ? [...creatives, ...generated] : generated);
        persistHistory(generated);
      }
      setSelectedCreativeIndex(0);
      setStep(5);
      setIsGenerating(false);
      setGenerationLabel("");
      return;
    }

    const nextCreatives = mode === "variation" ? [...creatives, ...generated] : generated;
    setCreatives(nextCreatives);
    setSelectedCreativeIndex(mode === "variation" ? nextCreatives.length - generated.length : 0);
    persistHistory(generated);
    setStep(5);
    setIsGenerating(false);
    setGenerationLabel("");
  }

  function markWinner() {
    if (!selectedCreative) return;
    const nextCreatives = creatives.map((creative, index) => ({ ...creative, status: index === selectedCreativeIndex ? "winner" : creative.status === "winner" ? "draft" : creative.status } as GeneratedCreative));
    setCreatives(nextCreatives);
    const winner = nextCreatives[selectedCreativeIndex];
    const nextHistory = history.map((item) => item.campaignId === winner.campaignId ? { ...item, status: "winner" as CreativeStatus } : item);
    setHistory(nextHistory);
    window.localStorage.setItem(localHistoryKey, JSON.stringify(nextHistory));
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

    markWinner();
    setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, status: "published" } : item));
    startTransition(() => {
      void createAd(formData);
    });
  }

  return (
    <section className="rounded-[2rem] border-4 border-ink bg-white p-4 shadow-brutal md:p-6">
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Potty Favor AI Creative Studio</p>
          <h1 className="font-display text-6xl uppercase leading-none text-stallRed md:text-8xl">Advertising Agency Mode</h1>
          <p className="mt-2 max-w-3xl text-lg font-bold">Build publication-ready magazine advertisements with proven ad structure: headline, offer, CTA, brand logo area, coupon code, and contact information optimized for a 5–15 second restroom read.</p>
        </div>
        <div className="rounded-2xl border-4 border-ink bg-paper p-4">
          <p className="text-xs font-black uppercase tracking-widest text-stallRed">Publish Winning Creative</p>
          <select className="mt-2 w-full rounded-xl border-2 border-ink p-2 font-bold" value={form.issueId} onChange={(event) => update("issueId", event.target.value)}>
            {issues.map((issue) => <option key={issue.id} value={issue.id}>{issue.title} • {issue.venueName}</option>)}
          </select>
          <select className="mt-2 w-full rounded-xl border-2 border-ink p-2 font-bold" value={slotNumber} onChange={(event) => setSlotNumber(event.target.value)}>
            {Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Potty Favor Slot {index + 1}</option>)}
          </select>
          <p className="mt-2 text-xs font-black uppercase text-ink/60">Primary creative size: {sizes["Potty Favor Slot"].dimensions}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-2 md:grid-cols-5">
        {stepLabels.map((label, index) => (
          <button key={label} className={`rounded-xl border-2 border-ink px-3 py-2 text-sm font-black uppercase ${step === index + 1 ? "bg-stallYellow" : "bg-paper"}`} onClick={() => setStep(index + 1)}>{index + 1}. {label}</button>
        ))}
      </div>

      {step === 1 ? <div className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {industryTemplates.map((template) => <button key={template.category} className={`rounded-2xl border-2 border-ink p-3 text-left font-black uppercase ${form.category === template.category ? "bg-stallYellow" : "bg-paper"}`} onClick={() => applyTemplate(template)}><span className="block text-lg">{template.category}</span><span className="mt-1 block text-xs normal-case text-ink/70">{template.scanGoal}</span></button>)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Business Name" value={form.businessName} onChange={(value) => update("businessName", value)} />
          <Field label="Category" value={form.category} onChange={(value) => update("category", value)} placeholder="Restaurant, Casino, Home Services..." />
          <Field label="Website" value={form.website} onChange={(value) => update("website", value)} />
          <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} />
          <label className="rounded-2xl border-2 border-ink bg-paper p-4 font-black uppercase md:col-span-2">Brand Logo Area<span className="mt-2 block text-sm normal-case text-ink/70">Upload is stored client-side for now; the file name becomes brand context and the generated ad reserves a clean logo zone.</span><input className="mt-3 w-full" type="file" accept="image/*" onChange={(event) => update("logoName", event.target.files?.[0]?.name || "")} /></label>
        </div>
      </div> : null}

      {step === 2 ? <div className="grid gap-4 md:grid-cols-2">
        <Field label="Offer" value={form.offer} onChange={(value) => update("offer", value)} placeholder="15% OFF, free appetizer..." />
        <Field label="Coupon Code" value={form.couponCode} onChange={(value) => update("couponCode", value)} />
        <Field label="Call to Action" value={form.ctaText} onChange={(value) => update("ctaText", value)} />
        <Field label="Expiration Date" value={form.expirationDate} onChange={(value) => update("expirationDate", value)} type="date" />
        <Field label="Headline Strategy" value={form.headlineHint} onChange={(value) => update("headlineHint", value)} placeholder="Make the discount impossible to miss." />
        <Field label="5–15 Second Scan Goal" value={form.scanGoal} onChange={(value) => update("scanGoal", value)} placeholder="What must readers remember after glancing?" />
      </div> : null}

      {step === 3 ? <div className="grid gap-3 md:grid-cols-3">
        {audienceOptions.map((option) => <button key={option} className={`rounded-2xl border-2 border-ink p-4 font-black uppercase ${form.audience === option ? "bg-stallYellow" : "bg-paper"}`} onClick={() => update("audience", option)}>{option}</button>)}
        {form.audience === "Custom Audience" ? <div className="md:col-span-3"><Field label="Custom Audience" value={form.customAudience} onChange={(value) => update("customAudience", value)} /></div> : null}
      </div> : null}

      {step === 4 ? <div className="grid gap-6 lg:grid-cols-2">
        <ChoiceGroup title="Tone" options={tones} value={form.tone} onChange={(value) => update("tone", value)} />
        <ChoiceGroup title="Magazine Ad Style" options={visualStyles} value={form.visualStyle} onChange={(value) => update("visualStyle", value)} />
        <div className="lg:col-span-2"><Field label="Brand Colors" value={form.brandColors} onChange={(value) => update("brandColors", value)} placeholder="#ff2d55, #ffd400, #5b2cff" /></div>
        <div className="rounded-2xl border-4 border-ink bg-paper p-4 lg:col-span-2">
          <h3 className="font-display text-4xl uppercase">Required Ad Anatomy</h3>
          <div className="mt-3 grid gap-2 text-sm font-black uppercase md:grid-cols-3">
            <span>1. Headline</span><span>2. Offer</span><span>3. Call to Action</span><span>4. Brand Logo Area</span><span>5. Coupon Code</span><span>6. Contact Information</span>
          </div>
        </div>
      </div> : null}

      {step === 5 ? <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">{creatives.map((creative, index) => <button key={`${creative.campaignId || creative.adSize}-${index}`} className={`rounded-xl border-2 border-ink px-3 py-2 font-black uppercase ${selectedCreativeIndex === index ? "bg-stallYellow" : creative.status === "winner" ? "bg-green-200" : "bg-paper"}`} onClick={() => setSelectedCreativeIndex(index)}>{creative.conceptLabel || creative.adSize}{creative.status === "winner" ? " ★" : ""}</button>)}</div>
          {selectedCreative ? <PreviewCard creative={selectedCreative} /> : <p className="rounded-2xl border-2 border-dashed border-ink p-8 text-center font-black uppercase">Generate Potty Favor slot creative or three agency concepts to preview publication-ready ads.</p>}
          {apiStatus ? <StatusPanel diagnostic={apiStatus} /> : null}
          {error ? <p className="mt-3 rounded-xl border-2 border-stallRed bg-red-50 p-3 text-sm font-black text-stallRed">Image generation failed — no generic artwork fallback was created. {error}</p> : null}
        </div>
        <div className="rounded-2xl border-4 border-ink bg-paper p-4">
          <h3 className="font-display text-4xl uppercase">Select Winner</h3>
          {selectedCreative ? <div className="mt-3 grid gap-3">
            <Field label="Headline" value={selectedCreative.headline} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, headline: value } : item))} />
            <Field label="Offer / Subheadline" value={selectedCreative.subheadline} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, subheadline: value } : item))} />
            <Field label="CTA" value={selectedCreative.ctaText} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, ctaText: value } : item))} />
            <Field label="Coupon" value={selectedCreative.couponCode} onChange={(value) => setCreatives((items) => items.map((item, index) => index === selectedCreativeIndex ? { ...item, couponCode: value } : item))} />
            <button className="rounded-xl border-4 border-ink bg-green-200 px-4 py-3 font-black uppercase shadow-brutal" onClick={markWinner}>Mark as Winning Creative</button>
            <button className="rounded-xl border-4 border-ink bg-stallRed px-4 py-3 font-black uppercase text-white shadow-brutal disabled:opacity-50" disabled={isPending} onClick={publish}>{isPending ? "Publishing..." : `Publish Winner to Slot ${slotNumber}`}</button>
          </div> : null}
        </div>
      </div> : null}

      <div className="mt-6 flex flex-wrap justify-between gap-3 border-t-4 border-ink pt-4">
        <button className="rounded-xl border-2 border-ink bg-paper px-4 py-2 font-black uppercase" onClick={() => setStep(Math.max(1, step - 1))}>Back</button>
        {step < 5 ? <button className="rounded-xl border-2 border-ink bg-stallYellow px-4 py-2 font-black uppercase" onClick={() => setStep(Math.min(5, step + 1))}>Next</button> : null}
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border-4 border-ink bg-stallYellow px-4 py-3 font-black uppercase shadow-brutal disabled:opacity-50" disabled={!canGenerate || isGenerating} onClick={() => generateCreativeSet("concepts")}>{isGenerating && generationLabel.includes("3") ? generationLabel : "Generate 3 Concepts"}</button>
          <button className="rounded-xl border-4 border-ink bg-paper px-4 py-3 font-black uppercase shadow-brutal disabled:opacity-50" disabled={!canGenerate || isGenerating || !selectedCreative} onClick={() => generateCreativeSet("variation")}>{isGenerating && generationLabel.includes("Regenerating") ? generationLabel : "Regenerate Variation"}</button>
          <button className="rounded-xl border-4 border-ink bg-stallPurple px-5 py-3 font-black uppercase text-white shadow-brutal disabled:opacity-50" disabled={!canGenerate || isGenerating} onClick={() => generateCreativeSet("campaign")}>{isGenerating && !generationLabel.includes("3") && !generationLabel.includes("Regenerating") ? generationLabel : "Generate Slot Sizes"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <HistoryPanel title="Saved Creative History" items={history} onLoad={(item) => { setCreatives([item]); setSelectedCreativeIndex(0); setStep(5); }} />
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
  return <article className="rounded-[2rem] border-4 border-ink bg-white p-4 shadow-brutal"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase text-stallYellow">{creative.conceptLabel || creative.adSize}</p><p className="rounded-full bg-stallPurple px-3 py-1 text-xs font-black uppercase text-white">{sizes[creative.adSize].dimensions}</p></div><div className={`${sizes[creative.adSize].className} overflow-hidden rounded-2xl border-4 border-ink bg-ink`}><img className="h-full w-full object-cover" src={creative.imageUrl} alt={`${creative.adSize} generated ad`} /></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="min-w-0"><p className="truncate text-xs font-black uppercase text-stallPurple">Business / Logo Area: {shortenLabel(creative.businessName || "Generated Sponsor", 30)}</p><h3 className="break-words font-display text-3xl uppercase leading-none md:text-4xl">{shortenLabel(creative.headline, 38)}</h3><p className="mt-2 break-words font-bold"><span className="font-black uppercase text-stallRed">Offer:</span> {shortenLabel(creative.subheadline, 58)}</p><p className="mt-2 break-words font-black uppercase text-stallRed">CTA: {shortenLabel(creative.ctaText, 20)} • Coupon: {shortenLabel(creative.couponCode || "No code", 18)}</p><p className="mt-2 break-words text-sm font-bold">Contact: {shortenLabel(creative.contactInfo || "Website/phone from brief", 44)}</p>{creative.historySaved === false ? <p className="mt-2 text-xs font-black uppercase text-stallRed">History save failed: {creative.historyError}</p> : null}</div><div className="rounded-xl border-2 border-ink bg-paper p-3"><p className="text-xs font-black uppercase tracking-widest text-stallRed">Agency Prompt Used</p><p className="mt-2 max-h-44 overflow-y-auto break-words text-sm font-bold">{creative.promptUsed}</p><p className="mt-2 text-xs font-black uppercase text-stallPurple">Model: {creative.model || creative.diagnostic?.model || "configured server model"}</p></div></div></article>;
}

function StatusPanel({ diagnostic }: { diagnostic: ApiDiagnostic }) {
  return <div className="mt-3 grid gap-2 rounded-xl border-2 border-ink bg-paper p-3 text-xs font-black uppercase md:grid-cols-4"><span>API: {diagnostic.apiStatus || "unknown"}</span><span>OpenAI: {diagnostic.openAiStatus || "unknown"}</span><span>Model: {diagnostic.model || "server default"}</span><span>{diagnostic.errorType ? `Error: ${diagnostic.errorType}` : "Image API ready"}</span></div>;
}

function HistoryPanel({ title, items, onLoad }: { title: string; items: CampaignHistoryItem[]; onLoad: (item: CampaignHistoryItem) => void }) {
  return <div className="rounded-2xl border-4 border-ink bg-white p-4"><h3 className="font-display text-4xl uppercase">{title}</h3><div className="mt-3 grid gap-2">{items.length ? items.map((item) => <button key={item.campaignId} className={`rounded-xl border-2 border-ink p-3 text-left ${item.status === "winner" ? "bg-green-100" : "bg-paper"}`} onClick={() => onLoad(item)}><p className="text-xs font-black uppercase text-stallRed">{new Date(item.createdAt).toLocaleString()} • {item.adSize}{item.status ? ` • ${item.status}` : ""}</p><h4 className="font-black uppercase">{item.businessName}</h4><p className="text-sm font-bold">{item.headline}</p></button>) : <p className="rounded-xl border-2 border-dashed border-ink p-4 font-bold">No saved creative history yet.</p>}</div></div>;
}
