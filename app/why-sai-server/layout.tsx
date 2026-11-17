import type React from "react";
import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import { whySaiServerJsonLd } from "@/lib/structured-data";

// Vietnamese-first typeface: proper stacked diacritics at every weight.
const beVietnamPro = Be_Vietnam_Pro({
    subsets: ["latin", "vietnamese"],
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});

const DESCRIPTION = "Backend-as-a-Service for Unity games: accounts, cloud save, inventory, in-game economy, quests, leaderboards, analytics and server-side Lua scripting.";

export const metadata: Metadata = {
    title: "Why Sai Server",
    description: DESCRIPTION,
    alternates: { canonical: "/why-sai-server" },
    openGraph: {
        title: "Why Sai Server — Code Games, Not Infra.",
        description: DESCRIPTION,
        images: ["/og-image.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "Why Sai Server — Code Games, Not Infra.",
        description: DESCRIPTION,
        images: ["/og-image.png"],
    },
};

export default function WhySaiServerLayout({ children }: {
    children: React.ReactNode;
}) {
    return (<div id="why-sai-server-font-scope" className={beVietnamPro.className}>
      <JsonLd id="why-sai-server-json-ld" data={whySaiServerJsonLd(DESCRIPTION)}/>
      {children}
    </div>);
}
