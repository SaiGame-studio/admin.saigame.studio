import { Package } from "lucide-react"
import { SITE_NAME } from "@/lib/utils/site-config"

export function Footer() {
  // You can update this version manually or use an environment variable
  const version = process.env.NEXT_PUBLIC_APP_VERSION

  return (
    <footer className="border-t py-2 px-4 text-xs text-muted-foreground flex items-center justify-center">
      <Package className="h-3 w-3 mr-1" />
      <span>
        {SITE_NAME} {version} • {new Date().getFullYear()}
      </span>
    </footer>
  )
}
