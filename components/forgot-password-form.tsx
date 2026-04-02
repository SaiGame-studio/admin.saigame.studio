"use client"

import type React from "react"

import { useState } from "react"
import { Loader2, ArrowLeft, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

export function ForgotPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL

      if (!apiUrl) {
        throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
      }

      const response = await fetch(`${apiUrl}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email. Please try again.")
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div className="text-2xl font-bold">Check your email</div>
          <div className="text-sm text-muted-foreground">
            We've sent a password reset link to <strong>{email}</strong>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsSubmitted(false)
              setEmail("")
            }}
          >
            Try another email
          </Button>
        </CardContent>
        <CardFooter>
          <Button variant="link" className="w-full" onClick={() => router.push("/login")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader className="space-y-1">
          <div className="text-2xl font-bold">Forgot password</div>
          <div className="text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                Sending...
              </>
            ) : (
              "Send reset link"
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
