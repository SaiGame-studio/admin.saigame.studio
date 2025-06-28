/**
 * Utility functions for item profile operations
 */

export type ItemProfileTab = 'details' | 'inventory' | 'lootbox' | 'properties'

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
 * Generate URL for lootbox tab of an item profile
 */
export function getLootboxTabUrl(gameId: string, itemProfileId: string): string {
  return getItemProfileUrl(gameId, itemProfileId, 'lootbox')
}

/**
 * Generate URL for properties tab of an item profile
 */
export function getPropertiesTabUrl(gameId: string, itemProfileId: string): string {
  return getItemProfileUrl(gameId, itemProfileId, 'properties')
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
  if (tab === 'lootbox') {
    return 'lootbox'
  }
  if (tab === 'properties') {
    return 'properties'
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
 * Check if item profile type supports lootbox tab
 */
export function isLootboxType(itemProfile: { type: string }): boolean {
  return itemProfile.type === 'loot_box_fixed'
}

/**
 * Check if item profile supports properties tab (all types support properties)
 */
export function supportsProperties(itemProfile: { type: string }): boolean {
  return true // All item profiles can have properties
}

/**
 * Get display name for item profile tab
 */
export function getTabDisplayName(tab: string, t: (key: string) => string): string {
  switch (tab) {
    case 'inventory':
      return t('inventory.title')
    case 'lootbox':
      return t('lootbox.title')
    case 'properties':
      return t('properties.title')
    case 'details':
    default:
      return t('itemProfile.details')
  }
}

/**
 * Get available tabs for an item profile
 */
export function getAvailableTabs(itemProfile: { type: string }): ItemProfileTab[] {
  const tabs: ItemProfileTab[] = []
  
  // Details tab comes first
  tabs.push('details')
  
  // Properties tab comes second (right after Details)
  tabs.push('properties')
  
  if (isInventoryType(itemProfile)) {
    tabs.push('inventory')
  }
  if (isLootboxType(itemProfile)) {
    tabs.push('lootbox')
  }
  return tabs
} 