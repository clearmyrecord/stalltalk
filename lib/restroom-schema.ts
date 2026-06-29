import { prisma } from "@/lib/prisma";

export type RestroomTypeFields = {
  id?: string | null;
  name?: string | null;
  restroomType?: string | null;
  customTypeLabel?: string | null;
};

export const restroomBaseSelect = {
  id: true,
  venueId: true,
  name: true,
  slug: true,
  floor: true,
  placement: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const restroomLabelSelect = {
  id: true,
  name: true,
  slug: true,
} as const;

export function restroomTypedSelect(includeTypeColumns: boolean) {
  return includeTypeColumns
    ? {
        ...restroomLabelSelect,
        restroomType: true,
        customTypeLabel: true,
      }
    : restroomLabelSelect;
}

export async function hasRestroomTypeColumns() {
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Restroom'
      AND column_name IN ('restroomType', 'customTypeLabel')
  `;
  const names = new Set(columns.map((column) => column.column_name));
  return names.has("restroomType") && names.has("customTypeLabel");
}

export function restroomTypeLabel(restroom: RestroomTypeFields) {
  return (
    restroom.customTypeLabel ||
    (restroom.restroomType || "ALL_GENDER").replaceAll("_", " ")
  );
}
