"use client";

import {
  Component,
  type ReactNode,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  AD_FINAL_HEIGHT,
  AD_FINAL_WIDTH,
  AD_FORMAT_LABEL,
} from "@/lib/ad-config";
import {
  DEFAULT_PUBLIC_ISSUE_ID,
  DEFAULT_PUBLIC_ISSUE_LABEL,
} from "@/lib/default-public-issue";

type PublisherOption = { id: string; name: string };
type AdvertiserOption = { id: string; name: string };
type VenueOption = { id: string; name: string; city: string; state: string };
type RestroomOption = { id: string; name: string; venueName: string };
type IssueOption = {
  id: string;
  title: string;
  label?: string;
  venueName: string;
  status: string;
  isDefault?: boolean;
  targetType?: string;
};
type RecentCampaign = {
  id: string;
  businessName: string;
  title: string;
  offer: string;
  ctaText: string;
  couponCode: string | null;
  createdAt: string;
};
type SavedCampaign = {
  campaignId: string;
  parentCampaignId?: string | null;
  versionNumber?: number | null;
  businessName: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  couponCode: string;
  adSize: "3:1 Sponsor Banner";
  imageUrl: string;
  promptUsed: string;
  createdAt: string;
  slotPublished?: number | null;
  selectedSlot?: number | null;
  targetUrl?: string | null;
  logoBase64?: string | null;
  publishStatus?: string | null;
  publishedAt?: string | null;
  targetLabel?: string | null;
  targetType?: string | null;
  viewCount?: number;
  clickCount?: number;
  lastClickedAt?: string | null;
};

type Props = {
  createAd: (
    formData: FormData,
  ) => Promise<{ ok: boolean; adId?: string; message?: string }>;
  publishers: PublisherOption[];
  advertisers: AdvertiserOption[];
  venues: VenueOption[];
  restrooms: RestroomOption[];
  issues: IssueOption[];
  recentCampaigns: RecentCampaign[];
  savedCampaigns: SavedCampaign[];
  serverWarning?: string;
};

type AdSize = "3:1 Sponsor Banner";
type GeneratedCreative = {
  adSize: "3:1 Sponsor Banner";
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
  parentCampaignId?: string;
  versionNumber?: number;
  publishStatus?: string | null;
};

type CampaignHistoryItem = GeneratedCreative & {
  campaignId: string;
  businessName: string;
  createdAt: string;
  slotPublished?: number | null;
  publishedAt?: string | null;
  targetLabel?: string | null;
  targetType?: string | null;
  viewCount?: number;
  clickCount?: number;
  lastClickedAt?: string | null;
};

const audienceOptions = [
  "Tourists",
  "Locals",
  "Casino Guests",
  "Sports Fans",
  "Concert Goers",
  "Convention Attendees",
  "Custom Audience",
];
const tones = [
  "Funny",
  "Luxury",
  "Professional",
  "Urgent",
  "Family Friendly",
  "Nightlife",
];
const visualStyles = [
  "Vegas Neon",
  "Casino Luxury",
  "Sports Bar",
  "Restaurant",
  "Event Promotion",
  "Concert",
  "Modern Minimal",
];
const SPONSOR_BANNER: AdSize = "3:1 Sponsor Banner";
const ENV_WARNING_MESSAGE =
  "Publishing is not fully configured. Add Cloudinary environment variables in Vercel.";

const isPublishingConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
);

const sizes: Record<AdSize, { label: string; className: string }> = {
  [SPONSOR_BANNER]: {
    label: SPONSOR_BANNER,
    className: "aspect-[3/1] max-w-[600px]",
  },
};

function safe(value: string | undefined, fallback: string) {
  return (value || "").trim() || fallback;
}

