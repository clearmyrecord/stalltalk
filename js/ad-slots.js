export const AD_DESKTOP_WIDTH = 1080;
export const AD_DESKTOP_HEIGHT = 1350;
export const AD_MOBILE_WIDTH = 320;
export const AD_MOBILE_HEIGHT = 400;

export const AD_SLOTS = [
  { id: "content-ad", label: "Editorial Magazine Ad", width: AD_DESKTOP_WIDTH, height: AD_DESKTOP_HEIGHT, mobileWidth: AD_MOBILE_WIDTH, mobileHeight: AD_MOBILE_HEIGHT, selector: '[data-ad-slot="content-ad"]' }
];

export function getAdSlot(slotId = "content-ad") {
  return AD_SLOTS.find((slot) => slot.id === slotId) || AD_SLOTS[0];
}

export function getSlotAspectRatio(slotId = "content-ad") {
  const slot = getAdSlot(slotId);
  return `${slot.width} / ${slot.height}`;
}
