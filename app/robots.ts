import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/structured-data";

// The public pages are /why-sai-server and /tutorials; the rest of the app needs a signed-in user,
// so crawlers (search engines and AI crawlers alike) are kept out of it.
const SIGNED_IN_AREAS = [
    "/admin", "/dashboard", "/doc", "/example", "/forbidden", "/games", "/payment", "/profile",
    "/roadmap", "/server-offline", "/servers", "/studios", "/teams",
    "/forgot-password", "/reset-password", "/google-login-success",
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/", disallow: SIGNED_IN_AREAS },
        sitemap: `${APP_URL}/sitemap.xml`,
    };
}
