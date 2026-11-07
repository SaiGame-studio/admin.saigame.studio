"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

const PREVIEW_IMAGE = { src: "/why-sai-server/game-detail.jpg", width: 1529, height: 747 };

export function WhySaiServerPromo() {
    const { t } = useTranslation();
    return (<Link id="login-why-sai-server-promo" href="/why-sai-server" aria-labelledby="login-why-sai-server-promo-title login-why-sai-server-promo-tagline" className="group relative flex h-full min-h-[22rem] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] outline-none transition-[box-shadow,border-color] duration-300 ease-out hover:border-primary/60 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:min-h-0">
      <div id="login-why-sai-server-promo-copy" className="relative z-10 px-7 pt-8 sm:px-10 sm:pt-10">
        <h2 id="login-why-sai-server-promo-title" className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
          {t("login.whySaiServer")}
        </h2>
        <p id="login-why-sai-server-promo-tagline" className="mt-4 text-xl font-bold text-primary sm:text-2xl">
          {t("whySaiServer.hero.title")}
        </p>
        <p id="login-why-sai-server-promo-subtitle" className="mt-2 max-w-[48ch] text-base text-muted-foreground sm:text-lg">
          {t("whySaiServer.hero.subtitle")}
        </p>
        <span id="login-why-sai-server-promo-cta" className="mt-7 inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors duration-200 group-hover:bg-primary/90">
          {t("login.whySaiServerCta")}
          <ArrowRight id="login-why-sai-server-promo-cta-icon" className="h-5 w-5 transition-transform duration-300 ease-out group-hover:translate-x-1" aria-hidden="true"/>
        </span>
      </div>
      <div id="login-why-sai-server-promo-preview" className="relative mt-8 flex-1 pl-7 sm:pl-10" aria-hidden="true">
        <div id="login-why-sai-server-promo-preview-frame" className="absolute inset-x-0 top-0 ml-7 overflow-hidden rounded-tl-lg border-l border-t border-border/80 shadow-[0_-6px_24px_-12px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-2 sm:ml-10">
          <Image id="login-why-sai-server-promo-preview-image" src={PREVIEW_IMAGE.src} width={PREVIEW_IMAGE.width} height={PREVIEW_IMAGE.height} alt="" sizes="(min-width: 1024px) 640px, 100vw" className="h-auto w-[640px] max-w-none object-cover object-left-top sm:w-[760px]"/>
        </div>
      </div>
    </Link>);
}
