"use client";
import { Suspense, useCallback, useEffect, useState, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, ChevronDown, ChevronRight, Clock, Download, Info, Loader2, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useTheme } from "next-themes";
import { TutorialFontSize, useTutorialFontSize } from "@/components/tutorials/TutorialFontSize";
import { StaticArticlesPanel } from "@/components/tutorials/StaticArticlesPanel";
import { GUIDES_SECTION, STATIC_SECTIONS, findStaticSection, findStaticSectionByTab, getStaticArticleSlugFromPath, type StaticSection } from "@/lib/tutorial-static-sections";
import { preprocessImgSize } from "@/lib/tutorials/markdown";
import { DOWNLOAD_SDK_PATH } from "@/lib/sdk-links";
import { extractContentItems, findCategoryById, findCategoryByPath, findRootForPath, getActiveRoots, getAllLeafCategories, getCatName } from "@/lib/tutorials/categories";
import type { Category, ContentDetail, ContentItem } from "@/lib/tutorials/types";
function UpvoteButton({ contentId, count }: {
    contentId: string;
    count?: string | number;
}) {
    const [upvoteCount, setUpvoteCount] = useState(Number(count ?? 0));
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const handleClick = () => {
        if (!isAuthenticated) {
            window.open("/login", "_blank");
            return;
        }
        setConfirmOpen(true);
    };
    const handleConfirm = async () => {
        setConfirmOpen(false);
        if (loading)
            return;
        setLoading(true);
        try {
            const res = await api.post(`/api/v1/contents/${contentId}/upvote`) as {
                upvote_count?: number;
            };
            if (res?.upvote_count != null)
                setUpvoteCount(res.upvote_count);
            else
                setUpvoteCount((c) => c + 1);
            window.dispatchEvent(new Event("wallet:refresh"));
        }
        catch {
            // ignore
        }
        finally {
            setLoading(false);
        }
    };
    return (<>
      <button onClick={handleClick} disabled={loading} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer" title="Upvote">
        <ThumbsUp className="h-5 w-5"/>
        <span className="text-xs font-medium">{upvoteCount}</span>
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('content.confirmUpvoteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('content.confirmUpvoteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>{t('content.confirmUpvoteBtn')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>);
}
function ContentList({ categoryId, categoryPath, initialContentSlug, onSlugNotFound, pendingView }: {
    categoryId: string;
    categoryPath: string;
    initialContentSlug?: string | null;
    onSlugNotFound?: (slug: string) => void;
    /** server-rendered article shown until the client has loaded the same one */
    pendingView?: ReactNode;
}) {
    const [contents, setContents] = useState<ContentItem[]>([]);
    const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
    const [detail, setDetail] = useState<ContentDetail | null>(null);
    const { resolvedTheme } = useTheme();
    const [detailLoading, setDetailLoading] = useState(false);
    const { locale } = useLanguage();
    const { t } = useTranslation();
    const loadContent = (item: ContentItem) => {
        setSelectedContentId(item.id);
        setLoadingSlug(item.slug);
        setDetailLoading(true);
        setDetail(null);
        window.history.replaceState(null, "", `/tutorials/${categoryPath}/${item.slug}`);
        api.get(`/api/v1/contents/${item.id}?language=${locale}`, { requireAuth: false })
            .then((res) => {
            const detail = res as ContentDetail;
            setDetail(detail);
        })
            .catch(() => setDetail(null))
            .finally(() => setDetailLoading(false));
    };
    useEffect(() => {
        if (detail) {
            // Delay to override Next.js metadata reset after router.replace
            const timer = setTimeout(() => {
                document.title = `${detail.title} | Sai Game`;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [detail]);
    useEffect(() => {
        setLoading(true);
        setSelectedContentId(null);
        setDetail(null);
        api.get(`/api/v1/categories/${categoryId}/contents?language=${locale}`, { requireAuth: false })
            .then((res) => {
            const items = extractContentItems(res);
            setContents(items);
            if (initialContentSlug) {
                const match = items.find((i) => i.slug === initialContentSlug);
                if (match)
                    loadContent(match);
                else
                    onSlugNotFound?.(initialContentSlug);
            }
            else if (items.length > 0) {
                loadContent(items[0]);
            }
        })
            .catch(() => setContents([]))
            .finally(() => setLoading(false));
    }, [categoryId, locale]);
    if (loading) {
        if (pendingView)
            return <>{pendingView}</>;
        return (<div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin"/>
        <span className="text-sm">{t('tutorials.loading')}</span>
      </div>);
    }
    if (contents.length === 0) {
        return <p className="text-muted-foreground text-sm">{t('tutorials.noContent')}</p>;
    }
    return (<div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contents.map((item) => {
            return (<a key={item.id} href={`/tutorials/${categoryPath}/${item.slug}`} onClick={(e) => {
                    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)
                        return;
                    e.preventDefault();
                    loadContent(item);
                }} className={cn("border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors no-underline text-inherit block", selectedContentId === item.id && "border-primary bg-accent")}>
              <h3 className="font-medium">{item.title}</h3>
            </a>);
        })}
      </div>

      {detailLoading && (pendingView && loadingSlug === initialContentSlug ? (<div id="tutorials-content-pending" className="mt-6">{pendingView}</div>) : (<div className="flex items-center gap-2 text-muted-foreground mt-6">
          <Loader2 className="h-4 w-4 animate-spin"/>
          <span className="text-sm">{t('tutorials.loadingContent')}</span>
        </div>))}

      {detail && (<div className="mt-6 border rounded-lg p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UpvoteButton contentId={detail.id} count={detail.metadata?.upvote_count}/>
              <h2 className="text-2xl font-bold break-words min-w-0 sm:text-3xl lg:text-4xl">{detail.title}</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              <span>v{detail.version_number}</span>
            </div>
          </div>
          {detail.metadata?.learn_time && (<p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5"/>
              {detail.metadata.learn_time}
            </p>)}
          {detail.body && (<div className={cn("prose prose-sm max-w-none", resolvedTheme?.includes("dark") && "prose-invert")}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{preprocessImgSize(detail.body)}</ReactMarkdown>
              </div>)}
          <div className="flex justify-start mt-4">
            <UpvoteButton contentId={detail.id} count={detail.metadata?.upvote_count}/>
          </div>
        </div>)}
    </div>);
}
function isCategoryDescendantSelected(category: Category, selectedId: string): boolean {
    for (const child of category.children ?? []) {
        if (child.id === selectedId)
            return true;
        if (isCategoryDescendantSelected(child, selectedId))
            return true;
    }
    return false;
}
function CategoryMenuItem({ category, selectedId, onSelect, level = 0, locale, }: {
    category: Category;
    selectedId: string | null;
    onSelect: (cat: Category) => void;
    level?: number;
    locale: string;
}) {
    const children = (category.children ?? [])
        .filter((c) => c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
    const hasChildren = children.length > 0;
    const descendantSelected = hasChildren && selectedId
        ? isCategoryDescendantSelected(category, selectedId)
        : false;
    const [isOpen, setIsOpen] = useState(() => descendantSelected);
    useEffect(() => {
        if (descendantSelected)
            setIsOpen(true);
    }, [descendantSelected]);
    return (<div>
      <a href={`/tutorials/${category.path}`} onClick={(e) => {
            // Allow Ctrl/Cmd+click or middle-click to open in a new tab natively
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)
                return;
            e.preventDefault();
            if (hasChildren) {
                setIsOpen((prev) => !prev);
            }
            else {
                onSelect(category);
            }
        }} className={cn("w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-accent transition-colors no-underline text-inherit", selectedId === category.id && "bg-accent font-medium")} style={{ paddingLeft: `${level * 30 + 12}px` }}>
        {getCatName(category, locale)}
        {hasChildren && (<span className="ml-auto flex items-center gap-1">
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 leading-none">
              {children.length}
            </span>
            {isOpen
                ? <ChevronDown className="h-3 w-3 flex-shrink-0"/>
                : <ChevronRight className="h-3 w-3 flex-shrink-0"/>}
          </span>)}
      </a>
      {hasChildren && isOpen && (<div>
          {children.map((child) => (<CategoryMenuItem key={child.id} category={child} selectedId={selectedId} onSelect={onSelect} level={level + 1} locale={locale}/>))}
        </div>)}
    </div>);
}
function CategorySidebar({ category, selectedId, onSelect, locale, initialContentSlug, onSlugNotFound, pendingView, }: {
    category: Category;
    selectedId: string | null;
    onSelect: (cat: Category) => void;
    locale: string;
    initialContentSlug?: string | null;
    onSlugNotFound?: (slug: string) => void;
    pendingView?: ReactNode;
}) {
    const children = (category.children ?? [])
        .filter((c) => c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
    // Find the selected child's path to pass to ContentList
    const selectedChild = selectedId
        ? children.find((c) => c.id === selectedId) ?? findCategoryById(children, selectedId)
        : null;
    const { t } = useTranslation();
    if (children.length === 0) {
        return (<p className="text-muted-foreground text-sm">
        {category.description || `${category.name} ${t('tutorials.comingSoon')}`}
      </p>);
    }
    return (<div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <nav className="space-y-1 border-b pb-4 md:w-56 md:flex-shrink-0 md:border-b-0 md:border-r md:pb-0 md:pr-4">
        {children.map((child) => (<CategoryMenuItem key={child.id} category={child} selectedId={selectedId} onSelect={onSelect} locale={locale}/>))}
      </nav>
      <div className="flex-1 min-w-0">
        {selectedId && selectedChild ? (<ContentList categoryId={selectedId} categoryPath={selectedChild.path} initialContentSlug={initialContentSlug} onSlugNotFound={onSlugNotFound} pendingView={initialContentSlug ? pendingView : undefined}/>) : (<p className="text-muted-foreground text-sm">{t('tutorials.selectTopic')}</p>)}
      </div>
    </div>);
}
function TutorialsTabs({ serverView }: {
    serverView?: ReactNode;
}) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const params = useParams();
    const { locale } = useLanguage();
    const { t } = useTranslation();
    const fullPath = params.path
        ? (Array.isArray(params.path) ? params.path.join("/") : params.path)
        : null;
    // Will be resolved after categories load: split fullPath into categoryPath + contentSlug
    const [contentSlug, setContentSlug] = useState<string | null>(null);
    /** selected article of the active static tab (Tutorials, Tips) */
    const [staticSlug, setStaticSlug] = useState<string | null>(null);
    const navigateTo = useCallback((path: string | null, slug?: string | null) => {
        const base = path ? `/tutorials/${path}` : "/tutorials";
        const url = slug ? `${base}/${slug}` : base;
        window.history.replaceState(null, "", url);
    }, []);
    useEffect(() => {
        // The static tabs (Tutorials, Tips) do not depend on the CMS categories.
        const staticSection = findStaticSection(fullPath);
        if (staticSection) {
            setActiveTab(staticSection.tab);
            setStaticSlug(getStaticArticleSlugFromPath(staticSection, fullPath!));
        }
        const processCategories = (roots: Category[]) => {
            setCategories(roots);
            if (staticSection)
                return;
            if (fullPath) {
                // Try exact category match first
                let matched = findCategoryByPath(roots, fullPath);
                let root = findRootForPath(roots, fullPath);
                let detectedSlug: string | null = null;
                if (!matched) {
                    // Last segment might be content slug
                    const lastSlash = fullPath.lastIndexOf("/");
                    if (lastSlash > 0) {
                        const catPath = fullPath.substring(0, lastSlash);
                        detectedSlug = fullPath.substring(lastSlash + 1);
                        matched = findCategoryByPath(roots, catPath);
                        root = findRootForPath(roots, catPath);
                    }
                }
                if (root)
                    setActiveTab(root.slug);
                if (matched) {
                    setSelectedChildId(matched.id);
                    if (!detectedSlug)
                        setTimeout(() => { document.title = `${getCatName(matched!, locale)} | Sai Game`; }, 100);
                }
                if (detectedSlug)
                    setContentSlug(detectedSlug);
            }
            if (!fullPath || !findRootForPath(roots, fullPath)) {
                // Also check without last segment
                const lastSlash = fullPath?.lastIndexOf("/") ?? -1;
                const catPath = lastSlash > 0 ? fullPath!.substring(0, lastSlash) : null;
                if (catPath && findRootForPath(roots, catPath)) {
                    // already handled above
                }
                else {
                    setActiveTab(roots[0]?.slug ?? null);
                }
            }
        };
        api.get("/api/v1/categories", { requireAuth: false })
            .then((res) => {
            processCategories(getActiveRoots(res.data as Category[]));
        })
            .catch(() => setCategories([]))
            .finally(() => setLoading(false));
    }, []);
    const handleTabChange = (slug: string) => {
        setActiveTab(slug);
        setSelectedChildId(null);
        setContentSlug(null);
        const staticSection = findStaticSectionByTab(slug);
        if (staticSection) {
            setStaticSlug(null);
            navigateTo(staticSection.path);
            return;
        }
        const root = categories.find((c) => c.slug === slug);
        navigateTo(root?.path ?? null);
    };
    // When content slug not found in current category, search all leaf categories
    const handleSlugNotFound = useCallback(async (slug: string) => {
        const allLeaves = getAllLeafCategories(categories);
        for (const leaf of allLeaves) {
            if (leaf.id === selectedChildId)
                continue; // already checked
            try {
                const res = await api.get(`/api/v1/categories/${leaf.id}/contents?language=${locale}`, { requireAuth: false });
                const match = extractContentItems(res).find((i) => i.slug === slug);
                if (match) {
                    // Found — redirect to correct category
                    const root = findRootForPath(categories, leaf.path);
                    if (root)
                        setActiveTab(root.slug);
                    setSelectedChildId(leaf.id);
                    setContentSlug(slug);
                    navigateTo(leaf.path, slug);
                    return;
                }
            }
            catch { /* skip */ }
        }
    }, [categories, selectedChildId, locale, navigateTo]);
    const { fontSize, changeFontSize } = useTutorialFontSize();
    // the Basic tab's own label, so the Tutorials note names it the way the tab bar does
    const basicCategory = categories.find((cat) => cat.slug === "basic");
    const basicName = basicCategory ? getCatName(basicCategory, locale) : "Basic";
    const handleSelectStaticArticle = (section: StaticSection, slug: string) => {
        setStaticSlug(slug);
        navigateTo(section.path, slug);
    };
    const handleSelectCategory = (cat: Category) => {
        setSelectedChildId(cat.id);
        setContentSlug(null);
        navigateTo(cat.path);
        setTimeout(() => { document.title = `${getCatName(cat, locale)} | Sai Game`; }, 100);
    };
    return (<div id="tutorials-page" style={{ "--tutorials-font-size": `${fontSize}px` } as CSSProperties} className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 [&_.prose]:text-[length:var(--tutorials-font-size)]">
      <div id="tutorials-page-header" className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
        <BookOpen id="tutorials-page-icon" className="h-6 w-6 text-primary shrink-0"/>
        <div id="tutorials-page-heading" className="min-w-0">
          <h1 id="tutorials-page-title" className="text-xl font-bold sm:text-2xl truncate">{t('tutorials.title')}</h1>
          <p id="tutorials-page-subtitle" className="text-sm text-muted-foreground">{t('tutorials.subtitle')}</p>
        </div>
        <TutorialFontSize fontSize={fontSize} onChange={changeFontSize}/>
      </div>

      {loading && serverView ? serverView : loading ? (<div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin"/>
          <span className="text-sm">{t('tutorials.loading')}</span>
        </div>) : activeTab ? (<Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
          <div id="tutorials-tabs-row" className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="-mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
            <TabsList className="w-auto inline-flex">
              {categories.map((cat) => (<TabsTrigger key={cat.id} value={cat.slug} className="flex items-center gap-2 whitespace-nowrap">
                  {getCatName(cat, locale)}
                </TabsTrigger>))}
              {STATIC_SECTIONS.map((section) => (<TabsTrigger key={section.tab} id={`tutorials-tab-${section.path}`} value={section.tab} href={`/tutorials/${section.path}`} className="flex items-center gap-2 whitespace-nowrap">
                  {t(section.tabLabelKey)}
                </TabsTrigger>))}
              <Link id="tutorials-tab-download-sdk" href={DOWNLOAD_SDK_PATH} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Download className="h-4 w-4 shrink-0"/>
                {t('common.downloadSdk')}
              </Link>
            </TabsList>
          </div>
          {activeTab === GUIDES_SECTION.tab && (<p id="tutorials-guides-note" className="flex items-center gap-1.5 text-xs text-muted-foreground lg:shrink-0">
              <Info id="tutorials-guides-note-icon" className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/>
              {t("tutorials.guidesNote").replace("{basic}", basicName)}
            </p>)}
          </div>

          {categories.map((cat) => (<TabsContent key={cat.id} value={cat.slug} className="mt-0">
              <CategorySidebar category={cat} selectedId={selectedChildId} onSelect={handleSelectCategory} locale={locale} initialContentSlug={contentSlug} onSlugNotFound={handleSlugNotFound} pendingView={serverView}/>
            </TabsContent>))}
          {STATIC_SECTIONS.map((section) => (<TabsContent key={section.tab} id={`tutorials-${section.path}-content`} value={section.tab} className="mt-0">
              <StaticArticlesPanel section={section} selectedSlug={activeTab === section.tab ? staticSlug : null} onSelect={(slug) => handleSelectStaticArticle(section, slug)}/>
            </TabsContent>))}
        </Tabs>) : null}
    </div>);
}
/** The interactive Learning Center; serverView is the server-rendered page shown while the client loads its data. */
export default function TutorialsClient({ serverView }: {
    serverView?: ReactNode;
}) {
    return (<Suspense>
      <TutorialsTabs serverView={serverView}/>
    </Suspense>);
}
