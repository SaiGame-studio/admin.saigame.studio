// /llms.txt (llmstxt.org): a Markdown summary of the public pages for AI assistants and answer engines.
// The tutorial list comes from the Learning Center (CMS categories and the static Tutorials and Tips tabs).
import { APP_URL } from "@/lib/structured-data";
import { STATIC_SECTIONS } from "@/lib/tutorial-static-sections";
import { findRootForPath, getCategoryTrail } from "@/lib/tutorials/categories";
import { getTutorialLeaves } from "@/lib/tutorials/server";
import { getStaticArticleTitle, translateEn } from "@/lib/tutorials/static-articles-server";

// Rebuilt at most once an hour, like the sitemap.
export const revalidate = 3600;

const link = (title: string, path: string, note?: string) => `- [${title}](${APP_URL}${path})${note ? `: ${note}` : ""}`;
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

async function body(): Promise<string> {
    const { roots, leaves } = await getTutorialLeaves();
    const lines = [
        "# Sai Server",
        "",
        "> Sai Server is a game backend platform by SaiGame: accounts, cloud save, inventory, in-game economy, quests, leaderboards, analytics and server-side Lua scripting, managed from one web admin and connected to a Unity game through the SaiServer prefab.",
        "",
        "This site is the Sai Server web admin. Its public pages explain the product, host the Learning Center tutorials and link the Unity SDK; everything else needs a signed-in account. Product page and pricing: https://saigame.studio/products/sai-server/",
        "",
        "## Start here",
        "",
        link("Why Sai Server", "/why-sai-server", "what Sai Server offers studios and how it integrates with Unity"),
        link("Download SDK", "/download-sdk", "the Sai Server Unity SDK, the API documentation and the Postman collection"),
        link("Learning Center", "/tutorials", "all tutorials, grouped by topic"),
    ];
    // Static tabs first: Tutorials is the new version of the Basic tab.
    for (const section of STATIC_SECTIONS) {
        lines.push("", `## ${translateEn(section.tabLabelKey)}`, "");
        section.articles.forEach((article) => lines.push(link(getStaticArticleTitle(article), `/tutorials/${section.path}/${article.slug}`)));
    }
    for (const root of roots) {
        const rootLeaves = leaves.filter(({ category }) => findRootForPath(roots, category.path)?.id === root.id && category.id !== root.id);
        const items = rootLeaves.flatMap(({ category, items: articles }) => {
            const topic = getCategoryTrail(roots, category.path).slice(1).map((cat) => cat.name).join(" › ");
            return articles.map((item) => link(`${topic}: ${item.title}`, `/tutorials/${category.path}/${item.slug}`, item.description ? oneLine(item.description) : undefined));
        });
        if (items.length > 0)
            lines.push("", `## ${root.name}`, "", ...items);
    }
    lines.push("");
    return lines.join("\n");
}

export async function GET() {
    return new Response(await body(), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
