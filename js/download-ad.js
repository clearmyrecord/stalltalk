export function campaignSlug(name) {
  return String(name || "campaign").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";
}

export async function downloadAdImage(campaign) {
  const response = await fetch(campaign.image_url || campaign.imageUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pottyfavor-content-ad-placement-${campaign.placement}-${campaignSlug(campaign.name)}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

window.StallTalkDownloadAd = { downloadAdImage, campaignSlug };
