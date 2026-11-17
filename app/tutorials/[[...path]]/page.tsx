/**
 * /tutorials/{path}: the Learning Center. The interactive page (TutorialsClient) loads its data on the client;
 * this server page adds per-page metadata, structured data and a server-rendered copy of the content for crawlers.
 */
import { cache } from "react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { findStaticSection, getStaticArticleSlugFromPath } from "@/lib/tutorial-static-sections";
import { getCategoryTrail } from "@/lib/tutorials/categories";
import { getTutorialRoots, resolveTutorialPath } from "@/lib/tutorials/server";
import { getStaticArticleForServer } from "@/lib/tutorials/static-articles-server";
import { tutorialArticleJsonLd, tutorialBreadcrumbJsonLd } from "@/lib/structured-data";
import TutorialsClient from "./_components/TutorialsClient";
import { TutorialServerView, type ServerViewData } from "./_components/TutorialServerView";

type Props = { params: Promise<{ path?: string[] }> };

const INDEX_DESCRIPTION = "Step-by-step Sai Server tutorials: get started, cloud save, inventory, in-game economy, quests, leaderboards and server-side Lua scripting.";

const loadView = cache(async (path: string | null): Promise<ServerViewData | null> => {
    if (!path)
        return { kind: "index", roots: await getTutorialRoots() };
    const section = findStaticSection(path);
    if (section) {
        const article = await getStaticArticleForServer(section, getStaticArticleSlugFromPath(section, path));
        return article && { kind: "static", title: article.title, body: article.body, path: `${section.path}/${article.article.slug}`, bordered: section.bordered };
    }
    return resolveTutorialPath(path);
});

const joinPath = async (params: Props["params"]) => (await params).path?.join("/") || null;

/** Plain text for a meta description: markdown marks removed, at most ~160 characters. */
function toDescription(text: string): string {
    const plain = text.replace(/<[^>]+>/g, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`|~-]+/g, " ").replace(/\s+/g, " ").trim();
    return plain.length <= 160 ? plain : `${plain.slice(0, 157).replace(/\s+\S*$/, "")}...`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const path = await joinPath(params);
    const view = await loadView(path);
    // a static tab's own URL shows its first article, so that article's URL is the canonical one
    const canonical = view?.kind === "static" ? `/tutorials/${view.path}` : path ? `/tutorials/${path}` : "/tutorials";
    const page = (title: string, description: string, article?: { published: string; modified: string }): Metadata => ({
        title,
        description,
        alternates: { canonical },
        openGraph: article
            ? { type: "article", url: canonical, title, description, publishedTime: article.published, modifiedTime: article.modified }
            : { type: "website", url: canonical, title, description },
    });
    if (!view || view.kind === "index")
        return page("Sai Server Tutorials", INDEX_DESCRIPTION);
    if (view.kind === "static")
        return page(view.title, toDescription(view.body));
    if (view.kind === "category")
        return page(`${view.category.name} – Sai Server Tutorials`, view.category.description || toDescription([...view.children.map((c) => c.name), ...view.items.map((i) => i.title)].join(", ")) || INDEX_DESCRIPTION);
    const { content } = view;
    return page(content.seo_title || content.title, toDescription(content.seo_description || content.description || content.body), { published: content.published_at, modified: content.updated_at });
}

export default async function TutorialsPage({ params }: Props) {
    const path = await joinPath(params);
    const view = await loadView(path);
    const canonical = path ? `/tutorials/${path}` : "/tutorials";
    const crumbs: [string, string][] = [["Learning Center", "/tutorials"]];
    if (view && (view.kind === "category" || view.kind === "content")) {
        getCategoryTrail(view.roots, view.category.path).forEach((cat) => crumbs.push([cat.name, `/tutorials/${cat.path}`]));
        if (view.kind === "content")
            crumbs.push([view.content.title, canonical]);
    }
    return (<>
      {view?.kind === "content" && (<JsonLd id="tutorials-article-json-ld" data={tutorialArticleJsonLd({
            path: canonical,
            title: view.content.title,
            description: toDescription(view.content.seo_description || view.content.description || view.content.body),
            published: view.content.published_at,
            modified: view.content.updated_at,
        })}/>)}
      {crumbs.length > 1 && (<JsonLd id="tutorials-breadcrumb-json-ld" data={tutorialBreadcrumbJsonLd(crumbs)}/>)}
      <TutorialsClient serverView={view ? <TutorialServerView data={view}/> : undefined}/>
    </>);
}
