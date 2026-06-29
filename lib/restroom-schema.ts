import { prisma } from "@/lib/prisma";

export type RestroomTypeFields = {
  restroomType?: string | null;
  customTypeLabel?: string | null;
};

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
