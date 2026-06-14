"use client";
import { useEffect, useState } from "react";
import { fetchUserStudios } from "@/lib/studio-api";
import type { Studio } from "@/types/studio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Gamepad2, Users, ExternalLink, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/use-translation";
export default function DashboardPage() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();
    useEffect(() => {
        fetchUserStudios()
            .then(data => setStudios(data))
            .catch(err => setError(err instanceof Error ? err.message : "Failed to load studios"))
            .finally(() => setLoading(false));
    }, []);
    return (<div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('common.dashboard')}</h1>
        <p className="text-muted-foreground">{t('studio.manageTitle')}</p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5"/>
          {t('common.studios')}
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/studios">{t('studio.viewDetails')} all</Link>
        </Button>
      </div>

      {error && (<Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4"/>
          <AlertDescription>{error}</AlertDescription>
        </Alert>)}

      {loading ? (<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (<Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4"/>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-1/2"/>
                <Skeleton className="h-4 w-1/3"/>
                <Skeleton className="h-8 w-full mt-2"/>
              </CardContent>
            </Card>))}
        </div>) : studios.length === 0 ? (<Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Building2 className="h-8 w-8 mb-3 opacity-40"/>
            <p>{t('studio.noStudios')}</p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/studios">{t('studio.create')}</Link>
            </Button>
          </CardContent>
        </Card>) : (<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {studios.map(studio => (<Card key={studio.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{studio.name}</CardTitle>
                </div>
                {studio.tier && (<p className="text-xs text-muted-foreground">{studio.tier}</p>)}
              </CardHeader>
              <CardContent className="flex flex-col gap-3 flex-1">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Gamepad2 className="h-3.5 w-3.5"/>
                    {studio.usage?.games ?? studio.game_count ?? 0}
                    {studio.limits?.max_games != null && ` / ${studio.limits.max_games}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5"/>
                    {studio.usage?.total_members ?? 0}
                    {studio.limits?.max_total_members != null && ` / ${studio.limits.max_total_members}`}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-auto w-full">
                  <Link href={`/studios/${studio.id}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5"/>
                    {t('studio.viewDetails')}
                  </Link>
                </Button>
              </CardContent>
            </Card>))}
        </div>)}
    </div>);
}
