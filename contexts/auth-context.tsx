"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getValidToken, saveToken, clearToken, isTokenExpired, getTimeUntilExpiration, refreshAccessToken } from "@/lib/auth-utils"
import { fetchUserProfile } from "@/lib/api"
import { safeSetItem, safeRemoveItem } from "@/lib/storage-utils"

export interface UserCapabilities {
  is_super_admin: boolean
  can_view_all_users: boolean
  can_view_all_studios: boolean
  permissions: string[]
}

interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: number
  display_name?: string
  capabilities?: UserCapabilities
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (token: string, refreshToken?: string) => void
  logout: () => void
  isLoading: boolean
  timeUntilExpiration: number | null
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeUntilExpiration, setTimeUntilExpiration] = useState<number | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Function to fetch user data
  const fetchUser = async () => {
    try {
      const response = await fetchUserProfile()
      if (response.user) {
        setUser(response.user)
        // Save capabilities to localStorage for global access
        if (response.user.capabilities) {
          safeSetItem('user_capabilities', JSON.stringify(response.user.capabilities))
        }
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    }
  }

  // Function to check authentication status
  const checkAuth = async () => {
    const token = getValidToken()
    const authenticated = !!token
    setIsAuthenticated(authenticated)
    
    if (authenticated) {
      const timeLeft = getTimeUntilExpiration()
      setTimeUntilExpiration(timeLeft)
      await fetchUser()
    } else {
      setTimeUntilExpiration(null)
      setUser(null)
    }
    
    return authenticated
  }

  // Public function to refresh user data
  const refreshUser = async () => {
    if (isAuthenticated) {
      await fetchUser()
    }
  }

  useEffect(() => {
    // Check if user is authenticated on initial load
    checkAuth().finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    // Set up interval to check token expiration and auto-refresh
    const interval = setInterval(async () => {
      if (isAuthenticated) {
        const token = getValidToken()
        
        // If no valid token, try to refresh
        if (!token) {
          console.log('Token expired, attempting to refresh...')
          const newToken = await refreshAccessToken()
          
          if (newToken) {
            console.log('Token refreshed successfully')
            // Update authentication state
            await checkAuth()
          } else {
            console.log('Refresh token expired or invalid, logging out user')
            logout()
          }
        } else {
          // Token is still valid, update expiration time
          const timeLeft = getTimeUntilExpiration()
          setTimeUntilExpiration(timeLeft)
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

  const login = (token: string, refreshToken?: string) => {
    saveToken(token, refreshToken)
    checkAuth()
    router.push("/")
  }

  const logout = () => {
    clearToken()
    safeRemoveItem('user_capabilities')
    setIsAuthenticated(false)
    setUser(null)
    setTimeUntilExpiration(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading, timeUntilExpiration, refreshUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
