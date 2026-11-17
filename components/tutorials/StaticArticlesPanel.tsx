"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "next-themes";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { SUPPORT_CHAT_OPEN_EVENT } from "@/components/support-chat-widget";
import { useAuth } from "@/contexts/auth-context";
import { useCapabilities } from "@/hooks/use-capabilities";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getStaticArticleBodyUrl, type StaticArticle, type StaticArticleGroup, type StaticSection } from "@/lib/tutorial-static-sections";

async function fetchArticleBody(section: StaticSection, slug: string, locale: string): Promise<string> {
    const response = await fetch(getStaticArticleBodyUrl(section, slug, locale));
    if (!response.ok)
        throw new Error(`Article body not found: ${section.bodyDir}/${slug}.${locale}`);
    return response.text();
}

/** "Click here to chat with us now", where "click here" opens the support chat window. */
function SupportChatLine({ id }: { id: string }) {
    const { t } = useTranslation();
    const [before, after = ""] = t("tutorials.tipChatText").split("{link}");
    return (<p id={id} className="font-medium">
      {before}
      <button id={`${id}-link`} type="button" className="text-primary underline underline-offset-4 hover:opacity-80" onClick={() => window.dispatchEvent(new CustomEvent(SUPPORT_CHAT_OPEN_EVENT))}>
        {t("tutorials.tipChatLink")}
      </button>
      {after}
    </p>);
}

const MENU_ITEM_CLASS = "w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-accent transition-colors no-underline text-inherit";
/** Same indent as the CMS category menu: 30px per level. */
const indent = (level: number) => ({ paddingLeft: `${level * 30 + 12}px` });

function ArticleLink({ section, article, selected, level, onSelect }: {
    section: StaticSection;
    article: StaticArticle;
    selected: boolean;
    level: number;
    onSelect: (slug: string) => void;
}) {
    const { t } = useTranslation();
    const id = `${section.idPrefix}-menu-item-${article.slug}`;
    return (<a id={id} href={`/tutorials/${section.path}/${article.slug}`} onClick={(e) => {
            // Allow Ctrl/Cmd+click or middle-click to open in a new tab natively
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)
                return;
            e.preventDefault();
            onSelect(article.slug);
        }} className={cn(MENU_ITEM_CLASS, selected && "bg-accent font-medium")} style={indent(level)}>
      <span id={`${id}-number`} className="text-muted-foreground">#{article.number}</span>
      {t(article.titleKey)}
    </a>);
}

/** A collapsible parent entry; it opens by itself when it holds the selected article. */
function ArticleGroup({ section, group, articles, selectedSlug, onSelect }: {
    section: StaticSection;
    group: StaticArticleGroup;
    articles: StaticArticle[];
    selectedSlug: string;
    onSelect: (slug: string) => void;
}) {
    const { t } = useTranslation();
    const holdsSelected = articles.some((article) => article.slug === selectedSlug);
    const [isOpen, setIsOpen] = useState(holdsSelected);
    useEffect(() => {
        if (holdsSelected)
            setIsOpen(true);
    }, [holdsSelected]);
    const id = `${section.idPrefix}-menu-group-${group.key}`;
    return (<div id={id}>
      <button id={`${id}-toggle`} type="button" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} className={MENU_ITEM_CLASS} style={indent(0)}>
        {t(group.titleKey)}
        <span id={`${id}-meta`} className="ml-auto flex items-center gap-1">
          <span id={`${id}-count`} className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 leading-none">{articles.length}</span>
          {isOpen ? <ChevronDown className="h-3 w-3 flex-shrink-0"/> : <ChevronRight className="h-3 w-3 flex-shrink-0"/>}
        </span>
      </button>
      {isOpen && (<div id={`${id}-items`}>
          {articles.map((article) => (<ArticleLink key={article.slug} section={section} article={article} selected={article.slug === selectedSlug} level={1} onSelect={onSelect}/>))}
        </div>)}
    </div>);
}

