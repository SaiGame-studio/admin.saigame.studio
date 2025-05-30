"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/utils/date-utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getGame } from "@/lib/game-api";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { fetchGameItemProfiles, createItemProfile, ItemProfile } from "@/lib/item-profile-api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

export default function GameItemProfilesPage() {
  const params = useParams() as { id: string };
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);
  const [itemProfiles, setItemProfiles] = useState<ItemProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [gameName, setGameName] = useState<string>("");
  const [game, setGame] = useState<any>(null);
  const [quickProfileName, setQuickProfileName] = useState("");
  const [quickProfileLoading, setQuickProfileLoading] = useState(false);
  const [createProfileError, setCreateProfileError] = useState<{ message: string; hints: string[] } | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadItemProfilesAndGame() {
      try {
        setLoading(true);
        const [gameData, profiles] = await Promise.all([
          getGame(params.id),
          fetchGameItemProfiles(params.id)
        ]);
        setGameName(gameData.name);
        setGame(gameData);
        setItemProfiles(profiles);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadItemProfilesAndGame();
  }, [params.id]);

  async function handleQuickCreateProfile() {
    if (!quickProfileName.trim()) return;
    setQuickProfileLoading(true);
    setCreateProfileError(null);
    try {
      await createItemProfile(params.id, { name: quickProfileName });
      setQuickProfileName("");
      if (quickInputRef.current) quickInputRef.current.value = "";
      // reload profiles
      const [gameData, profiles] = await Promise.all([
        getGame(params.id),
        fetchGameItemProfiles(params.id)
      ]);
      setGameName(gameData.name);
      setItemProfiles(profiles);
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setCreateProfileError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] });
      } else {
        setCreateProfileError({ message: e?.message || 'Failed to create item profile', hints: [] });
      }
    } finally {
      setQuickProfileLoading(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">{t('common.loading')}</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive mb-4">
          <CardHeader>
            <CardTitle>{t('common.error')}</CardTitle>
            <CardDescription>{t('itemProfile.loadError')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href={`/studios/${game?.studio?.id}`}>{game?.studio?.name || t('common.studio')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${params.id}`}>{gameName || t('common.game')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-muted-foreground">{t('itemProfile.title')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('itemProfile.title')}</h1>
          <p className="text-muted-foreground text-base">{t('itemProfile.listDesc')} {gameName && (
            <Link href={`/games/${params.id}`} className="text-lg font-normal text-muted-foreground inline-flex items-center gap-1 hover:text-primary">
              {gameName}
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Link>
          )}</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            ref={quickInputRef}
            type="text"
            className="border rounded px-2 py-1 bg-background text-foreground"
            placeholder={t('itemProfile.quickNamePlaceholder')}
            value={quickProfileName}
            onChange={e => setQuickProfileName(e.target.value)}
            disabled={quickProfileLoading}
            onKeyDown={e => { if (e.key === 'Enter') handleQuickCreateProfile() }}
            style={{ minWidth: 160 }}
          />
          <Button onClick={handleQuickCreateProfile} disabled={quickProfileLoading || !quickProfileName.trim()}>
            {quickProfileLoading ? t('itemProfile.creating') : t('itemProfile.create')}
          </Button>
        </div>
      </div>
      {createProfileError && (
        <Alert variant="destructive" className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <div>
              <AlertTitle>{t('common.error')}</AlertTitle>
              <AlertDescription>
                {typeof createProfileError === 'string' ? createProfileError : createProfileError.message}
                {Array.isArray(createProfileError?.hints) && createProfileError.hints.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-base text-destructive">
                    {createProfileError.hints.map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCreateProfileError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}
      {itemProfiles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('itemProfile.noProfiles')}</CardTitle>
            <CardDescription>{t('itemProfile.noProfilesDesc')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {itemProfiles.map((profile) => (
            <Card key={profile.id} className="overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="flex flex-col">
                  <CardTitle className="text-xl font-mono">
                    <Link href={`/games/${params.id}/item-profiles/${profile.id}`} className="inline-flex items-center gap-1">
                      {profile.name}
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </CardTitle>
                  <CardDescription>{t('itemProfile.code')}: {profile.code_name}</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/games/${params.id}/item-profiles/${profile.id}`}>{t('itemProfile.viewDetails')}</Link>
                </Button>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>{t('itemProfile.type')}: {profile.type || '-'}</span>
                  <span>{t('itemProfile.level')}: {profile.level_start} - {profile.level_max}</span>
                  <span>{t('itemProfile.stackLimit')}: {profile.stack_limit}</span>
                  <span>{t('itemProfile.status')}: {profile.status}</span>
                  {profile.custom_data && Object.keys(profile.custom_data).length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 mt-2 font-semibold hover:underline">
                        {t('itemProfile.customData')}
                        <ChevronDown className="w-4 h-4 transition-transform data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-4 mt-2">
                        {Object.entries(profile.custom_data).map(([key, value]) => (
                          <div key={key} className="text-sm">{key}: {String(value)}</div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 