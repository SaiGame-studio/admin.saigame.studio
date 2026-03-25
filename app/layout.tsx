import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import type { Metadata } from "next"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ProtectedLayout } from "@/components/protected-layout"
import { Footer } from "@/components/footer"
import { SITE_NAME } from "@/lib/utils/site-config"
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { Toaster } from "@/components/ui/toaster"
import { GoogleAuthProvider } from "@/components/google-auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: SITE_NAME,
  description: `${SITE_NAME} dashboard for managing Game Server`,
  generator: 'v0.dev',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem={true} 
          storageKey="sais-admin-theme"
          themes={['light', 'light-soft', 'light-warm', 'dark', 'dark-blue', 'dark-purple', 'dark-green', 'midnight', 'system']}
        >
          <GoogleAuthProvider>
            <AuthProvider>
              <LanguageProvider>
                <ProtectedLayout>{children}</ProtectedLayout>
                <Footer />
                <Toaster />
              </LanguageProvider>
            </AuthProvider>
          </GoogleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
