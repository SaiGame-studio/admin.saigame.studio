import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import type { Metadata } from "next"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ProtectedLayout } from "@/components/protected-layout"
import { TopNav } from "@/components/top-nav"
import { SideNav } from "@/components/side-nav"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Game Server Admin",
  description: "Admin dashboard for managing game servers",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true} storageKey="game-server-admin-theme">
          <AuthProvider>
            <ProtectedLayout>
              <div className="flex min-h-screen flex-col">
                <TopNav />
                <div className="flex flex-1">
                  <SideNav />
                  <div className="flex-1">{children}</div>
                </div>
              </div>
            </ProtectedLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
