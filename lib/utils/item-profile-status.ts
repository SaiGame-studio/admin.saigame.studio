import { ItemProfileStatus } from "@/types/game"

export interface StatusConfig {
  label: string
  className: string
  badgeClassName: string
  icon: "check" | "clock" | "alert" | null
  textColor: string
}

// Centralized status configuration
export function getItemProfileStatusConfig(status: string): StatusConfig {
  switch (status) {
    case ItemProfileStatus.ReadyToUse:
      return {
        label: "Ready To Use",
        className: "inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-md",
        badgeClassName: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
        icon: "check",
        textColor: "text-green-600"
      }
    case ItemProfileStatus.InProgress:
      return {
        label: "In Progress",
        className: "inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-md",
        badgeClassName: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
        icon: "clock",
        textColor: "text-yellow-600"
      }
    case ItemProfileStatus.ErrorUnStackAmountTooBig:
      return {
        label: "Error: Unstackable Amount Too Big",
        className: "inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold text-red-700 bg-red-100 rounded-md",
        badgeClassName: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
        icon: "alert",
        textColor: "text-red-600"
      }
    default:
      return {
        label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        className: "font-semibold",
        badgeClassName: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
        icon: null,
        textColor: ""
      }
  }
}

// Get all status options with their labels
export function getAllStatusOptions() {
  const allStatuses = Object.values(ItemProfileStatus)
  return allStatuses.map(status => {
    const config = getItemProfileStatusConfig(status)
    return {
      value: status,
      label: config.label
    }
  })
}

// Get editable status options (exclude error statuses)
export function getEditableStatusOptions() {
  const allStatuses = Object.values(ItemProfileStatus)
  return allStatuses;
}

// Check if a status is an error status
export function isErrorStatus(status: string): boolean {
  return status.toLowerCase().includes('error') || 
    status.includes('un_stackable_amount_too_big')
}

// Format status text for translation
export function formatStatusForTranslation(status: string, t: (key: string) => string): string {
  switch (status) {
    case ItemProfileStatus.ReadyToUse:
      return t('itemProfile.statusReadyToUse')
    case ItemProfileStatus.InProgress:
      return t('itemProfile.statusInProgress')  
    case ItemProfileStatus.ErrorUnStackAmountTooBig:
      return t('itemProfile.statusErrorUnStackAmountTooBig')
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
} 