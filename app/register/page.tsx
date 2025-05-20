import { RegisterForm } from "@/components/register-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { Server } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with logo and theme toggle */}
      <header className="flex h-16 items-center justify-between px-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Server className="h-6 w-6" />
          <span className="font-semibold">Game Server Admin</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Create a new account</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Register to access the game server admin dashboard
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900">
        <p>© {new Date().getFullYear()} Game Server Admin. All rights reserved.</p>
      </footer>
    </div>
  )
}
