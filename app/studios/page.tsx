"use client"

import { useEffect, useState } from "react"
import { fetchUserStudios, createStudio } from "@/lib/studio-api"
import type { Studio } from "@/types/studio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Plus, X, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { useTranslation } from '@/lib/i18n/use-translation'
import Link from "next/link"

export default function StudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newStudioName, setNewStudioName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const { t } = useTranslation();

  useEffect(() => {
    async function loadStudios() {
      try {
        setLoading(true)
        const data = await fetchUserStudios()
        setStudios(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load studios")
      } finally {
        setLoading(false)
      }
    }

    loadStudios()
  }, [])

  async function handleCreateStudio() {
    if (!newStudioName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const studio = await createStudio({ name: newStudioName.trim() });
      setStudios(prev => [studio, ...prev]);
      setNewStudioName("");
    } catch (err: any) {
      setCreateError(err.message || "Failed to create studio");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('common.studios')}</h1>
          <p className="">{t('studio.manageTitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={newStudioName}
            onChange={e => setNewStudioName(e.target.value)}
            placeholder={t('studio.newName')}
            className="w-48"
            disabled={creating}
            onKeyDown={e => {
              if (e.key === 'Enter' && newStudioName.trim() && !creating) {
                handleCreateStudio();
              }
            }}
          />
          <Button
            onClick={handleCreateStudio}
            disabled={!newStudioName.trim() || creating}
            variant="default"
          >
            {creating ? t('common.loading') : t('studio.create')}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {createError && (
        <Alert variant="destructive" className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <div>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{createError}</AlertDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCreateError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : studios.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="mb-4">{t('studio.noStudios')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
          {studios.map((studio) => (
            <Card key={studio.id} className="overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="flex flex-col space-y-2">
                  <CardTitle className="text-xl">
                    <Link href={`/studios/${studio.id}`} className="inline-flex items-center gap-1 hover:text-primary">
                      {studio.name}
                      <ExternalLink className="w-4 h-4 " />
                    </Link>
                  </CardTitle>
                  <div className="flex flex-col gap-1">
                    {studio.tier && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm ">{t('studio.tier')}:</span>
                        <span className="text-sm ">{studio.tier}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/studios/${studio.id}`}>{t('studio.viewDetails')}</Link>
                </Button>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-col gap-1 text-sm ">
                  <span>{t('common.games')}: {studio.games_count}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
