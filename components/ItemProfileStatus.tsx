import { CheckCircle, Clock, AlertCircle } from "lucide-react"
import { getItemProfileStatusConfig, formatStatusForTranslation } from "@/lib/utils/item-profile-status"

interface StatusBadgeProps {
  status: string
}

// Component để hiển thị status badge với màu sắc đẹp (dùng cho list view)
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = getItemProfileStatusConfig(status)
  
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-full ${config.badgeClassName}`}>
      {config.label}
    </span>
  )
}

interface StatusDisplayProps {
  status: string
  t?: (key: string) => string
}

// Component để hiển thị status với icon (dùng cho detail view)
export function StatusDisplay({ status, t }: StatusDisplayProps) {
  const config = getItemProfileStatusConfig(status)
  
  const renderStatusIcon = (iconType: "check" | "clock" | "alert" | null) => {
    switch (iconType) {
      case "check":
        return <CheckCircle className="w-4 h-4" />
      case "clock":
        return <Clock className="w-4 h-4" />
      case "alert":
        return <AlertCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  const statusText = t ? formatStatusForTranslation(status, t) : config.label

  if (config.icon) {
    return (
      <span className={config.className}>
        {renderStatusIcon(config.icon)}
        {statusText}
      </span>
    )
  }

  return <span className="font-semibold">{statusText}</span>
} 