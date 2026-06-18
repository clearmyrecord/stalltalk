import { AD_SLOTS, getAdSlot } from "./ad-slots.js";
import { resizeImageToSlot, uploadAdToCloudinary } from "./cloudinary-upload.js";
import { archiveCampaign, duplicateCampaign, fetchCampaignLibrary, publishCampaign, reuseCampaign, saveCampaign, unpublishCampaign } from "./campaign-service.js";
import { downloadAdImage } from "./download-ad.js";

const CONTENT_AD_SLOT_ID = "content-ad";

export async function generateResizeUploadAndSave({ generatedImageUrl, campaign }) {
  const slot = getAdSlot(CONTENT_AD_SLOT_ID);
  if (!campaign.placement) throw new Error("Select a content placement before saving.");
  const { blob } = await resizeImageToSlot(generatedImageUrl, slot);
  const cloudinary = await uploadAdToCloudinary(blob, campaign.name || campaign.business_name || "stalltalk-ad");
  return saveCampaign({ ...campaign, slot_id: CONTENT_AD_SLOT_ID, placement: Number(campaign.placement), width: slot.width, height: slot.height, image_url: cloudinary.secure_url });
}

export function createCampaignActionButtons(campaign, { onEdit, onReuse, onRefresh } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "campaign-actions";
  const actions = [
    ["Save Campaign", () => saveCampaign(campaign)],
    ["Publish Campaign", () => publishCampaign(campaign.id, campaign.placement)],
    ["Download Image", () => downloadAdImage(campaign.image_url, CONTENT_AD_SLOT_ID, campaign.placement, campaign.name)],
    ["Duplicate Campaign", () => duplicateCampaign(campaign)],
    ["Reuse Campaign", () => onReuse ? onReuse(reuseCampaign(campaign)) : reuseCampaign(campaign)],
    ["Edit Campaign", () => onEdit ? onEdit(campaign) : campaign],
    ["Unpublish Campaign", () => unpublishCampaign(campaign.id)],
    ["Archive Campaign", () => archiveCampaign(campaign.id)]
  ];

  actions.forEach(([label, handler]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", async () => {
      await handler();
      if (onRefresh) await onRefresh();
    });
    wrapper.append(button);
  });
  return wrapper;
}

export async function mountCampaignLibrary(container, options = {}) {
  const root = typeof container === "string" ? document.querySelector(container) : container;
  if (!root) return;
  root.innerHTML = "";
  const campaigns = await fetchCampaignLibrary(options);
  campaigns.forEach((campaign) => {
    const card = document.createElement("article");
    card.className = "campaign-library-card";
    card.innerHTML = `<h3>${campaign.name || "Untitled campaign"}</h3><p>${campaign.business_name || ""} · Placement ${campaign.placement || "unset"}</p>`;
    card.append(createCampaignActionButtons(campaign, { ...options, onRefresh: () => mountCampaignLibrary(root, options) }));
    root.append(card);
  });
}

export { AD_SLOTS };
