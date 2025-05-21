import { Package } from "lucide-react"

export function Footer() {
  // You can update this version manually or use an environment variable
  const version = "v1.0.0"

  return (
    <footer className="border-t py-2 px-4 text-xs text-muted-foreground flex items-center justify-center">
      <Package className="h-3 w-3 mr-1" />
      <span>
        Sai's Admin {version} • {new Date().getFullYear()}
      </span>
    </footer>
  )
}
