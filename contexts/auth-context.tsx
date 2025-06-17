"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getValidToken, saveToken, clearToken, isTokenExpired, getTimeUntilExpiration } from "@/lib/auth-utils"

interface AuthContextType {
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
  isLoading: boolean
  timeUntilExpiration: number | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [timeUntilExpiration, setTimeUntilExpiration] = useState<number | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Function to check authentication status
  const checkAuth = () => {
    const token = getValidToken()
    const authenticated = !!token
    setIsAuthenticated(authenticated)
    
    if (authenticated) {
      const timeLeft = getTimeUntilExpiration()
      setTimeUntilExpiration(timeLeft)
    } else {
      setTimeUntilExpiration(null)
    }
    
    return authenticated
  }

  useEffect(() => {
    // Check if user is authenticated on initial load
    checkAuth()
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Set up interval to check token expiration every minute
    const interval = setInterval(() => {
      if (isAuthenticated) {
        const stillValid = checkAuth()
        if (!stillValid) {
          console.log('Token expired, logging out user')
          logout()
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [isAuthenticated])

  useEffect(() => {
    // Redirect logic
    if (!isLoading) {
      if (!isAuthenticated && pathname !== "/login" && pathname !== "/register") {
        router.push("/login")
      } else if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
        router.push("/")
      }
    }
  }, [isAuthenticated, isLoading, pathname, router])

  const login = (token: string) => {
    saveToken(token)
    checkAuth()
    router.push("/")
  }

  const logout = () => {
    clearToken()
    setIsAuthenticated(false)
    setTimeUntilExpiration(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading, timeUntilExpiration }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
