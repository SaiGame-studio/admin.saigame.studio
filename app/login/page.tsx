"use client"

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-2 px-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
}
