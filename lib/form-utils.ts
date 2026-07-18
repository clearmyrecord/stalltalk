export function htmlCheckboxValue(formData: FormData, key: string) {
  return formData.has(key);
}

export function normalizeSectionPositions<T extends { requestedSortOrder?: number; sortOrder?: number }>(blocks: T[]) {
  return [...blocks]
    .sort((a, b) => (a.requestedSortOrder ?? a.sortOrder ?? 0) - (b.requestedSortOrder ?? b.sortOrder ?? 0))
    .map(({ requestedSortOrder, ...block }, index) => ({ ...(block as Omit<T, "requestedSortOrder">), sortOrder: index + 1 }));
}
