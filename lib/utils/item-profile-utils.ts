/**
 * Utility functions for item profile operations
 */

export type ItemProfileTab = 'details' | 'inventory'

/**
 * Generate URL for item profile detail page with specific tab
 */
export function getItemProfileUrl(gameId: string, itemProfileId: string, tab?: ItemProfileTab): string {
  const baseUrl = `/games/${gameId}/item-profiles/${itemProfileId}`
  if (tab && tab !== 'details') {
    return `${baseUrl}?tab=${tab}`
  }
  return baseUrl
}

/**
 * Generate URL for inventory tab of an item profile
 */
export function getInventoryTabUrl(gameId: string, itemProfileId: string): string {
  return getItemProfileUrl(gameId, itemProfileId, 'inventory')
}

/**
 * Generate URL for details tab of an item profile
 */
export function getDetailsTabUrl(gameId: string, itemProfileId: string): string {
  return getItemProfileUrl(gameId, itemProfileId, 'details')
}

/**
 * Parse tab from URL search params
 */
export function parseTabFromUrl(searchParams: URLSearchParams): ItemProfileTab {
  const tab = searchParams.get('tab')
  if (tab === 'inventory') {
    return 'inventory'
  }
  return 'details' // default tab
}

/**
 * Check if item profile type supports inventory tab
 */
export function isInventoryType(itemProfile: { type: string }): boolean {
  return itemProfile.type === 'inventory'
}

/**
 * Get display name for item profile tab
 */
export function getTabDisplayName(tab: string, t: (key: string) => string): string {
  switch (tab) {
    case 'inventory':
      return t('inventory.title')
    case 'details':
    default:
      return t('itemProfile.details')
  }
}

/**
 * Get available tabs for an item profile
 */
export function getAvailableTabs(itemProfile: { type: string }): ItemProfileTab[] {
  const tabs: ItemProfileTab[] = ['details']
  if (isInventoryType(itemProfile)) {
    tabs.push('inventory')
  }
  return tabs
} 