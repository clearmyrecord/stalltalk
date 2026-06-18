export const AD_SLOTS = [
  { id: "content-ad", label: "Content Ad", width: 320, height: 100, selector: '[data-ad-slot="content-ad"]' }
];

export const AD_SLOT_MAP = Object.freeze(Object.fromEntries(AD_SLOTS.map((slot) => [slot.id, slot])));

export function getAdSlot(slotId = "content-ad") {
  return AD_SLOT_MAP[slotId] || null;
}

export function getSlotAspectRatio(slotId = "content-ad") {
  const slot = getAdSlot(slotId);
  return slot ? `${slot.width} / ${slot.height}` : "320 / 100";
}

export function normalizePlacement(placement) {
  const value = Number.parseInt(String(placement || ""), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}
