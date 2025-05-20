import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import { getWebsiteName } from "@/lib/site-config"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ProtectedLayout } from "@/components/protected-layout"

const inter = Inter({ subsets: ["latin"] })

export function generateMetadata(): Metadata {
  const websiteName = getWebsiteName()

  return {
    title: websiteName,
    description: `Admin dashboard for ${websiteName}`,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const websiteName = getWebsiteName()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          storageKey={`${websiteName.toLowerCase().replace(/\s+/g, "-")}-theme`}
        >
          <AuthProvider>
            <ProtectedLayout>{children}</ProtectedLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
