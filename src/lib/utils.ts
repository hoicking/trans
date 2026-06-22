import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function hasCjkText(input: string) {
  return /[\u3400-\u9fff]/.test(input);
}

function stableKeyHash(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}

export function slugKey(input: string) {
  const fallback = "translation_key";
  const value = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

  const base = value || fallback;
  return hasCjkText(input) ? `${base}_${stableKeyHash(input)}` : base;
}

export function semanticKey(input: string) {
  const words = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g);

  if (!words?.length) return slugKey(input);

  const stopWords = new Set([
    "a",
    "an",
    "the",
    "to",
    "of",
    "for",
    "and",
    "or",
    "is",
    "are",
    "you",
    "your",
    "this",
    "that"
  ]);

  const semanticWords = words.filter((word) => !stopWords.has(word)).slice(0, 4);
  if (!semanticWords.length) return slugKey(input);
  const base = semanticWords.join("_");
  return hasCjkText(input) ? `${base}_${stableKeyHash(input)}` : base;
}

export function uniqueKey(baseKey: string, existingKeys: Iterable<string>) {
  const existing = new Set(existingKeys);
  if (!existing.has(baseKey)) return baseKey;

  let index = 2;
  let nextKey = `${baseKey}_${index}`;
  while (existing.has(nextKey)) {
    index += 1;
    nextKey = `${baseKey}_${index}`;
  }

  return nextKey;
}
