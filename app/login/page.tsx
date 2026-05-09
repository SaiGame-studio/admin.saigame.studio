"use client"

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-4 px-4 sm:py-2">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
}
