"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { SUPPORT_CHAT_OPEN_EVENT } from "@/components/support-chat-widget";
import { useAuth } from "@/contexts/auth-context";
import { useCapabilities } from "@/hooks/use-capabilities";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/use-translation";
import { TIPS_PATH, TUTORIAL_TIPS, getTipBodyUrl } from "@/lib/tutorial-tips";

async function fetchTipBody(slug: string, locale: string): Promise<string> {
    const response = await fetch(getTipBodyUrl(slug, locale));
    if (!response.ok)
        throw new Error(`Tip body not found: ${slug}.${locale}`);
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

/** Left menu of static tips plus the selected tip; the first tip is shown when none is selected. */
export function TutorialTipsPanel({ selectedSlug, onSelect }: {
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
    const tip = TUTORIAL_TIPS.find((item) => item.slug === selectedSlug) ?? TUTORIAL_TIPS[0];
    const [body, setBody] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const title = `#${tip.number} ${t(tip.titleKey)}`;

    useEffect(() => {
        let cancelled = false;
        setBody(null);
        setFailed(false);
        // Fall back to English when a translation is missing.
        fetchTipBody(tip.slug, locale)
            .catch((error) => (locale === "en" ? Promise.reject(error) : fetchTipBody(tip.slug, "en")))
            .then((text) => { if (!cancelled) setBody(text); })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [tip.slug, locale]);

    useEffect(() => {
        // Delay to override the Next.js metadata reset, as the CMS tabs do.
        const timer = setTimeout(() => { document.title = `${title} | Sai Game`; }, 100);
        return () => clearTimeout(timer);
    }, [title]);

    return (<div id="tutorial-tips" className="flex flex-col gap-4 md:flex-row md:gap-6">
      <nav id="tutorial-tips-menu" className="space-y-1 border-b pb-4 md:w-56 md:flex-shrink-0 md:border-b-0 md:border-r md:pb-0 md:pr-4">
        {TUTORIAL_TIPS.map((item) => (<a key={item.slug} id={`tutorial-tips-menu-item-${item.slug}`} href={`/tutorials/${TIPS_PATH}/${item.slug}`} onClick={(e) => {
                // Allow Ctrl/Cmd+click or middle-click to open in a new tab natively
                if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)
                    return;
                e.preventDefault();
                onSelect(item.slug);
            }} className={cn("w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-accent transition-colors no-underline text-inherit", item.slug === tip.slug && "bg-accent font-medium")}>
            <span id={`tutorial-tips-menu-item-${item.slug}-number`} className="text-muted-foreground">#{item.number}</span>
            {t(item.titleKey)}
          </a>))}
      </nav>
      <div id="tutorial-tips-detail" className="flex-1 min-w-0">
        <div id="tutorial-tips-article" className="border rounded-lg p-4 sm:p-6">
          <h2 id="tutorial-tips-title" className="text-2xl font-bold break-words mb-4 sm:text-3xl lg:text-4xl">{title}</h2>
          {body !== null ? (<div id="tutorial-tips-body" className={cn("prose prose-sm max-w-none", resolvedTheme?.includes("dark") && "prose-invert")}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              {tip.supportChat && canChat && (<SupportChatLine id={`tutorial-tips-chat-${tip.slug}`}/>)}
            </div>) : failed ? (<p id="tutorial-tips-error" className="text-muted-foreground text-sm">{t("tutorials.tipLoadFailed")}</p>) : (<div id="tutorial-tips-loading" className="flex items-center gap-2 text-muted-foreground">
              <Loader2 id="tutorial-tips-loading-icon" className="h-4 w-4 animate-spin"/>
              <span id="tutorial-tips-loading-text" className="text-sm">{t("tutorials.loadingContent")}</span>
            </div>)}
        </div>
      </div>
    </div>);
}
