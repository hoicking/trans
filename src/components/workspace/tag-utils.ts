export function formatDateTag(dateValue: string) {
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return "";
  return `${year}/${month}/${day}`;
}

export function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function tagToDateInputValue(tag: string) {
  const match = tag.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : todayDateInputValue();
}

export function latestTagName(tags?: string[]) {
  const dateTags = (tags ?? []).filter((tag) => /^\d{4}\/\d{2}\/\d{2}$/.test(tag));
  return dateTags.sort().at(-1) ?? formatDateTag(todayDateInputValue());
}

export function entryCreatedDate(entryCreatedAt: string) {
  return entryCreatedAt.slice(0, 10);
}
