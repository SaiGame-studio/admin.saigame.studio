"use client"

import { Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Download, ExternalLink } from "lucide-react"

function BasicTab() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Basic tutorials content coming soon.</p>
    </div>
  )
}

function TutorialsTabs() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Learning Center</h1>
          <p className="text-sm text-muted-foreground">Tutorials and resources to get started</p>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Basic
          </TabsTrigger>
          <TabsTrigger
            value="_download"
            className="flex items-center gap-2"
            onClick={(e) => {
              e.preventDefault()
              window.open("https://github.com/SaiGame-studio/ss-unity/releases", "_blank")
            }}
          >
            <Download className="h-4 w-4" />
            Download Package
            <ExternalLink className="h-3 w-3 opacity-50" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-0">
          <BasicTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function TutorialsPage() {
  return (
    <Suspense>
      <TutorialsTabs />
    </Suspense>
  )
}
