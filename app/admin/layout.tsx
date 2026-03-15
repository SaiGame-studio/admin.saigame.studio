import type React from "react"
import { ShieldAlert } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full">
      {children}

      {/* Fixed bottom-right admin zone badge */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-white text-xs font-semibold shadow-lg pointer-events-none select-none">
        <ShieldAlert className="h-3 w-3 shrink-0" />
        Admin Zone
      </div>
    </div>
  )
}
