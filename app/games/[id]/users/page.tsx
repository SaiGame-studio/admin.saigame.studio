"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getGameUserProfiles } from "@/lib/game-user-api";
import { getGame } from "@/lib/game-api";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function GameUserProfilesPage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [profileRes, gameRes] = await Promise.all([
          getGameUserProfiles(gameId, 1, 10),
          getGame(gameId),
        ]);
        setProfiles(profileRes.data.data);
        setGame(gameRes);
        setError(null);
      } catch (err) {
        setError("Failed to load user profiles or game info");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [gameId]);

  if (loading) return <div className="container mx-auto py-6">{t('common.loading')}</div>;
  if (error) return <div className="container mx-auto py-6">{t('common.error')}</div>;

  return (
    <div className="container mx-auto py-6">
      {game && (
        <div className="mb-2">
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink href={`/studios/${game.studio?.id}`}>{game.studio?.name || t('common.studio')}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/games/${game.id}`}>{game.name}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-muted-foreground">{t('userProfiles.title')}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}
      <Card  className="border border-muted-foreground/0">
        <CardHeader>
          <CardTitle>
            {t('userProfiles.title')} - {game?.name} {game?.studio?.name ? `| ${game.studio.name}` : ""}
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">{t('userProfiles.note')}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((item: any) => (
              <Card key={item.user_profile.id}>
                <CardHeader>
                  <CardTitle className="text-base">{t('userProfiles.player')} - {item.user_profile.type}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs mb-2"><b>{t('userProfiles.id')}:</b> {item.user_profile.id}</div>
                  <div className="mb-1"><b>{t('userProfiles.createdAt')}:</b> {formatTimestamp(item.user_profile.created_at)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 