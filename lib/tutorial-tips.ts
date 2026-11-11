/**
 * Static tips shown in the Tips tab of the Learning Center. They are not managed by the CMS:
 * titles live in the translation files and bodies in public/tutorial-tips/{slug}.{locale}.md.
 */

/** Tab value; the leading underscores keep it from clashing with a CMS category slug. */
export const TIPS_TAB = "__tips";
/** URL segment: /tutorials/tips and /tutorials/tips/{tip-slug}. */
export const TIPS_PATH = "tips";

export interface TutorialTip {
    /** Shown as #number in the menu and the title. */
    number: number;
    slug: string;
    titleKey: string;
    /** Shows a "chat with us" line under the tip for signed-in users. */
    supportChat?: boolean;
}

export const TUTORIAL_TIPS: TutorialTip[] = [
    { number: 1, slug: "game-expect-user", titleKey: "tutorials.tips.gameExpectUser" },
    { number: 2, slug: "keep-sdk-unmodified", titleKey: "tutorials.tips.keepSdkUnmodified", supportChat: true },
];

export function isTipsPath(path: string | null): boolean {
    return path === TIPS_PATH || (path?.startsWith(`${TIPS_PATH}/`) ?? false);
}

/** The tip slug in a tips path, or null when the path names no known tip. */
export function getTipSlugFromPath(path: string): string | null {
    const slug = path.slice(TIPS_PATH.length + 1);
    return TUTORIAL_TIPS.some((tip) => tip.slug === slug) ? slug : null;
}

export function getTipBodyUrl(slug: string, locale: string): string {
    return `/tutorial-tips/${slug}.${locale}.md`;
}
