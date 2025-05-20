"use client"

import type React from "react"

import { useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

export function RegisterForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Basic validation
    if (password !== passwordConfirmation) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      // Get the API URL from environment variable
      const apiUrl = process.env.NEXT_PUBLIC_API_URL

      if (!apiUrl) {
        throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
      }

      const response = await fetch(`${apiUrl}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle validation errors from the API
        if (data.error === "Validation failed" && data.details) {
          const errorMessages = Object.entries(data.details)
            .map(([field, errors]) => `${field}: ${(errors as string[]).join(", ")}`)
            .join("; ")
          throw new Error(errorMessages)
        }
        throw new Error(data.message || "Registration failed. Please try again.")
      }

      // Success - show toast and redirect to login
      toast({
        title: "Registration successful",
        description: "Your account has been created. You can now log in.",
      })

      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push("/login")
      }, 1500)
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
          <div className="text-2xl font-bold">Create an account</div>
          <div className="text-sm text-muted-foreground">Enter your details to create a new account</div>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Show
                  </>
                )}
              </Button>
            </div>
            <div className="relative">
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
            </div>
            <p className="text-xs text-muted-foreground">Password must be at least 8 characters long</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password-confirmation">Confirm Password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
              >
                {showPasswordConfirmation ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Show
                  </>
                )}
              </Button>
            </div>
            <div className="relative">
              <Input
                id="password-confirmation"
                type={showPasswordConfirmation ? "text" : "password"}
                placeholder="••••••••"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Button variant="link" className="p-0 font-normal" onClick={() => router.push("/login")}>
              Sign in
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
