export const AD_ASPECT_RATIO = 3 / 1;
export const AD_DESKTOP_WIDTH = 600;
export const AD_DESKTOP_HEIGHT = 180;
export const AD_MOBILE_WIDTH = 320;
export const AD_MOBILE_HEIGHT = 100;

export const AD_SLOTS = [
  { id: "content-ad", label: "3:1 Sponsor Banner", width: AD_DESKTOP_WIDTH, height: AD_DESKTOP_HEIGHT, mobileWidth: AD_MOBILE_WIDTH, mobileHeight: AD_MOBILE_HEIGHT, selector: '[data-ad-slot="content-ad"]' }
];

export const AD_SLOT_MAP = Object.freeze(Object.fromEntries(AD_SLOTS.map((slot) => [slot.id, slot])));

export function getAdSlot(slotId = "content-ad") {
  return AD_SLOT_MAP[slotId] || null;
}

export function getSlotAspectRatio(slotId = "content-ad") {
  const slot = getAdSlot(slotId);
  return slot ? "3 / 1" : "3 / 1";
}

export function normalizePlacement(placement) {
  const value = Number.parseInt(String(placement || ""), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}
