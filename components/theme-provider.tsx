"use client"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

// This component is likely using next-themes, which is a common library for theme management in Next.js
// I'll add a comment to explain what's happening here, but won't modify the core functionality

// The ThemeProvider is already set up to handle theme switching with:
// - attribute="class" - uses class attribute for theming
// - defaultTheme="dark" - sets dark as the default theme
// - enableSystem - likely enabled to respect system preferences
// - disableTransitionOnChange - likely disabled to allow smooth transitions

// This provider is already wrapping the application in the root layout
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
