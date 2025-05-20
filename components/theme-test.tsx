"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

export function ThemeTest() {
  const { theme } = useTheme()

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Theme Test</CardTitle>
        <CardDescription>This card demonstrates theme-aware styling</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-md bg-primary text-primary-foreground">Primary Color Block</div>
        <div className="p-4 rounded-md bg-secondary text-secondary-foreground">Secondary Color Block</div>
        <div className="p-4 rounded-md bg-accent text-accent-foreground">Accent Color Block</div>
        <div className="p-4 rounded-md bg-muted text-muted-foreground">Muted Color Block</div>
        <div className="flex gap-2">
          <Button variant="default">Default Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Current theme: <span className="font-bold">{theme}</span>
        </div>
      </CardContent>
    </Card>
  )
}
