export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed. Use POST."
    });
  }

  try {
    const {
      sponsorName = "Local Sponsor",
      offer = "A featured local offer",
      category = "Local Business",
      city = "Las Vegas",
      tone = "bold, premium, funny, clean",
      callToAction = "Scan to Learn More",
      slot = "standard"
    } = req.body || {};

    const prompt = `
Create an agency-quality restroom publication display ad for Potty Favor / Stall Talk.

Ad format:
- Wide horizontal digital ad
- 16:5 aspect ratio
- Designed for mobile-first restroom QR publication
- Bold, clean, premium, high-converting
- Must look like a professional local advertising agency created it

Sponsor:
${sponsorName}

Category:
${category}

City/Market:
${city}

Offer:
${offer}

Call to action:
${callToAction}

Tone:
${tone}

Creative direction:
- Eye-catching headline area
- Strong visual hierarchy
- Premium lighting and realistic commercial photography style
- Leave safe space for headline, subheadline, sponsor name, and CTA button
- No tiny unreadable text
- Avoid clutter
- Make it feel like a polished paid advertisement
- Do not include fake QR codes
- Do not include misspelled text
- Do not use copyrighted logos unless provided
`.trim();

    const openaiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1536x1024"
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return res.status(openaiResponse.status).json({
        error: data.error?.message || "OpenAI image generation failed",
        details: data
      });
    }

    const imageBase64 = data.data?.[0]?.b64_json;

    return res.status(200).json({
      ok: true,
      imageBase64,
      prompt,
      metadata: {
        sponsorName,
        offer,
        category,
        city,
        tone,
        callToAction,
        slot
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Image generation failed"
    });
  }
}
