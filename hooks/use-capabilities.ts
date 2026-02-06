import { useAuth, UserCapabilities } from "@/contexts/auth-context"
import { safeGetItem } from "@/lib/storage-utils"

const DEFAULT_CAPABILITIES: UserCapabilities = {
  is_super_admin: false,
  can_view_all_users: false,
  can_view_all_studios: false,
  permissions: [],
}

/**
 * Hook to access user capabilities from auth context or localStorage fallback
 */
export function useCapabilities(): UserCapabilities {
  const { user } = useAuth()

  // Prefer from context
  if (user?.capabilities) {
    return user.capabilities
  }

  // Fallback to localStorage
  try {
    const stored = safeGetItem("user_capabilities")
    if (stored) {
      return JSON.parse(stored) as UserCapabilities
    }
  } catch {
    // ignore parse error
  }

  return DEFAULT_CAPABILITIES
}

/**
 * Get capabilities from localStorage (for use outside React components)
 */
export function getCapabilities(): UserCapabilities {
  try {
    const stored = safeGetItem("user_capabilities")
    if (stored) {
      return JSON.parse(stored) as UserCapabilities
    }
  } catch {
    // ignore
  }
  return DEFAULT_CAPABILITIES
}
