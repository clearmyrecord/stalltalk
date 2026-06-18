(function () {
  "use strict";

  const CAMPAIGNS_KEY = "stalltalk_campaigns_v1";
  const ACTIVE_KEY = "stalltalk_active_campaigns_v1";

  function readJson(key, fallback) {
    try { return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function writeJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function now() { return new Date().toISOString(); }

  function slug(value) {
    return String(value || "campaign").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";
  }

  // Storage boundary: replace this object with a Supabase-backed adapter later for
  // authenticated, multi-user campaign persistence and publishing.
  const store = {
    keys: { campaigns: CAMPAIGNS_KEY, active: ACTIVE_KEY },
    listCampaigns() { return readJson(CAMPAIGNS_KEY, []); },
    getCampaign(id) { return this.listCampaigns().find((campaign) => campaign.id === id) || null; },
    saveCampaign(campaign) {
      const campaigns = this.listCampaigns();
      const existingIndex = campaigns.findIndex((item) => item.id === campaign.id);
      const saved = { ...campaign, id: campaign.id || crypto.randomUUID(), status: campaign.status || "draft", createdAt: campaign.createdAt || now(), updatedAt: now() };
      if (existingIndex >= 0) campaigns[existingIndex] = saved; else campaigns.unshift(saved);
      writeJson(CAMPAIGNS_KEY, campaigns);
      return saved;
    },
    duplicateCampaign(id) {
      const original = this.getCampaign(id);
      if (!original) return null;
      return this.saveCampaign({ ...original, id: crypto.randomUUID(), name: `${original.name} Copy`, status: "draft", createdAt: now(), updatedAt: now() });
    },
    listPublished() { return Object.values(readJson(ACTIVE_KEY, {})); },
    publishCampaign(campaign) {
      const saved = this.saveCampaign({ ...campaign, status: "published" });
      const active = readJson(ACTIVE_KEY, {});
      active[saved.slotId] = saved;
      writeJson(ACTIVE_KEY, active);
      return saved;
    },
    slug
  };

  window.StallTalkCampaignStore = store;
})();
