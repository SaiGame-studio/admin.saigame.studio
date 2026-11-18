import Script from "next/script";

// One GA4 property and measurement ID is shared by saigame.studio and server.saigame.studio:
// the _ga cookie lives on .saigame.studio, so a visitor keeps the same user and session across both sites.
// The ID is public; the env var only overrides it.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-SHR8QL7HZJ";

// Page views on client-side navigation come from GA4 enhanced measurement
// ("page changes based on browser history events"), so no manual page_view is sent here.
export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script id="google-analytics-loader" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