function limitText(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function shortenLabel(value: string, max = 28) {
  const normalized = safe(value, "").replace(/\s+/g, " ");
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, max - 1).trim()}…`;
}

function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (context.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    while (
      lines[maxLines - 1] &&
      context.measureText(lines[maxLines - 1]).width > maxWidth
    )
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -2).trim() + "…";
  }
  return lines;
}

function fitCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  maxFont: number,
  minFont: number,
  weight = 900,
  family = "Arial Black, Arial, sans-serif",
) {
  for (let size = maxFont; size >= minFont; size -= 2) {
    context.font = `${weight} ${size}px ${family}`;
    const lines = wrapCanvasText(context, text, maxWidth, maxLines);
    if (
      lines.length <= maxLines &&
      lines.every((line) => context.measureText(line).width <= maxWidth)
    )
      return { size, lines, lineHeight: Math.round(size * 1.08) };
  }
  context.font = `${weight} ${minFont}px ${family}`;
  return {
    size: minFont,
    lines: wrapCanvasText(context, text, maxWidth, maxLines),
    lineHeight: Math.round(minFont * 1.08),
  };
}

function fileSafe(value: string | undefined, fallback = "business") {
  return (
    (value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

async function uploadImageUrlToCloudinary(imageUrl: string) {
  if (!imageUrl || !imageUrl.startsWith("data:")) return imageUrl;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset)
    throw new Error("Image must be uploaded before publishing.");
  const data = new FormData();
  data.set("file", imageUrl);
  data.set("upload_preset", uploadPreset);
  data.set("folder", "stalltalk/ads");
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: data },
  );
  const result = await response.json();
  if (!response.ok || !result.secure_url)
    throw new Error("Image must be uploaded before publishing.");
  return String(result.secure_url);
}

async function downloadImageUrl(imageUrl: string, filename: string) {
  if (
    !imageUrl ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  )
    return;
  try {
    const response = await fetch(imageUrl);
    if (!response.ok)
      throw new Error(`Image download failed (${response.status})`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  }
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

function diagnosticMessage(data: {
  error?: string;
  diagnostic?: ApiDiagnostic;
}) {
  const diagnostic = data.diagnostic;
  return [
    data.error ? `Error: ${data.error}` : "Image generation failed.",
    diagnostic?.apiStatus ? `API: ${diagnostic.apiStatus}` : "",
    diagnostic?.openAiStatus ? `OpenAI: ${diagnostic.openAiStatus}` : "",
    diagnostic?.model ? `Model: ${diagnostic.model}` : "",
    diagnostic?.errorType ? `Type: ${diagnostic.errorType}` : "",
    diagnostic?.openAiStatusCode ? `HTTP: ${diagnostic.openAiStatusCode}` : "",
    diagnostic?.requestId ? `Request ID: ${diagnostic.requestId}` : "",
    diagnostic?.rateLimited ? "Rate limited: yes" : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

export function AdStudioAgency(props: Props) {
  return (
    <AdStudioErrorBoundary>
      <AdStudioPanel {...props} />
    </AdStudioErrorBoundary>
  );
}

function AdStudioPanel({
  createAd,
  publishers,
  advertisers,
  venues,
  restrooms,
  issues,
  recentCampaigns,
  savedCampaigns,
  serverWarning,
}: Props) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [campaignRootId, setCampaignRootId] = useState("");
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
    issueId: issues[0]?.id ?? DEFAULT_PUBLIC_ISSUE_ID,
    scope: "GLOBAL",
  });

  useEffect(() => {
    setHistory(
      savedCampaigns.map((item) => ({
        ...item,
        businessName: item.businessName,
        imageUrl: item.imageUrl || "",
        promptUsed: item.promptUsed || "",
        headline: item.headline || "",
        subheadline: item.subheadline || "",
        ctaText: item.ctaText || "Claim Offer",
        couponCode: item.couponCode || "",
        adSize: SPONSOR_BANNER,
        createdAt: item.createdAt,
        parentCampaignId: item.parentCampaignId || item.campaignId,
        versionNumber: item.versionNumber || 1,
      })),
    );
  }, [savedCampaigns]);

  const selectedCreative = creatives[selectedCreativeIndex];
  const activeAudience =
    form.audience === "Custom Audience"
      ? safe(form.customAudience, "custom audience")
      : form.audience;
  const activeIssue = issues.find((issue) => issue.id === form.issueId);
  const publishTargetContext =
    form.issueId === DEFAULT_PUBLIC_ISSUE_ID
      ? "Default publish target: Default Public Issue"
      : `Selected issue: ${activeIssue?.venueName || activeIssue?.label || activeIssue?.title || "Selected Issue"}`;

  async function uploadFinishedAd(file: File | undefined) {
    if (!file) return;
    setUploadMessage("Uploading finished 3:1 sponsor banner to Cloudinary...");
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset)
        throw new Error("Cloudinary upload is not configured.");
      const data = new FormData();
      data.set("file", file);
      data.set("upload_preset", uploadPreset);
      data.set("folder", "stalltalk/ads");
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: data },
      );
      const result = await response.json();
      if (!response.ok || !result.secure_url)
        throw new Error(result.error?.message || "Cloudinary upload failed.");
      const campaignId = crypto.randomUUID();
      const uploaded: GeneratedCreative = {
        adSize: SPONSOR_BANNER,
        imageUrl: String(result.secure_url),
        promptUsed:
          "Uploaded finished 3:1 sponsor banner graphic stored in Cloudinary.",
        headline: limitText(
          safe(form.offer || form.businessName, "Uploaded Sponsor Ad"),
          34,
        ),
        subheadline: limitText(safe(form.category, "Uploaded artwork"), 46),
        ctaText: limitText(safe(form.ctaText, "Learn More"), 18),
        couponCode: limitText(safe(form.couponCode, ""), 16),
        businessName: safe(form.businessName, "Uploaded Sponsor"),
        campaignId,
        parentCampaignId: campaignRootId || campaignId,
        versionNumber: creatives.length + 1,
        publishStatus: "UPLOADED",
      };
      setCreatives((items) => [...items, uploaded]);
      setSelectedCreativeIndex(creatives.length);
      setHasGenerated(true);
      setStep(5);
      setUploadMessage(
        "Uploaded graphic is ready to publish to a content-ad slot.",
      );
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : "Upload failed.",
      );
    }
  }

  function readLogo(file: File | undefined) {
    if (!file) {
      update("logoName", "");
      update("logoBase64", "");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setForm((current) => ({
        ...current,
        logoName: file.name,
        logoBase64: String(reader.result || ""),
      }));
    reader.onerror = () => setError("Unable to read uploaded logo.");
    reader.readAsDataURL(file);
  }

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function composeSponsorBannerImage(imageUrl?: string) {
    if (typeof window === "undefined" || typeof document === "undefined")
      return imageUrl || "";
    const canvas = document.createElement("canvas");
    canvas.width = AD_FINAL_WIDTH;
    canvas.height = AD_FINAL_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return imageUrl || "";

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#17002f");
    gradient.addColorStop(0.45, "#5b2cff");
    gradient.addColorStop(1, "#ff2d55");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(255,212,0,.18)";
    context.beginPath();
    context.arc(1250, 120, 280, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,255,255,.10)";
    context.beginPath();
    context.arc(260, 450, 220, 0, Math.PI * 2);
    context.fill();

    if (imageUrl) {
      try {
        const baseImage = await loadCanvasImage(imageUrl);
        const scale = Math.max(canvas.width / baseImage.width, canvas.height / baseImage.height);
        const width = baseImage.width * scale;
        const height = baseImage.height * scale;
        context.drawImage(baseImage, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      } catch {
        // Keep styled gradient fallback when OpenAI output cannot be loaded.
      }
    }

    const shade = context.createLinearGradient(0, 0, canvas.width, 0);
    shade.addColorStop(0, "rgba(5,0,24,.82)");
    shade.addColorStop(0.48, "rgba(5,0,24,.56)");
    shade.addColorStop(1, "rgba(5,0,24,.28)");
    context.fillStyle = shade;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 64;
    const business = safe(form.businessName, "Your Business");
    const headline = safe(form.offer, "Limited-Time Offer");
    const subheadline = `For ${activeAudience}`;
    const cta = safe(form.ctaText, "Claim Offer");
    const coupon = safe(form.couponCode, "");

    let logoRight = padding;
    if (form.logoBase64) {
      try {
        const logoImage = await loadCanvasImage(form.logoBase64);
        const logoMaxWidth = 220;
        const logoMaxHeight = 96;
        const scale = Math.min(logoMaxWidth / logoImage.width, logoMaxHeight / logoImage.height, 1);
        const logoWidth = logoImage.width * scale;
        const logoHeight = logoImage.height * scale;
        drawRoundRect(context, padding, padding, logoWidth + 28, logoHeight + 28, 24);
        context.fillStyle = "rgba(255,255,255,.94)";
        context.fill();
        context.drawImage(logoImage, padding + 14, padding + 14, logoWidth, logoHeight);
        logoRight = padding + logoWidth + 48;
      } catch {
        logoRight = padding;
      }
    }

    context.textBaseline = "top";
    context.fillStyle = "#ffffff";
    const businessFit = fitCanvasText(context, business, 430, 2, 42, 24, 900);
    context.font = `900 ${businessFit.size}px Arial Black, Arial, sans-serif`;
    businessFit.lines.forEach((line, index) => context.fillText(line, logoRight, padding + index * businessFit.lineHeight));

    const headlineMaxWidth = 860;
    const headlineFit = fitCanvasText(context, headline, headlineMaxWidth, 2, 82, 42, 900);
    const headlineY = 178 - (headlineFit.lines.length - 1) * 26;
    context.shadowColor = "rgba(0,0,0,.42)";
    context.shadowBlur = 14;
    context.font = `900 ${headlineFit.size}px Arial Black, Arial, sans-serif`;
    headlineFit.lines.forEach((line, index) => context.fillText(line, padding, headlineY + index * headlineFit.lineHeight));
    context.shadowBlur = 0;

    const subFit = fitCanvasText(context, subheadline, 760, 1, 34, 22, 800, "Arial, sans-serif");
    context.font = `800 ${subFit.size}px Arial, sans-serif`;
    context.fillStyle = "#fff7b8";
    context.fillText(subFit.lines[0] || "", padding, headlineY + headlineFit.lines.length * headlineFit.lineHeight + 18);

    const ctaWidth = 300;
    const ctaHeight = 78;
    const ctaX = canvas.width - padding - ctaWidth;
    const ctaY = canvas.height - padding - ctaHeight;
    drawRoundRect(context, ctaX, ctaY, ctaWidth, ctaHeight, 28);
    context.fillStyle = "#ffd400";
    context.fill();
    const ctaFit = fitCanvasText(context, cta, ctaWidth - 42, 1, 32, 20, 900);
    context.font = `900 ${ctaFit.size}px Arial Black, Arial, sans-serif`;
    context.fillStyle = "#111111";
    const ctaLine = ctaFit.lines[0] || cta;
    context.fillText(ctaLine, ctaX + (ctaWidth - context.measureText(ctaLine).width) / 2, ctaY + (ctaHeight - ctaFit.size) / 2 - 2);

    if (coupon) {
      const badgeWidth = 340;
      const badgeHeight = 64;
      const badgeX = ctaX - badgeWidth - 28;
      const badgeY = canvas.height - padding - badgeHeight;
      drawRoundRect(context, badgeX, badgeY, badgeWidth, badgeHeight, 22);
      context.fillStyle = "rgba(255,255,255,.94)";
      context.fill();
      const couponFit = fitCanvasText(context, `CODE ${coupon}`, badgeWidth - 36, 1, 28, 18, 900);
      context.font = `900 ${couponFit.size}px Arial Black, Arial, sans-serif`;
      context.fillStyle = "#5b2cff";
      const couponLine = couponFit.lines[0] || coupon;
      context.fillText(couponLine, badgeX + (badgeWidth - context.measureText(couponLine).width) / 2, badgeY + (badgeHeight - couponFit.size) / 2 - 2);
    }

    return canvas.toDataURL("image/png");
  }

  async function isThreeToOneImage(imageUrl: string) {
    if (!imageUrl || typeof window === "undefined") return false;
    const image = await loadCanvasImage(imageUrl);
    return image.width === AD_FINAL_WIDTH && image.height === AD_FINAL_HEIGHT;
  }

  async function overlayLogoOnImage(imageUrl: string) {
    if (
      !form.logoBase64 ||
      !imageUrl ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    )
      return imageUrl;
    const [baseImage, logoImage] = await Promise.all([
      loadCanvasImage(imageUrl),
      loadCanvasImage(form.logoBase64),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = AD_FINAL_WIDTH;
    canvas.height = AD_FINAL_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return imageUrl;
    context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    const logoMaxWidth = canvas.width * 0.34;
    const logoMaxHeight = canvas.height * 0.16;
    const logoScale = Math.min(
      logoMaxWidth / logoImage.width,
      logoMaxHeight / logoImage.height,
      1,
    );
    const logoWidth = logoImage.width * logoScale;
    const logoHeight = logoImage.height * logoScale;
    const padding = 42;
    context.fillStyle = "rgba(255,255,255,.92)";
    roundRect(
      context,
      padding - 14,
      padding - 14,
      logoWidth + 28,
      logoHeight + 28,
      22,
    );
    context.fill();
    context.drawImage(logoImage, padding, padding, logoWidth, logoHeight);
    return canvas.toDataURL("image/png");
  }

  function fallbackCreative(
    adSize: AdSize,
    message: string,
    data?: Partial<GeneratedCreative>,
  ): GeneratedCreative {
    const headline = limitText(
      safe(data?.headline || form.offer, "Limited-Time Offer"),
      34,
    );
    return {
      adSize,
      imageUrl: "",
      promptUsed:
        data?.promptUsed ||
        `Fallback styled ad card for ${safe(form.businessName, "Your Business")} using creative brief: ${safe(form.offer, "Limited-time offer")}.`,
      headline,
      subheadline: limitText(
        safe(
          data?.subheadline || `For ${activeAudience}`,
          "For nearby customers",
        ),
        46,
      ),
      ctaText: limitText(
        safe(data?.ctaText || form.ctaText, "Claim Offer"),
        18,
      ),
      couponCode: limitText(safe(data?.couponCode || form.couponCode, ""), 16),
      businessName: safe(
        data?.businessName || form.businessName,
        "Your Business",
      ),
      model: data?.model,
      diagnostic: data?.diagnostic,
      campaignId: data?.campaignId,
      historySaved: data?.historySaved,
      historyError: data?.historyError,
      imageFallback: true,
      imageError: message,
    };
  }

  async function generateCampaign(regenerate = false) {
    if (!canGenerate) return;
    setIsGenerating(true);
    setHasGenerated(false);
    setError("");
    const parentCampaignId =
      regenerate && campaignRootId ? campaignRootId : crypto.randomUUID();
    if (!campaignRootId || !regenerate) setCampaignRootId(parentCampaignId);
    const nextVersion =
      regenerate && creatives.length
        ? Math.max(
            ...creatives.map((creative) => creative.versionNumber || 1),
          ) + 1
        : 1;
    const campaignBatchId = `${parentCampaignId}-v${nextVersion}`;
    const adSize = SPONSOR_BANNER;
    const targetLabel =
      form.issueId === DEFAULT_PUBLIC_ISSUE_ID
        ? DEFAULT_PUBLIC_ISSUE_LABEL
        : issues.find((issue) => issue.id === form.issueId)?.label ||
          issues.find((issue) => issue.id === form.issueId)?.title ||
          form.issueId;
    const base = {
      ...form,
      audience: activeAudience,
      parentCampaignId,
      campaignId: campaignBatchId,
      versionNumber: nextVersion,
      adSize,
      slot: Number(slotNumber),
      targetType:
        form.issueId === DEFAULT_PUBLIC_ISSUE_ID
          ? DEFAULT_PUBLIC_ISSUE_ID
          : "issue",
      targetLabel,
    };
    const generated: GeneratedCreative[] = [];

    try {
      const response = await fetch("/api/generate-ad-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(base),
      });
      const raw = await response.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (parseError) {
        const message =
          parseError instanceof Error
            ? parseError.message
            : "Invalid API JSON response.";
        throw new Error(`API JSON parse error: ${message}`);
      }
      setApiStatus(
        data.diagnostic || {
          apiStatus: response.ok ? "ok" : "failed",
          model: data.model,
        },
      );
      if (!response.ok || data.error) {
        const message = diagnosticMessage(data);
        generated.push({
          ...fallbackCreative(adSize, message, data),
          imageUrl: await composeSponsorBannerImage(),
          campaignId: campaignBatchId,
          parentCampaignId,
          versionNumber: nextVersion,
          publishStatus: "GENERATED",
        });
        if (!error) setError(`Image generation fallback active. ${message}`);
      } else {
        generated.push({
          adSize,
          imageUrl: await uploadImageUrlToCloudinary(
            await composeSponsorBannerImage(data.imageUrl),
          ),
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
          selectedSlot: Number(slotNumber),
          parentCampaignId: data.parentCampaignId || parentCampaignId,
          versionNumber: data.versionNumber || nextVersion,
          publishStatus: "GENERATED",
        });
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Image generation failed.";
      generated.push({
        ...fallbackCreative(adSize, message),
        imageUrl: await composeSponsorBannerImage(),
        campaignId: campaignBatchId,
        parentCampaignId,
        versionNumber: nextVersion,
        publishStatus: "GENERATED",
      });
      setError(`Image generation fallback active. ${message}`);
    }

    const nextHistory = generated.map((creative) => ({
      ...creative,
      campaignId: creative.campaignId || campaignBatchId,
      businessName: safe(form.businessName, "Your Business"),
      createdAt: new Date().toISOString(),
      targetUrl: form.website || null,
      selectedSlot: Number(slotNumber),
    }));
    await Promise.all(
      nextHistory
        .filter((creative) => creative.imageUrl && !creative.imageFallback)
        .map((creative) =>
          fetch("/api/ad-studio/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...base,
              campaignId: creative.campaignId,
              parentCampaignId: creative.parentCampaignId || parentCampaignId,
              versionNumber: creative.versionNumber || nextVersion,
              businessName: creative.businessName,
              imageUrl: creative.imageUrl,
              finalImageUrl: creative.imageUrl,
              promptUsed: creative.promptUsed,
              generatedHeadline: creative.headline,
              generatedSubheadline: creative.subheadline,
              ctaText: creative.ctaText,
              couponCode: creative.couponCode,
              targetUrl: form.website || null,
              publishStatus: "DRAFT",
            }),
          }).catch(() => undefined),
        ),
    );
    const mergedHistory = [...nextHistory, ...history].slice(0, 12);
    setCreatives((current) =>
      regenerate ? [...current, ...generated] : generated,
    );
    setSelectedCreativeIndex(regenerate ? creatives.length : 0);
    setHasGenerated(true);
    setHistory(mergedHistory.filter((item) => item.historySaved !== false));
    if (generated.some((item) => item.historySaved === false))
      setError(
        generated.find((item) => item.historySaved === false)?.historyError ||
          "Campaign generated, but database history was not saved. Download remains available.",
      );
    setStep(5);
    setIsGenerating(false);
  }


  async function deleteCampaignFromHistory(item: CampaignHistoryItem, publishedOnly = false) {
    if (item.publishStatus === "PUBLISHED" && !window.confirm("This campaign is published. Delete and unpublish it from the homepage?")) return;
    const endpoint = publishedOnly ? `/api/ad-studio/published/${encodeURIComponent(item.campaignId)}` : `/api/ad-studio/campaigns/${encodeURIComponent(item.campaignId)}`;
    const response = await fetch(endpoint, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
      setPublishError(result.error || `Delete failed (${response.status})`);
      return;
    }
    setHistory((items) => items.filter((current) => current.campaignId !== item.campaignId));
    setCreatives((items) => items.filter((current) => current.campaignId !== item.campaignId));
    setPublishMessage("Campaign deleted.");
  }

  function downloadSelectedCreative() {
    if (!selectedCreative?.imageUrl) return;
    const campaignId = selectedCreative.campaignId || campaignRootId || "draft";
    const businessName = fileSafe(
      selectedCreative.businessName || form.businessName,
    );
    void downloadImageUrl(
      selectedCreative.imageUrl,
      `pottyfavor-generated-ad-${businessName}-${campaignId}.png`,
    );
  }

  async function publish() {
    setPublishError("");
    setPublishMessage("");
    if (!form.issueId) {
      setPublishError("Select an issue before publishing.");
      return;
    }
    if (!slotNumber) {
      setPublishError("Select a slot before publishing.");
      return;
    }
    if (!selectedCreative) return;
    if (!selectedCreative.imageUrl) {
      setPublishError("Image must be uploaded before publishing.");
      return;
    }
    try {
      if (!(await isThreeToOneImage(selectedCreative.imageUrl))) {
        setPublishError("Final ad must be a 3:1 sponsor banner before publishing.");
        return;
      }
    } catch {
      setPublishError("Final ad must be a 3:1 sponsor banner before publishing.");
      return;
    }
    const formData = new FormData();
    const campaignId = selectedCreative.campaignId || crypto.randomUUID();
    formData.set("campaignId", campaignId);
    formData.set(
      "parentCampaignId",
      selectedCreative.parentCampaignId || campaignRootId || campaignId,
    );
    formData.set(
      "versionNumber",
      String(selectedCreative.versionNumber || selectedCreativeIndex + 1),
    );
    formData.set("publisherId", form.publisherId);
    formData.set("advertiserId", form.advertiserId);
    formData.set("businessName", safe(form.businessName, "Your Business"));
    formData.set("title", selectedCreative.headline);
    formData.set("offer", selectedCreative.subheadline);
    let publishImageUrl = selectedCreative.imageUrl;
    try {
      publishImageUrl = await uploadImageUrlToCloudinary(
        selectedCreative.imageUrl,
      );
      if (publishImageUrl !== selectedCreative.imageUrl)
        setCreatives((items) =>
          items.map((item, index) =>
            index === selectedCreativeIndex
              ? { ...item, imageUrl: publishImageUrl }
              : item,
          ),
        );
    } catch (caught) {
      setPublishError(
        caught instanceof Error
          ? caught.message
          : "Image must be uploaded before publishing.",
      );
      return;
    }
    formData.set("imageUrl", publishImageUrl);
    formData.set("artworkUrl", publishImageUrl);
    formData.set("creativeType", "IMAGE");
    formData.set("htmlCreative", "");
    formData.set("promptUsed", selectedCreative.promptUsed);
    formData.set("generatedHeadline", selectedCreative.headline);
    formData.set("generatedSubheadline", selectedCreative.subheadline);
    formData.set("adSize", SPONSOR_BANNER);
    formData.set("ctaText", selectedCreative.ctaText);
    formData.set("targetUrl", form.website || "#");
    formData.set("phone", form.phone);
    formData.set("logoBase64", form.logoBase64);
    formData.set("couponCode", selectedCreative.couponCode);
    formData.set("status", "ACTIVE");
    formData.set("scope", form.scope);
    formData.set("issueId", form.issueId);
    formData.set(
      "targetType",
      form.issueId === DEFAULT_PUBLIC_ISSUE_ID
        ? DEFAULT_PUBLIC_ISSUE_ID
        : "issue",
    );
    formData.set(
      "targetLabel",
      form.issueId === DEFAULT_PUBLIC_ISSUE_ID
        ? DEFAULT_PUBLIC_ISSUE_LABEL
        : issues.find((issue) => issue.id === form.issueId)?.label ||
            issues.find((issue) => issue.id === form.issueId)?.title ||
            form.issueId,
    );
    formData.set("slotNumber", slotNumber);
    formData.set("monthlyPriceDollars", "0");
    formData.set("action", "publish");

    startTransition(() => {
      void fetch("/api/ad-studio/campaigns", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData.entries())),
        headers: { "Content-Type": "application/json" },
      })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok || result?.error)
            throw new Error(
              result?.error || `Publish failed (${response.status})`,
            );
          return result;
        })
        .then((result) => {
          if (result?.campaign)
            setHistory((items) => [
              result.campaign,
              ...items.filter(
                (item) => item.campaignId !== result.campaign.campaignId,
              ),
            ]);
          setPublishMessage(
            result?.message ||
              `Published campaign ${safe(form.businessName, "Your Business")} to ${form.issueId === DEFAULT_PUBLIC_ISSUE_ID ? DEFAULT_PUBLIC_ISSUE_LABEL : issues.find((issue) => issue.id === form.issueId)?.title || form.issueId} Slot ${slotNumber}`,
          );
          setCreatives((items) =>
            items.map((item, index) => ({
              ...item,
              publishStatus:
                index === selectedCreativeIndex
                  ? "PUBLISHED"
                  : item.parentCampaignId ===
                      (selectedCreative.parentCampaignId || campaignRootId)
                    ? "SUPERSEDED"
                    : item.publishStatus,
            })),
          );
        })
        .catch((caught) =>
          setPublishError(
            caught instanceof Error
              ? caught.message
              : "Unable to publish generated ad.",
          ),
        );
    });
  }

  const missingRequired = [
    form.businessName.trim() ? "" : "business name",
    form.offer.trim() ? "" : "offer",
    form.audience === "Custom Audience" && !form.customAudience.trim()
      ? "custom audience"
      : "",
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
      {serverWarning ? <WarningCard message={serverWarning} /> : null}
      {!isPublishingConfigured ? <PublishingConfigWarning /> : null}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">
            AI Creative Studio
          </p>
          <h1 className="font-display text-6xl uppercase leading-none text-stallRed md:text-8xl">
            Campaign Builder
          </h1>
          <p className="mt-2 max-w-3xl text-lg font-bold">
            AI ad generator from a creative brief: enter business info, offer,
            audience, and creative direction, then generate ad copy plus a
            graphic through the existing /api/generate-ad-image route before
            publishing to a Stall Talk ad slot.
          </p>
        </div>
        <div className="rounded-2xl border-4 border-ink bg-paper p-4">
          <p className="text-xs font-black uppercase tracking-widest text-stallRed">
            Publish Target
          </p>
          <select
            className="mt-2 w-full rounded-xl border-2 border-ink p-2 font-bold"
            value={form.issueId}
            onChange={(event) => update("issueId", event.target.value)}
          >
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                {issue.isDefault
                  ? issue.label || issue.title
                  : `${issue.title} • ${issue.venueName}`}
              </option>
            ))}
          </select>
          <select
            className="mt-2 w-full rounded-xl border-2 border-ink p-2 font-bold"
            value={slotNumber}
            onChange={(event) => setSlotNumber(event.target.value)}
          >
            {Array.from({ length: 8 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                Slot {index + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 grid gap-2 md:grid-cols-5">
        {["Business", "Offer", "Audience", "Creative", "Generate"].map(
          (label, index) => (
            <button
              key={label}
              className={`rounded-xl border-2 border-ink px-3 py-2 text-sm font-black uppercase ${step === index + 1 ? "bg-stallYellow" : "bg-paper"}`}
              onClick={() => setStep(index + 1)}
            >
              {index + 1}. {label}
            </button>
          ),
        )}
      </div>

      {step === 1 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Business Name"
            value={form.businessName}
            onChange={(value) => update("businessName", value)}
          />
          <Field
            label="Category"
            value={form.category}
            onChange={(value) => update("category", value)}
            placeholder="Restaurant, bar, attraction..."
          />
          <Field
            label="Advertiser Website URL"
            value={form.website}
            onChange={(value) => update("website", value)}
            type="url"
            placeholder="https://example.com"
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(value) => update("phone", value)}
          />
          <label className="rounded-2xl border-2 border-ink bg-paper p-4 font-black uppercase md:col-span-2">
            Logo Upload
            <span className="mt-2 block text-sm normal-case text-ink/70">
              Persisted with the generated campaign and overlaid onto the final
              image before publishing.
            </span>
            <input
              className="mt-3 w-full"
              type="file"
              accept="image/*"
              onChange={(event) => readLogo(event.target.files?.[0])}
            />
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Offer"
            value={form.offer}
            onChange={(value) => update("offer", value)}
            placeholder="15% OFF, free appetizer..."
          />
          <Field
            label="Coupon Code"
            value={form.couponCode}
            onChange={(value) => update("couponCode", value)}
          />
          <Field
            label="CTA Button Text"
            value={form.ctaText}
            onChange={(value) => update("ctaText", value)}
          />
          <Field
            label="Expiration Date"
            value={form.expirationDate}
            onChange={(value) => update("expirationDate", value)}
            type="date"
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {audienceOptions.map((option) => (
            <button
              key={option}
              className={`rounded-2xl border-2 border-ink p-4 font-black uppercase ${form.audience === option ? "bg-stallYellow" : "bg-paper"}`}
              onClick={() => update("audience", option)}
            >
              {option}
            </button>
          ))}
          {form.audience === "Custom Audience" ? (
            <div className="md:col-span-3">
              <Field
                label="Custom Audience"
                value={form.customAudience}
                onChange={(value) => update("customAudience", value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChoiceGroup
            title="Tone"
            options={tones}
            value={form.tone}
            onChange={(value) => update("tone", value)}
          />
          <ChoiceGroup
            title="Visual Style"
            options={visualStyles}
            value={form.visualStyle}
            onChange={(value) => update("visualStyle", value)}
          />
          <div className="lg:col-span-2">
            <Field
              label="Brand Colors"
              value={form.brandColors}
              onChange={(value) => update("brandColors", value)}
              placeholder="#ff2d55, #ffd400, #5b2cff"
            />
          </div>
          <label className="lg:col-span-2 rounded-2xl border-2 border-ink bg-paper p-4 font-black uppercase">
            Upload finished 3:1 ad graphic
            <span className="mt-2 block text-sm normal-case text-ink/70">
              Upload finished 3:1 ad graphic. Recommended: 1200x400 or 600x200.
              Stores the file in Cloudinary and uses it exactly like an
              AI-generated creative.
            </span>
            <input
              className="mt-3 w-full"
              type="file"
              accept="image/*"
              onChange={(event) =>
                void uploadFinishedAd(event.target.files?.[0])
              }
            />
            {uploadMessage ? (
              <span className="mt-2 block text-sm normal-case text-stallPurple">
                {uploadMessage}
              </span>
            ) : null}
          </label>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="lg:col-span-2 rounded-2xl border-2 border-ink bg-stallYellow p-4 font-black uppercase">
            <span>Button state: </span>
            {isGenerating
              ? "generating"
              : !canGenerate
                ? `missing required fields (${missingRequired.join(", ")})`
                : selectedCreative
                  ? "publish ready"
                  : hasGenerated
                    ? "generated"
                    : "ready to generate"}
          </div>
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {creatives.map((creative, index) => (
                <button
                  key={creative.campaignId || `${creative.adSize}-${index}`}
                  className={`rounded-xl border-2 border-ink px-3 py-2 font-black uppercase ${selectedCreativeIndex === index ? "bg-stallYellow" : "bg-paper"}`}
                  onClick={() => setSelectedCreativeIndex(index)}
                >
                  Version {creative.versionNumber || index + 1}
                </button>
              ))}
            </div>
            {selectedCreative ? (
              <PreviewCard creative={selectedCreative} />
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-ink p-8 text-center font-black uppercase">
                Generate one locked 3:1 sponsor banner image.
              </p>
            )}
            {apiStatus ? <StatusPanel diagnostic={apiStatus} /> : null}
            {error ? (
              <p className="mt-3 rounded-xl border-2 border-stallRed bg-red-50 p-3 text-sm font-black text-stallRed">
                {error} Copy was still generated and a styled fallback ad
                preview is available.
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border-4 border-ink bg-paper p-4">
            <h3 className="font-display text-4xl uppercase">
              Edit Before Publish
            </h3>
            {selectedCreative ? (
              <div className="mt-3 grid gap-3">
                <Field
                  label="Headline"
                  value={selectedCreative.headline}
                  onChange={(value) =>
                    setCreatives((items) =>
                      items.map((item, index) =>
                        index === selectedCreativeIndex
                          ? { ...item, headline: value }
                          : item,
                      ),
                    )
                  }
                />
                <Field
                  label="Subheadline"
                  value={selectedCreative.subheadline}
                  onChange={(value) =>
                    setCreatives((items) =>
                      items.map((item, index) =>
                        index === selectedCreativeIndex
                          ? { ...item, subheadline: value }
                          : item,
                      ),
                    )
                  }
                />
                <Field
                  label="CTA"
                  value={selectedCreative.ctaText}
                  onChange={(value) =>
                    setCreatives((items) =>
                      items.map((item, index) =>
                        index === selectedCreativeIndex
                          ? { ...item, ctaText: value }
                          : item,
                      ),
                    )
                  }
                />
                <Field
                  label="Coupon"
                  value={selectedCreative.couponCode}
                  onChange={(value) =>
                    setCreatives((items) =>
                      items.map((item, index) =>
                        index === selectedCreativeIndex
                          ? { ...item, couponCode: value }
                          : item,
                      ),
                    )
                  }
                />
                {!form.website.trim() ? (
                  <p className="rounded-xl border-2 border-stallRed bg-red-50 p-3 text-sm font-black uppercase text-stallRed">
                    Admin warning: no advertiser website URL entered. The
                    published image will render without a click link.
                  </p>
                ) : null}
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    className="w-full whitespace-normal rounded-xl border-2 border-ink bg-paper px-3 py-3 text-center text-sm font-black uppercase leading-tight"
                    onClick={() =>
                      setSelectedCreativeIndex(selectedCreativeIndex)
                    }
                  >
                    Use This Version
                  </button>
                  <button
                    className="w-full whitespace-normal rounded-xl border-4 border-ink bg-stallRed px-4 py-3 text-center text-sm font-black uppercase leading-tight text-white shadow-brutal disabled:opacity-50"
                    disabled={isPending}
                    onClick={() => void publish()}
                  >
                    {isPending ? "Publishing..." : "Publish This Version"}
                  </button>
                  <button
                    className="w-full whitespace-normal rounded-xl border-4 border-ink bg-stallPurple px-4 py-3 text-center text-sm font-black uppercase leading-tight text-white shadow-brutal disabled:opacity-50"
                    disabled={isGenerating}
                    onClick={() => void generateCampaign(true)}
                  >
                    Regenerate
                  </button>
                  <button
                    className="w-full whitespace-normal rounded-xl border-4 border-ink bg-paper px-4 py-3 text-center text-sm font-black uppercase leading-tight shadow-brutal disabled:opacity-50"
                    disabled={!selectedCreative.imageUrl}
                    onClick={downloadSelectedCreative}
                  >
                    Download Image
                  </button>
                </div>
                {publishMessage ? (
                  <p className="rounded-xl border-2 border-green-700 bg-green-50 p-3 text-sm font-black uppercase text-green-800">
                    {publishMessage}
                  </p>
                ) : null}
                {publishError ? (
                  <p className="rounded-xl border-2 border-stallRed bg-red-50 p-3 text-sm font-black uppercase text-stallRed">
                    {publishError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-between gap-3 border-t-4 border-ink pt-4">
        <button
          className="rounded-xl border-2 border-ink bg-paper px-4 py-2 font-black uppercase"
          onClick={() => setStep(Math.max(1, step - 1))}
        >
          Back
        </button>
        {step < 5 ? (
          <button
            className="rounded-xl border-2 border-ink bg-stallYellow px-4 py-2 font-black uppercase"
            onClick={() => setStep(Math.min(5, step + 1))}
          >
            Next
          </button>
        ) : null}
        <button
          title={
            !canGenerate
              ? `Complete required fields: ${missingRequired.join(", ")}`
              : selectedCreative
                ? "Campaign generated and ready to publish"
                : "Generate AI ad copy and image creative"
          }
          className={`rounded-xl border-4 border-ink px-5 py-3 font-black uppercase text-white shadow-brutal disabled:cursor-not-allowed disabled:opacity-60 ${selectedCreative ? "bg-green-700" : !canGenerate ? "bg-stallPurple/70" : "bg-stallPurple"}`}
          disabled={!canGenerate || isGenerating}
          onClick={() => void generateCampaign(false)}
        >
          {generateButtonLabel}
        </button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <HistoryPanel
          title="Database Campaign History"
          items={history}
          onLoad={(item) => {
            setCreatives([item]);
            setSelectedCreativeIndex(0);
            if (item.selectedSlot) setSlotNumber(String(item.selectedSlot));
            if (item.targetUrl) update("website", item.targetUrl);
            setStep(5);
          }}
          onDelete={(item) => void deleteCampaignFromHistory(item)}
        />
        <div className="rounded-2xl border-4 border-ink bg-white p-4">
          <h3 className="font-display text-4xl uppercase">
            Published Ad History
          </h3>
          <PublishedHistoryPanel
            items={history.filter((item) => item.publishStatus === "PUBLISHED")}
            onDelete={(item) => void deleteCampaignFromHistory(item, true)}
          />
        </div>
      </div>

      <p className="mt-6 text-sm font-bold text-ink/70">
        {publishTargetContext}. Restroom options loaded: {restrooms.length}.
        Publisher:{" "}
        {publishers.find((publisher) => publisher.id === form.publisherId)
          ?.name || "None"}
        . Advertiser:{" "}
        {advertisers.find((advertiser) => advertiser.id === form.advertiserId)
          ?.name || "None"}
        .
      </p>
    </section>
  );
}

function PublishingConfigWarning() {
  return <WarningCard message={ENV_WARNING_MESSAGE} />;
}

function WarningCard({ message }: { message: string }) {
  return (
    <div
      className="mb-6 rounded-2xl border-4 border-stallRed bg-red-50 p-4 font-black uppercase text-stallRed shadow-brutal"
      role="alert"
    >
      {message}
    </div>
  );
}

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: Error | null };

class AdStudioErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <section
          className="rounded-[2rem] border-4 border-stallRed bg-red-50 p-6 shadow-brutal"
          role="alert"
        >
          <h1 className="font-display text-5xl uppercase text-stallRed">
            Ad Studio failed to render
          </h1>
          <p className="mt-2 font-black uppercase text-stallRed">
            The admin page is still available. Reload Ad Studio or check the
            browser console for the upload/render error.
          </p>
          {!isPublishingConfigured ? (
            <p className="mt-3 rounded-xl border-2 border-stallRed bg-white p-3 font-black uppercase text-stallRed">
              {ENV_WARNING_MESSAGE}
            </p>
          ) : null}
        </section>
      );
    }

    return this.props.children;
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block font-black uppercase">
      {label}
      <input
        className="mt-2 w-full rounded-xl border-2 border-ink bg-white p-3 font-bold normal-case"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ChoiceGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 font-display text-4xl uppercase">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            className={`rounded-2xl border-2 border-ink p-3 font-black uppercase ${value === option ? "bg-stallYellow" : "bg-paper"}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof Image === "undefined") {
      reject(new Error("Browser image APIs are unavailable."));
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "Unable to load generated image or uploaded logo for compositing.",
        ),
      );
    image.src = src;
  });
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function PreviewCard({ creative }: { creative: GeneratedCreative }) {
  return (
    <article className="rounded-[2rem] border-4 border-ink bg-white p-4 shadow-brutal">
      <p className="mb-2 text-xs font-black uppercase tracking-widest text-stallPurple">
        Preview: 600×180 desktop / 320×100 mobile · {AD_FORMAT_LABEL}
      </p>
      <div
        className={`${sizes[creative.adSize].className} w-full overflow-hidden rounded-2xl border-4 border-ink bg-[#050018]`}
        style={{ width: "min(100%, 600px)", height: "auto" }}
      >
        {creative.imageUrl ? (
          <img
            className="h-full w-full object-contain"
            src={creative.imageUrl}
            alt={`${creative.adSize} generated ad`}
          />
        ) : (
          <FallbackAd creative={creative} />
        )}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase text-stallPurple">
            Business:{" "}
            {shortenLabel(creative.businessName || "Generated Sponsor", 30)}
          </p>
          <h3 className="break-words font-display text-3xl uppercase leading-none md:text-4xl">
            {shortenLabel(creative.headline, 38)}
          </h3>
          <p className="mt-2 break-words font-bold">
            {shortenLabel(creative.subheadline, 58)}
          </p>
          <p className="mt-2 break-words font-black uppercase text-stallRed">
            {shortenLabel(creative.ctaText, 20)} •{" "}
            {shortenLabel(creative.couponCode, 18)}
          </p>
          {creative.imageFallback ? (
            <p className="mt-2 text-xs font-black uppercase text-stallPurple">
              Styled fallback preview: {creative.imageError}
            </p>
          ) : null}
          {creative.historySaved === false ? (
            <p className="mt-2 text-xs font-black uppercase text-stallRed">
              History save failed: {creative.historyError}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border-2 border-ink bg-paper p-3">
          <p className="text-xs font-black uppercase tracking-widest text-stallRed">
            Prompt used
          </p>
          <p className="mt-2 max-h-44 overflow-y-auto break-words text-sm font-bold">
            {creative.promptUsed}
          </p>
          <p className="mt-2 text-xs font-black uppercase text-stallPurple">
            Model:{" "}
            {creative.model ||
              creative.diagnostic?.model ||
              "configured server model"}
          </p>
        </div>
      </div>
    </article>
  );
}

function FallbackAd({ creative }: { creative: GeneratedCreative }) {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(255,216,76,.95),transparent_28%),linear-gradient(135deg,#13091f_0%,#33206f_48%,#0f5a78_100%)] p-8 text-white">
      <div
        className="absolute inset-5 rounded-[2rem] border border-white/25"
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black uppercase tracking-wide text-ink shadow-brutal">
          Logo
        </div>
        <span className="rounded-full border border-white/40 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.22em]">
          Fallback Preview
        </span>
      </div>
      <div className="relative max-w-[78%]">
        <p className="mb-3 text-sm font-black uppercase tracking-[.25em] text-stallYellow">
          {creative.businessName || "Generated Sponsor"}
        </p>
        <h3 className="font-display text-5xl uppercase leading-[.86] drop-shadow md:text-7xl">
          {creative.headline}
        </h3>
        <p className="mt-4 rounded-2xl bg-white/15 p-3 text-xl font-black leading-tight backdrop-blur">
          {creative.subheadline}
        </p>
      </div>
      <div className="relative flex flex-wrap items-center gap-3">
        {creative.couponCode ? (
          <span className="rounded-full border-2 border-dashed border-white bg-white px-5 py-3 text-sm font-black uppercase text-stallRed shadow-brutal">
            Code {creative.couponCode}
          </span>
        ) : null}
        <span className="rounded-full bg-stallYellow px-6 py-3 text-sm font-black uppercase text-ink shadow-brutal">
          {creative.ctaText}
        </span>
      </div>
    </div>
  );
}

function StatusPanel({ diagnostic }: { diagnostic: ApiDiagnostic }) {
  return (
    <div className="mt-3 grid gap-2 rounded-xl border-2 border-ink bg-paper p-3 text-xs font-black uppercase md:grid-cols-4">
      <span>API: {diagnostic.apiStatus || "unknown"}</span>
      <span>OpenAI: {diagnostic.openAiStatus || "unknown"}</span>
      <span>Model: {diagnostic.model || "server default"}</span>
      <span>
        {diagnostic.errorType
          ? `Error: ${diagnostic.errorType}`
          : "Image API ready"}
      </span>
    </div>
  );
}

function PublishedHistoryPanel({ items, onDelete }: { items: CampaignHistoryItem[]; onDelete: (item: CampaignHistoryItem) => void }) {
  async function campaignAction(
    campaignId: string,
    action: "unpublish" | "archive",
  ) {
    const response = await fetch("/api/ad-studio/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, action }),
    });
    if (!response.ok)
      throw new Error(`Campaign ${action} failed (${response.status})`);
    window.location.reload();
  }

  return (
    <div className="mt-3 grid gap-2">
      {items.length ? (
        items.map((item) => {
          const href =
            item.targetType === DEFAULT_PUBLIC_ISSUE_ID
              ? "/issue"
              : item.targetUrl || "/issue";
          return (
            <article
              key={item.campaignId}
              className="rounded-xl border-2 border-ink bg-paper p-3"
            >
              <p className="text-xs font-black uppercase text-stallRed">
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleString()
                  : "Published"}{" "}
                • Slot {item.slotPublished || item.selectedSlot || "—"} •{" "}
                {item.publishStatus || "PUBLISHED"}
              </p>
              <h4 className="font-black uppercase">{item.businessName}</h4>
              <p className="text-sm font-bold">{item.headline}</p>
              <p className="text-xs font-black uppercase text-stallPurple">
                {item.targetLabel || "Default Public Issue"}
              </p>
              <p className="text-xs font-black uppercase">Views: {item.viewCount || 0} • Clicks: {item.clickCount || 0} • CTR: {item.viewCount ? `${Math.round(((item.clickCount || 0) / item.viewCount) * 1000) / 10}%` : "0%"} • Last clicked: {item.lastClickedAt ? new Date(item.lastClickedAt).toLocaleString() : "Never"}</p>
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-ink/20 bg-white p-2">
                <span
                  className={`text-xs font-black uppercase ${item.imageUrl ? "text-green-700" : "text-stallRed"}`}
                >
                  {item.imageUrl ? "IMAGE OK" : "MISSING IMAGE"}
                </span>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={`${item.businessName} published ad thumbnail`}
                    className="h-10 w-28 rounded border border-ink bg-[#050018] object-contain"
                  />
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  className="rounded bg-white px-2 py-1 text-xs font-black uppercase"
                  href={href}
                >
                  View on issue
                </a>
                <button
                  className="rounded bg-white px-2 py-1 text-xs font-black uppercase"
                  onClick={() => campaignAction(item.campaignId, "unpublish")}
                >
                  Unpublish
                </button>
                <button
                  className="rounded bg-white px-2 py-1 text-xs font-black uppercase"
                  onClick={() => campaignAction(item.campaignId, "archive")}
                >
                  Archive
                </button>
                <button
                  className="rounded bg-stallRed px-2 py-1 text-xs font-black uppercase text-white"
                  onClick={() => onDelete(item)}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })
      ) : (
        <p className="rounded-xl border-2 border-dashed border-ink p-4 font-bold">
          No published database ads yet.
        </p>
      )}
    </div>
  );
}

