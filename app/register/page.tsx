"use client"

import { RegisterForm } from "@/components/register-form"
import { useServerConfig } from "@/hooks/use-server-config"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function RegisterPage() {
  const { config, loading } = useServerConfig()
  const registrationEnabled = loading || config === null || config.features.registration_enabled

  return (
    <div className="flex flex-1 items-center justify-center py-4 px-4 sm:py-2">
      <div className="w-full max-w-md">
        {!loading && !registrationEnabled ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Disabled</AlertTitle>
            <AlertDescription>
              New account registration is currently disabled. Please contact an administrator.
            </AlertDescription>
          </Alert>
        ) : (
          <RegisterForm />
        )}
      </div>
    </div>
  )
}
