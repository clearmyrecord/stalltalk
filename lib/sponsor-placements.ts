export const SPONSOR_PLACEMENTS = [
  { number: 1, label: "Hero Sponsor", section: "Hero" },
  { number: 2, label: "Funny Sponsor", section: "Funny" },
  { number: 3, label: "Restaurant Sponsor", section: "Restaurant" },
  { number: 4, label: "Events Sponsor", section: "Events" },
  { number: 5, label: "Deals Sponsor", section: "Deals" },
  { number: 6, label: "Trivia Sponsor", section: "Trivia" },
  { number: 7, label: "Community Sponsor", section: "Community" },
  { number: 8, label: "Footer Sponsor", section: "Footer" },
] as const;

export const SPONSOR_PLACEMENT_COUNT = SPONSOR_PLACEMENTS.length;

export function sponsorPlacement(number?: number | null) {
  return SPONSOR_PLACEMENTS.find((placement) => placement.number === number) || SPONSOR_PLACEMENTS[0];
}

export function sponsorPlacementLabel(number?: number | null) {
  return sponsorPlacement(number).label;
}

export function sponsorPlacementSection(number?: number | null) {
  return sponsorPlacement(number).section;
}
