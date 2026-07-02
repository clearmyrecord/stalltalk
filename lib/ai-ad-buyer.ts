export type AiBuyerBrief = {
  businessName: string;
  website?: string;
  logoImageUrl?: string;
  photoUrls?: string[];
  industry?: string;
  offer?: string;
  city?: string;
  state?: string;
  zip?: string;
  budget?: number;
  goal: string;
  prompt: string;
};

export type AiAdConcept = {
  id: string;
  headline: string;
  offer: string;
  body: string;
  cta: string;
  colorPalette: string[];
  imagePrompt: string;
  suggestedFit: string;
};

const palettes = [
  ["#111111", "#f8f1df", "#e23d28"],
  ["#111111", "#ffd400", "#ffffff"],
  ["#4b2e83", "#f8f1df", "#e23d28"],
  ["#111111", "#7bdff2", "#ffd400"],
];

export function fallbackConcepts(brief: AiBuyerBrief): AiAdConcept[] {
  const name = brief.businessName.trim();
  const offer = brief.offer?.trim() || "A special local offer";
  const city = [brief.city, brief.state].filter(Boolean).join(", ") || "nearby guests";
  const goal = brief.goal.trim().toLowerCase();
  return ["Bold", "Local", "Deal", "Social"].map((angle, index) => ({
    id: `fallback-${index + 1}`,
    headline: index === 0 ? `${name} Is Calling` : `${angle} Pick: ${name}`,
    offer,
    body: `Reach ${city} with a simple ${goal} message: ${brief.prompt.trim()}`,
    cta: index % 2 ? "Claim the Offer" : "Learn More",
    colorPalette: palettes[index],
    imagePrompt: `Potty Favor mobile sponsor ad for ${name}, ${brief.industry || "local business"}, ${offer}, bold high-contrast poster style`,
    suggestedFit: `${angle} creative for ${brief.industry || "local"} audiences and ${brief.goal} campaigns.`,
  }));
}

export async function generateAiAdConcepts(brief: AiBuyerBrief): Promise<AiAdConcept[]> {
  if (!process.env.OPENAI_API_KEY) return fallbackConcepts(brief);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return JSON with a concepts array of exactly 4 ad concepts. Each concept needs id, headline, offer, body, cta, colorPalette array, imagePrompt, suggestedFit. Keep copy concise for restroom media sponsor cards." },
          { role: "user", content: JSON.stringify(brief) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
    const json = await response.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content || "{}");
    if (Array.isArray(parsed.concepts) && parsed.concepts.length >= 4) return parsed.concepts.slice(0, 4);
  } catch (error) {
    console.error("[ai-buyer-concepts] falling back", error);
  }
  return fallbackConcepts(brief);
}
