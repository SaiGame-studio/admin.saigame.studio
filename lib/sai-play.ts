/** Sai Play (player site) base URL, used for links from the Studio site. */
export const SAI_PLAY_URL = (process.env.NEXT_PUBLIC_PLAY_URL ?? "https://play.saigame.studio").replace(/\/+$/, "");

/** Sai Play game page opened on the Shops tab with the given shop selected. */
export function saiPlayShopUrl(gameId: string, shopId: string): string {
    const params = new URLSearchParams({ tab: "shops", shop: shopId });
    return `${SAI_PLAY_URL}/games/${encodeURIComponent(gameId)}?${params.toString()}`;
}
