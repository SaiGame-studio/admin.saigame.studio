"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { GoogleLogin } from "@react-oauth/google"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

// Import the necessary utilities and hooks
import { useAuth } from "@/contexts/auth-context"
import { safeSetItem } from "@/lib/storage-utils"

// Add the REMEMBERED_EMAIL_KEY constant at the top of the file
const REMEMBERED_EMAIL_KEY = "game_server_admin_remembered_email"

// Update the RegisterForm function to use the auth context
export function RegisterForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "780968193083-p0c7vvsf864khtltmqk8pv82l6qoconn.apps.googleusercontent.com"
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const [googleBtnWidth, setGoogleBtnWidth] = useState("300")

  useEffect(() => {
    const updateWidth = () => {
      const vw = window.innerWidth
      if (vw < 360) setGoogleBtnWidth("260")
      else if (vw < 400) setGoogleBtnWidth("280")
      else setGoogleBtnWidth("400")
    }
    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsGoogleLoading(true)
    setError(null)
    try {
      if (!apiUrl) {
        throw new Error("API URL is not configured")
      }
      const response = await fetch(`${apiUrl}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id_token: credentialResponse.credential }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || "Google sign-in failed")
      }
      if (data.access_token) {
        login(data.access_token, data.refresh_token)
        toast({ title: "Welcome!", description: `Signed in as ${data.user?.username || data.user?.email || "User"}!` })
      } else {
        throw new Error("No access token received from server")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // Update the handleSubmit function to handle the token and auto-login
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

      // Update the fetch call in the handleSubmit function to include the Accept header
      const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
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

      // Save the email for future logins
      safeSetItem(REMEMBERED_EMAIL_KEY, email)

      // Registration successful - show success message and redirect to login
      toast({
        title: "Registration successful",
        description: `Account created for ${data.user?.username || email}. Please log in to continue.`,
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
        <CardHeader className="space-y-1 pb-2">
          <div className="text-2xl font-bold">Create an account</div>
          <div className="text-sm text-muted-foreground">Enter your details to create a new account</div>
        </CardHeader>
        <CardContent className="space-y-3 pb-3">
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
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
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
            <Label htmlFor="password-confirmation">Confirm Password</Label>
            <Input
              id="password-confirmation"
              type="password"
              placeholder="••••••••"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-0">
          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in with Google...
              </>
            ) : (
              "Create account"
            )}
          </Button>
          {googleClientId && (
            <>
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <div className="flex justify-center w-full overflow-hidden">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google sign-in failed. Please try again.")}
                  theme="outline"
                  size="large"
                  width={googleBtnWidth}
                  text="signup_with"
                  shape="rectangular"
                />
              </div>
            </>
          )}
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Button variant="link" className="p-0 font-normal" onClick={() => router.push("/login")}>
              Sign in
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <Button variant="link" className="p-0 font-normal" size="sm" onClick={() => router.push("/forgot-password")}>
              Forgot password?
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
