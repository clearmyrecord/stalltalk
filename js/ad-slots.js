export const CONTENT_AD_SLOT = {
  id: "content-ad",
  label: "Content Sponsor Card",
  width: 320,
  height: 100,
  selector: '[data-ad-slot="content-ad"]'
};

export const AD_SLOTS = { "content-ad": CONTENT_AD_SLOT };

export function getAdSlot(slotId = "content-ad") {
  return AD_SLOTS[slotId] || null;
}

export function getPlacementSlots(root = document) {
  return Array.from(root.querySelectorAll(CONTENT_AD_SLOT.selector));
}

window.StallTalkAdSlots = { all: AD_SLOTS, list: [CONTENT_AD_SLOT], get: getAdSlot, placements: getPlacementSlots };
