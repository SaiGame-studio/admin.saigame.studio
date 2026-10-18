"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { listCategoryTree, CmsContent, ContentCategory } from "@/lib/admin-api";

/** Returns the chain of categories from the root down to the category with the given id. */
function findCategoryChain(cats: ContentCategory[], id: string): ContentCategory[] | null {
    for (const cat of cats) {
        if (cat.id === id)
            return [cat];
        const chain = findCategoryChain(cat.children ?? [], id);
        if (chain)
            return [cat, ...chain];
    }
    return null;
}

/** Explains why the saved content cannot be opened on the public tutorials page, or returns null. */
function getBlockedReason(content: CmsContent, chain: ContentCategory[] | null): string | null {
    if (content.status !== "published")
        return "Publish this content to view it on the public page.";
    if (!content.slug)
        return "Save a slug to view this content on the public page.";
    if (!content.category_id)
        return "Assign a category to view this content on the public page.";
    if (!chain)
        return "Category not found.";
    if (chain.length < 2)
        return "Content in a top-level category is not listed on the public page. Pick a sub-category.";
    if (chain.some((cat) => !cat.is_active || !cat.is_public))
        return "This category (or one of its parents) is inactive or not public.";
    return null;
}

export function PublicContentLink({ content, dirty, onConfirmLeave }: {
    content: CmsContent;
    dirty: boolean;
    onConfirmLeave: (message: string, onConfirm: () => void) => void;
}) {
    const router = useRouter();
    const { locale } = useLanguage();
    const [categories, setCategories] = useState<ContentCategory[] | null>(null);
    useEffect(() => {
        listCategoryTree().then(setCategories).catch(() => setCategories([]));
    }, []);
    const chain = content.category_id && categories ? findCategoryChain(categories, content.category_id) : null;
    const blockedReason = categories ? getBlockedReason(content, chain) : "Loading categories...";
    const leaf = chain?.[chain.length - 1];
    const href = !blockedReason && leaf ? `/tutorials/${leaf.path}/${content.slug}` : undefined;
    const languageNote = content.language !== locale
        ? ` The public page shows content in your site language (${locale.toUpperCase()}); switch it to ${content.language.toUpperCase()} to see this translation.`
        : "";
    const tooltip = blockedReason ?? `View the saved, published version on the public page.${languageNote}`;
    return (<TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? (<Button id="cms-content-public-link-btn" className="cms-content-public-link-btn" size="icon" variant="outline" asChild>
              <a id="cms-content-public-link" className="cms-content-public-link" href={href} aria-label="View public page" onClick={(e) => {
                // Let modifier clicks open a new tab; guard unsaved edits on a plain click.
                if (!dirty || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
                    return;
                e.preventDefault();
                onConfirmLeave("You have unsaved changes. Leave this page to view the public content?", () => router.push(href));
            }}>
                <ExternalLink id="cms-content-public-link-icon" className="cms-content-public-link-icon h-4 w-4"/>
              </a>
            </Button>) : (<span id="cms-content-public-link-disabled-wrapper" className="cms-content-public-link-disabled-wrapper inline-flex cursor-not-allowed" tabIndex={0}>
              <Button id="cms-content-public-link-btn" className="cms-content-public-link-btn" size="icon" variant="outline" disabled aria-label="View public page">
                <ExternalLink id="cms-content-public-link-icon" className="cms-content-public-link-icon h-4 w-4"/>
              </Button>
            </span>)}
        </TooltipTrigger>
        <TooltipContent id="cms-content-public-link-tooltip" className="cms-content-public-link-tooltip max-w-xs" side="top">
          <p id="cms-content-public-link-tooltip-text" className="cms-content-public-link-tooltip-text">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>);
}
