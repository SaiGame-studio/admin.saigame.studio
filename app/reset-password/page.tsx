"use client";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Server } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
export default function ResetPasswordPage() {
    return (<div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between px-6 border-b bg-background">
        <Link href="/" className="flex items-center gap-2">
          <Server className="h-6 w-6"/>
          <span className="font-semibold">Sai's Admin</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">Reset your password</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your new password below
            </p>
          </div>
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>

      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Sai's Admin. All rights reserved.</p>
      </footer>
    </div>);
}
