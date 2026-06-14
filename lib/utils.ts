import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { slugify as trSlugify } from "transliteration";
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
/** Slugify with `-` separator. Supports CJK, Vietnamese, etc. */
export function toSlug(text: string): string {
    return trSlugify(text);
}
/** Slugify with `_` separator. Supports CJK, Vietnamese, etc. */
export function toSlugUnderscore(text: string): string {
    return trSlugify(text, { separator: "_" });
}
/** Slugify with `_` separator, UPPER CASE. Supports CJK, Vietnamese, etc. */
export function toSlugUpperCase(text: string): string {
    return trSlugify(text, { separator: "_" }).toUpperCase();
}
/** Build a safe lowercase snake_case code name that always starts with a letter. */
export function toSafeCodeName(text: string, fallbackPrefix = "container"): string {
    const slug = toSlugUnderscore(text).toLowerCase().replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    if (!slug)
        return "";
    return /^[a-z]/.test(slug) ? slug : `${fallbackPrefix}_${slug}`;
}
