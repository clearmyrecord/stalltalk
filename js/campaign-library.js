import { archiveCampaign, duplicateCampaign, getCampaignLibrary, publishCampaign, unpublishCampaign, updateCampaign } from "./campaign-service.js";
import { downloadAdImage } from "./download-ad.js";

export async function loadCampaignLibrary() {
  return getCampaignLibrary();
}

export async function reuseCampaign(campaign, placement) {
  return updateCampaign(campaign.id, { ...campaign, placement, status: "draft", published_at: null });
}

export const CampaignLibraryActions = { loadCampaignLibrary, reuseCampaign, duplicateCampaign, archiveCampaign, unpublishCampaign, publishCampaign, downloadAdImage };

window.StallTalkCampaignLibrary = CampaignLibraryActions;
