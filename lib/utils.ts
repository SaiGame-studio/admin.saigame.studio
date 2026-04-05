import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { slugify as trSlugify } from "transliteration"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Slugify with `-` separator. Supports CJK, Vietnamese, etc. */
export function toSlug(text: string): string {
  return trSlugify(text)
}

/** Slugify with `_` separator. Supports CJK, Vietnamese, etc. */
export function toSlugUnderscore(text: string): string {
  return trSlugify(text, { separator: "_" })
}
