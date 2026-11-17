import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/utils/site-config";
import { DownloadSdkContent } from "./_components/DownloadSdkContent";

const DESCRIPTION = "Download the Sai Server Unity SDK and open the API documentation and the Postman collection of every API the SDK calls.";

export const metadata: Metadata = {
    title: "Download SDK",
    description: DESCRIPTION,
    alternates: { canonical: "/download-sdk" },
    // a page's openGraph replaces the root one, so the shared card is repeated here
    openGraph: { type: "website", siteName: SITE_NAME, url: "/download-sdk", title: "Download the Sai Server SDK", description: DESCRIPTION, images: ["/og-image.png"] },
};

export default function DownloadSdkPage() {
    return <DownloadSdkContent/>;
}
