// Token management utilities with expiration support

interface TokenData {
  token: string
  expiresAt: number // timestamp in milliseconds
}

const TOKEN_KEY = 'token'
const TOKEN_DATA_KEY = 'tokenData'

/**
 * Decode JWT token to get expiration time
 * Note: This only decodes the payload, doesn't verify signature
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Get token expiration time from JWT
 */
function getTokenExpiration(token: string): number | null {
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.exp) return null
  
  // JWT exp is in seconds, convert to milliseconds
  return decoded.exp * 1000
}

/**
 * Save token with expiration data
 */
export function saveToken(token: string): void {
  // Save the raw token for backward compatibility
  localStorage.setItem(TOKEN_KEY, token)
  
  // Try to extract expiration from JWT
  const expiresAt = getTokenExpiration(token)
  
  if (expiresAt) {
    const tokenData: TokenData = {
      token,
      expiresAt
    }
    localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData))
  } else {
    // If no expiration in token, set a default expiration (e.g., 24 hours)
    const defaultExpiration = Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    const tokenData: TokenData = {
      token,
      expiresAt: defaultExpiration
    }
    localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData))
  }
}

/**
 * Get token if it's still valid
 */
export function getValidToken(): string | null {
  try {
    // First check if we have token data with expiration
    const tokenDataStr = localStorage.getItem(TOKEN_DATA_KEY)
    if (tokenDataStr) {
      const tokenData: TokenData = JSON.parse(tokenDataStr)
      
      // Check if token is expired
      if (Date.now() >= tokenData.expiresAt) {
        console.log('Token has expired')
        clearToken()
        return null
      }
      
      return tokenData.token
    }
    
    // Fallback to old method for backward compatibility
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      // Try to check JWT expiration
      const expiresAt = getTokenExpiration(token)
      if (expiresAt && Date.now() >= expiresAt) {
        console.log('Legacy token has expired')
        clearToken()
        return null
      }
      
      // If we can't determine expiration, migrate to new format
      if (expiresAt) {
        const tokenData: TokenData = { token, expiresAt }
        localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData))
      }
      
      return token
    }
    
    return null
  } catch (error) {
    console.error('Error getting valid token:', error)
    clearToken()
    return null
  }
}

/**
 * Check if token is expired without removing it
 */
export function isTokenExpired(): boolean {
  try {
    const tokenDataStr = localStorage.getItem(TOKEN_DATA_KEY)
    if (tokenDataStr) {
      const tokenData: TokenData = JSON.parse(tokenDataStr)
      return Date.now() >= tokenData.expiresAt
    }
    
    // Fallback to checking JWT directly
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      const expiresAt = getTokenExpiration(token)
      if (expiresAt) {
        return Date.now() >= expiresAt
      }
    }
    
    return false
  } catch (error) {
    console.error('Error checking token expiration:', error)
    return true // Assume expired if we can't check
  }
}

/**
 * Get time until token expires in milliseconds
 */
export function getTimeUntilExpiration(): number | null {
  try {
    const tokenDataStr = localStorage.getItem(TOKEN_DATA_KEY)
    if (tokenDataStr) {
      const tokenData: TokenData = JSON.parse(tokenDataStr)
      return Math.max(0, tokenData.expiresAt - Date.now())
    }
    
    // Fallback to JWT check
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      const expiresAt = getTokenExpiration(token)
      if (expiresAt) {
        return Math.max(0, expiresAt - Date.now())
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting time until expiration:', error)
    return null
  }
}

/**
 * Clear all token data
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_DATA_KEY)
}

/**
 * Get token for backward compatibility (use getValidToken instead)
 */
export function getToken(): string | null {
  return getValidToken()
} 