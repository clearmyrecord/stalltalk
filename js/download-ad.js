export function campaignDownloadFilename(slotId, placement, campaignName = "campaign") {
  const safeName = campaignName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "campaign";
  return `pottyfavor-${slotId}-placement-${placement}-${safeName}.png`;
}

export async function downloadAdImage(imageUrl, slotId, placement, campaignName) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Unable to download ad image.");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = campaignDownloadFilename(slotId, placement, campaignName);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
