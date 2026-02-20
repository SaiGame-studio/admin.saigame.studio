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

export interface UserLimits {
  max_studios?: number | null
}

export interface UserUsage {
  studios?: number | null
}

interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: number
  display_name?: string
  permissions?: string[]
  limits?: UserLimits
  usage?: UserUsage
  /** @deprecated derived from permissions now */
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
        const rawUser = response.user
        const permissions: string[] = Array.isArray(rawUser.permissions) ? rawUser.permissions : []

        // Derive capabilities from permissions array
        const capabilities: UserCapabilities = {
          is_super_admin: permissions.includes("admin:manage_system"),
          can_view_all_users: permissions.includes("admin:view_all_users"),
          can_view_all_studios: permissions.includes("admin:view_all_studios"),
          permissions,
        }

        const user: User = {
          ...rawUser,
          permissions,
          capabilities,
        }

        setUser(user)
        // Save capabilities to localStorage for global access
        safeSetItem('user_capabilities', JSON.stringify(capabilities))
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
