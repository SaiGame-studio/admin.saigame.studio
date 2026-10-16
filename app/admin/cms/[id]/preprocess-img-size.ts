/** Pre-process markdown: convert ![alt](url =WxH) to <img> tags */
export function preprocessImgSize(md: string): string {
    return md.replace(/!\[([^\]]*)\]\((\S+?)\s+=(\d+)?[x×](\d+)?\)/g, (_match, alt, url, w, h) => {
        const attrs = [`src="${url}"`, `alt="${alt}"`];
        if (w)
            attrs.push(`width="${w}"`);
        if (h)
            attrs.push(`height="${h}"`);
        return `<img ${attrs.join(" ")} />`;
    });
}
