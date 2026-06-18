(function () {
  "use strict";

  function clear(element) { while (element.firstChild) element.removeChild(element.firstChild); }

  function renderCampaign(campaign) {
    const link = document.createElement("a");
    link.className = "ad-slot-link";
    link.href = campaign.clickUrl || "#";
    if (/^https?:/i.test(link.href)) { link.target = "_blank"; link.rel = "noopener sponsored"; }
    const img = document.createElement("img");
    img.src = campaign.imageUrl;
    img.alt = campaign.name || campaign.businessName || "Advertisement";
    img.width = campaign.width;
    img.height = campaign.height;
    link.append(img);
    return link;
  }

  function renderPublishedCampaigns() {
    const slots = window.StallTalkAdSlots?.list || [];
    const campaigns = window.StallTalkCampaignStore?.listPublished?.() || [];
    slots.forEach((slot) => {
      document.querySelectorAll(slot.selector).forEach((container) => {
        container.style.setProperty("--ad-slot-width", slot.width);
        container.style.setProperty("--ad-slot-height", slot.height);
        clear(container);
        const campaign = campaigns.find((item) => item.slotId === slot.id && item.imageUrl);
        if (campaign) container.append(renderCampaign(campaign));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", renderPublishedCampaigns);
  window.StallTalkAdRenderer = { renderPublishedCampaigns, renderCampaign };
})();