/** The left menu in article order: ungrouped articles as items, grouped ones under their group (placed where its first article is). */
function ArticleMenu({ section, selectedSlug, onSelect }: {
    section: StaticSection;
    selectedSlug: string;
    onSelect: (slug: string) => void;
}) {
    const placed = new Set<string>();
    return (<nav id={`${section.idPrefix}-menu`} className="space-y-1 border-b pb-4 md:w-56 md:flex-shrink-0 md:border-b-0 md:border-r md:pb-0 md:pr-4">
      {section.articles.map((article) => {
            const group = article.group ? section.groups?.find((item) => item.key === article.group) : undefined;
            if (!group)
                return (<ArticleLink key={article.slug} section={section} article={article} selected={article.slug === selectedSlug} level={0} onSelect={onSelect}/>);
            if (placed.has(group.key))
                return null;
            placed.add(group.key);
            return (<ArticleGroup key={`group-${group.key}`} section={section} group={group} articles={section.articles.filter((item) => item.group === group.key)} selectedSlug={selectedSlug} onSelect={onSelect}/>);
        })}
    </nav>);
}

/** Left menu of a static section (Tutorials, Tips) plus the selected article; the first article is shown when none is selected. */
export function StaticArticlesPanel({ section, selectedSlug, onSelect }: {
    section: StaticSection;
    selectedSlug: string | null;
    onSelect: (slug: string) => void;
}) {
    const { locale } = useLanguage();
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const { isAuthenticated } = useAuth();
    const { is_super_admin } = useCapabilities();
    // Live chat is only for signed-in users; super admins answer chats instead of opening one.
    const canChat = isAuthenticated && !is_super_admin;
    const article = section.articles.find((item) => item.slug === selectedSlug) ?? section.articles[0];
    const [body, setBody] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const title = `#${article.number} ${t(article.titleKey)}`;
    const id = section.idPrefix;

    useEffect(() => {
        let cancelled = false;
        setBody(null);
        setFailed(false);
        // Fall back to English when a translation is missing.
        fetchArticleBody(section, article.slug, locale)
            .catch((error) => (locale === "en" ? Promise.reject(error) : fetchArticleBody(section, article.slug, "en")))
            .then((text) => { if (!cancelled) setBody(text); })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [section, article.slug, locale]);

    useEffect(() => {
        // Delay to override the Next.js metadata reset, as the CMS tabs do.
        const timer = setTimeout(() => { document.title = `${title} | Sai Game`; }, 100);
        return () => clearTimeout(timer);
    }, [title]);

    return (<div id={id} className="flex flex-col gap-4 md:flex-row md:gap-6">
      <ArticleMenu section={section} selectedSlug={article.slug} onSelect={onSelect}/>
      <div id={`${id}-detail`} className="flex-1 min-w-0">
        <div id={`${id}-article`} className={cn(section.bordered && "border rounded-lg p-4 sm:p-6")}>
          <h2 id={`${id}-title`} className="text-2xl font-bold break-words mb-4 sm:text-3xl lg:text-4xl">{title}</h2>
          {body !== null ? (<div id={`${id}-body`} className={cn("prose prose-sm max-w-none", resolvedTheme?.includes("dark") && "prose-invert")}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              {article.supportChat && canChat && (<SupportChatLine id={`${id}-chat-${article.slug}`}/>)}
            </div>) : failed ? (<p id={`${id}-error`} className="text-muted-foreground text-sm">{t(section.loadFailedKey)}</p>) : (<div id={`${id}-loading`} className="flex items-center gap-2 text-muted-foreground">
              <Loader2 id={`${id}-loading-icon`} className="h-4 w-4 animate-spin"/>
              <span id={`${id}-loading-text`} className="text-sm">{t("tutorials.loadingContent")}</span>
            </div>)}
        </div>
      </div>
    </div>);
}
