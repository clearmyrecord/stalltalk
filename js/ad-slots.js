export const AD_SLOTS = [
  { id: "hero-ad", label: "Hero Ad", width: 728, height: 90, selector: '[data-ad-slot="hero-ad"]' },
  { id: "sidebar-ad", label: "Sidebar Ad", width: 300, height: 250, selector: '[data-ad-slot="sidebar-ad"]' },
  { id: "inline-ad", label: "Inline Ad", width: 320, height: 100, selector: '[data-ad-slot="inline-ad"]' },
  { id: "footer-ad", label: "Footer Ad", width: 728, height: 90, selector: '[data-ad-slot="footer-ad"]' }
];

export const AD_SLOT_MAP = Object.freeze(Object.fromEntries(AD_SLOTS.map((slot) => [slot.id, slot])));

export function getAdSlot(slotId) {
  return AD_SLOT_MAP[slotId] || null;
}

export function getSlotAspectRatio(slotId) {
  const slot = getAdSlot(slotId);
  return slot ? `${slot.width} / ${slot.height}` : "16 / 9";
}
