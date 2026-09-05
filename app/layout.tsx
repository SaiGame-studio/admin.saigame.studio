import type React from "react";
import "@/app/globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedLayout } from "@/components/protected-layout";
import { Footer } from "@/components/footer";
import { SITE_NAME } from "@/lib/utils/site-config";
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { Toaster } from "@/components/ui/toaster";
import { GoogleAuthProvider } from "@/components/google-auth-provider";
import { PageTitleUpdater } from "@/components/page-title-updater";
import { LLMConversationPanelGate } from "@/components/llm-conversations/ConversationPanelGate";
import { SupportPresenceHeartbeat } from "@/components/support-presence-heartbeat";
import { SupportChatWidget } from "@/components/support-chat-widget";
export const metadata: Metadata = {
    title: {
        default: SITE_NAME,
        template: `%s | Sai Game`,
    },
    description: `${SITE_NAME} dashboard for managing Game Server`,
    generator: 'v0.dev',
    icons: {
        icon: '/logo.png',
        shortcut: '/logo.png',
        apple: '/logo.png',
    },
    openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        title: SITE_NAME,
        description: `${SITE_NAME} dashboard for managing Game Server`,
        images: [
            {
                url: '/og-image.png',
                width: 1456,
                height: 816,
                alt: `${SITE_NAME} - Quản lý Game Server chuyên nghiệp`,
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: SITE_NAME,
        description: `${SITE_NAME} dashboard for managing Game Server`,
        images: ['/og-image.png'],
    },
};
export default function RootLayout({ children, }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-SHR8QL7HZJ" strategy="afterInteractive"/>
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SHR8QL7HZJ');
          `}
        </Script>
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} storageKey="sais-admin-theme" themes={['light', 'light-soft', 'light-warm', 'dark', 'dark-blue', 'dark-purple', 'dark-green', 'midnight', 'system']}>
          <GoogleAuthProvider>
            <AuthProvider>
              <LanguageProvider>
                <SupportPresenceHeartbeat />
                <SupportChatWidget />
                <ProtectedLayout>{children}</ProtectedLayout>
                <Toaster />
                <PageTitleUpdater />
                <LLMConversationPanelGate />
              </LanguageProvider>
            </AuthProvider>
          </GoogleAuthProvider>
        </ThemeProvider>
      </body>
    </html>);
}
