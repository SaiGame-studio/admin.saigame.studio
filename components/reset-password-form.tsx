"use client"

import type React from "react"

import { useState } from "react"
import { Loader2, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!token) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <div className="text-2xl font-bold">Invalid link</div>
          <div className="text-sm text-muted-foreground">
            This password reset link is invalid or has expired.
          </div>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => router.push("/forgot-password")}>
            Request a new reset link
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-2xl font-bold">Password reset successful</div>
          <div className="text-sm text-muted-foreground">
            Your password has been reset. You can now log in with your new password.
          </div>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => router.push("/login")}>
            Go to login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirmation) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL

      if (!apiUrl) {
        throw new Error("API URL is not configured.")
      }

      const response = await fetch(`${apiUrl}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password. The link may have expired.")
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader className="space-y-1">
          <div className="text-2xl font-bold">Set new password</div>
          <div className="text-sm text-muted-foreground">
            Enter your new password below
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">New password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <><EyeOff className="mr-2 h-4 w-4" />Hide</>
                ) : (
                  <><Eye className="mr-2 h-4 w-4" />Show</>
                )}
              </Button>
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">Password must be at least 8 characters long</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-confirmation">Confirm new password</Label>
            <Input
              id="password-confirmation"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
          <Button variant="link" className="w-full" onClick={() => router.push("/login")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
