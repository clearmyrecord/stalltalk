(function () {
  "use strict";

  const AD_SLOTS = {
    "hero-ad": { id: "hero-ad", label: "Hero Ad", width: 728, height: 90, selector: '[data-ad-slot="hero-ad"]' },
    "sidebar-ad": { id: "sidebar-ad", label: "Sidebar Ad", width: 300, height: 250, selector: '[data-ad-slot="sidebar-ad"]' },
    "inline-ad": { id: "inline-ad", label: "Inline Ad", width: 320, height: 100, selector: '[data-ad-slot="inline-ad"]' },
    "footer-ad": { id: "footer-ad", label: "Footer Ad", width: 728, height: 90, selector: '[data-ad-slot="footer-ad"]' }
  };

  function getAdSlot(slotId) {
    return AD_SLOTS[slotId] || null;
  }

  window.StallTalkAdSlots = { all: AD_SLOTS, list: Object.values(AD_SLOTS), get: getAdSlot };
})();