function HistoryPanel({
  title,
  items,
  onLoad,
  onDelete,
}: {
  title: string;
  items: CampaignHistoryItem[];
  onLoad: (item: CampaignHistoryItem) => void;
  onDelete: (item: CampaignHistoryItem) => void;
}) {
  async function campaignAction(
    campaignId: string,
    action: "unpublish" | "archive" | "duplicate",
  ) {
    const method = action === "duplicate" ? "POST" : "PATCH";
    const response = await fetch("/api/ad-studio/campaigns", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, action }),
    });
    if (!response.ok)
      throw new Error(`Campaign ${action} failed (${response.status})`);
    window.location.reload();
  }

  return (
    <div className="rounded-2xl border-4 border-ink bg-white p-4">
      <h3 className="font-display text-4xl uppercase">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.campaignId}
              className="rounded-xl border-2 border-ink bg-paper p-3 text-left"
            >
              <button className="w-full text-left" onClick={() => onLoad(item)}>
                <p className="text-xs font-black uppercase text-stallRed">
                  {new Date(item.createdAt).toLocaleString()} • {item.adSize} •{" "}
                  {item.publishStatus || "GENERATED"}
                </p>
                <h4 className="font-black uppercase">{item.businessName}</h4>
                <p className="text-sm font-bold">{item.headline}</p>
                <span className="mt-2 inline-block rounded-full bg-ink px-3 py-1 text-xs font-black uppercase text-white">
                  Reuse / Republish
                </span>
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="rounded bg-white px-2 py-1 text-xs font-black uppercase"
                  onClick={() => campaignAction(item.campaignId, "duplicate")}
                >
                  Duplicate
                </button>
                <button
                  className="rounded bg-white px-2 py-1 text-xs font-black uppercase"
                  onClick={() => campaignAction(item.campaignId, "unpublish")}
                >
                  Unpublish
                </button>
                <button
                  className="rounded bg-white px-2 py-1 text-xs font-black uppercase"
                  onClick={() => campaignAction(item.campaignId, "archive")}
                >
                  Archive
                </button>
                <button
                  className="rounded bg-stallRed px-2 py-1 text-xs font-black uppercase text-white"
                  onClick={() => onDelete(item)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-xl border-2 border-dashed border-ink p-4 font-bold">
            No saved database campaigns yet.
          </p>
        )}
      </div>
    </div>
  );
}
