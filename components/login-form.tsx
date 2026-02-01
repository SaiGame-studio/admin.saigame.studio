"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Checkbox } from "@/components/ui/checkbox"
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/storage-utils"
import { useRouter } from "next/navigation"

// Storage key for remembered email
const REMEMBERED_EMAIL_KEY = "game_server_admin_remembered_email"

export function LoginForm() {
  const { login } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [emailWasRemembered, setEmailWasRemembered] = useState(false)
  const router = useRouter()

  // Check for remembered email on component mount
  useEffect(() => {
    const rememberedEmail = safeGetItem(REMEMBERED_EMAIL_KEY)
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
      setEmailWasRemembered(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Handle "Remember Me" functionality
      if (rememberMe && email) {
        // Store email in localStorage if "Remember Me" is checked
        safeSetItem(REMEMBERED_EMAIL_KEY, email)
      } else {
        // Remove stored email if "Remember Me" is unchecked
        safeRemoveItem(REMEMBERED_EMAIL_KEY)
      }

      // Get the API URL from environment variable
      const apiUrl = process.env.NEXT_PUBLIC_API_URL

      if (!apiUrl) {
        throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
      }

      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed. Please check your credentials.")
      }

      // Success - use the auth context to login
      if (data.access_token) {
        login(data.access_token, data.refresh_token)

        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user?.username || data.user?.email || 'User'}!`,
        })
      } else {
        throw new Error("No access token received from server")
      }
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
          <div className="text-2xl font-bold">Login</div>
          <div className="text-sm text-muted-foreground">Enter your email and password to sign in</div>
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
              className={cn(emailWasRemembered && "border-primary")}
              aria-describedby={emailWasRemembered ? "email-remembered" : undefined}
            />
            {emailWasRemembered && (
              <p id="email-remembered" className="text-xs text-muted-foreground flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1.5"></span>
                Email remembered from previous login
              </p>
            )}
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
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => {
                  setRememberMe(checked === true)
                  // If unchecking, reset the emailWasRemembered state
                  if (checked === false) {
                    setEmailWasRemembered(false)
                  }
                }}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remember me
              </Label>
            </div>
            <Button variant="link" className="px-0 font-normal" size="sm">
              Forgot password?
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
          <div className="text-center text-sm">
            Don't have an account?{" "}
            <Button variant="link" className="p-0 font-normal" onClick={() => router.push("/register")}>
              Create one
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
