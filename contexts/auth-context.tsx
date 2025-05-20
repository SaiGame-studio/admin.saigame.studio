"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if user is authenticated on initial load
    const token = localStorage.getItem("token")
    setIsAuthenticated(!!token)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Redirect logic
    if (!isLoading) {
      if (!isAuthenticated && pathname !== "/login") {
        router.push("/login")
      } else if (isAuthenticated && pathname === "/login") {
        router.push("/")
      }
    }
  }, [isAuthenticated, isLoading, pathname, router])

  const login = (token: string) => {
    localStorage.setItem("token", token)
    setIsAuthenticated(true)
    router.push("/")
  }

  const logout = () => {
    localStorage.removeItem("token")
    setIsAuthenticated(false)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
