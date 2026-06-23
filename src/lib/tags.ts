export const maxTagNameLength = 60;
export const defaultTagColor = "#71717a";
export const tagColorPalette = [
  "#71717a",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#65a30d",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#9333ea",
  "#4f46e5",
  "#0f766e"
];

export function normalizeTagName(tagName: string) {
  return tagName.trim().replace(/\s+/g, " ");
}

export function normalizeTagColor(color?: string | null) {
  const value = color?.trim().toLowerCase() ?? "";
  return /^#[0-9a-f]{6}$/.test(value) ? value : defaultTagColor;
}

export function isValidTagName(tagName: string) {
  const normalized = normalizeTagName(tagName);
  return Boolean(normalized && normalized.length <= maxTagNameLength);
}

export function uniqueTagNames(tagNames: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawTagName of tagNames) {
    const tagName = normalizeTagName(rawTagName);
    if (!tagName || tagName.length > maxTagNameLength || seen.has(tagName)) continue;
    seen.add(tagName);
    result.push(tagName);
  }

  return result;
}
