/**
 * Safely gets an item from localStorage with error handling
 * @param key The key to retrieve from localStorage
 * @returns The value from localStorage or null if not found or error
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error(`Error getting item from localStorage: ${key}`, error)
    return null
  }
}

/**
 * Safely sets an item in localStorage with error handling
 * @param key The key to set in localStorage
 * @param value The value to store
 * @returns true if successful, false if error
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error(`Error setting item in localStorage: ${key}`, error)
    return false
  }
}

/**
 * Safely removes an item from localStorage with error handling
 * @param key The key to remove from localStorage
 * @returns true if successful, false if error
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Error removing item from localStorage: ${key}`, error)
    return false
  }
}
