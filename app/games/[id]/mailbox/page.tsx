"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { GameNavButtons } from "@/components/GameNavButtons";
import { getGame, updateGame } from "@/lib/game-api";
import type { Game } from "@/types/game";
import { isValidUUID, type SystemMailForm } from "./_components/mailbox-types";
import { SendMailForm } from "./_components/send-mail-form";
import { PlayerInboxCard } from "./_components/player-inbox-card";
import { usePlayerMailbox } from "./_hooks/use-player-mailbox";

export default function MailboxPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = React.use(params);
    const router = useRouter();
    const gameId = id;
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const [loading, setLoading] = useState(false);
    const [game, setGame] = useState<Game | null>(null);
    const [form, setForm] = useState<SystemMailForm>({
        receiver_id: "",
        subject: "Thank You",
        body: "Thank you for playing with us!",
        message_type: "system_reward",
        idempotency_key: "",
        expires_in_days: 30,
        attachments: []
    });
    const playerIdRef = useRef<HTMLInputElement>(null);
    const [highlightPlayerId, setHighlightPlayerId] = useState(false);
    const { mailboxData, mailboxLoading, mailboxError, itemDefsMap, fetchPlayerMailbox } = usePlayerMailbox(gameId, form.receiver_id);
    const handleFocusPlayerId = () => {
        playerIdRef.current?.focus();
        setHighlightPlayerId(true);
        setTimeout(() => setHighlightPlayerId(false), 1500);
    };
    // Check for userId in URL parameters and auto-fill the form
    useEffect(() => {
        const userId = searchParams.get('userId');
        if (userId) {
            setForm(prevForm => ({
                ...prevForm,
                receiver_id: userId
            }));
        }
    }, [searchParams]);
    // Fetch game info for breadcrumb
    useEffect(() => {
        getGame(gameId).then(setGame).catch(() => { });
    }, [gameId]);
    const handleReceiverIdChange = (value: string) => {
        setForm(prev => ({ ...prev, receiver_id: value }));
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('userId', value);
        }
        else {
            params.delete('userId');
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Generate idempotency key if not provided
            const payload = {
                ...form,
                idempotency_key: form.idempotency_key || `sysmail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            await api.post(`/api/v1/games/${gameId}/mailbox/system-mail`, payload);
            toast({
                title: t('mailbox.toastSuccessTitle'),
                description: t('mailbox.toastSuccessDesc')
            });
            // Refresh mailbox list for current player
            const sentToId = form.receiver_id;
            if (sentToId && isValidUUID(sentToId)) {
                fetchPlayerMailbox(sentToId);
            }
            // Reset form (keep receiver_id so mailbox stays visible)
            setForm({
                receiver_id: sentToId,
                subject: "Thank You",
                body: "Thank you for playing with us!",
                message_type: "system_reward",
                idempotency_key: "",
                expires_in_days: 30,
                attachments: []
            });
        }
        catch (error: any) {
            console.error("Failed to send system mail:", error);
            toast({
                title: t('mailbox.toastErrorTitle'),
                description: error.message || t('mailbox.toastErrorDesc'),
                variant: "destructive"
            });
        }
        finally {
            setLoading(false);
        }
    };
    return (<div id="mailbox-page" className="mailbox-page container mx-auto py-6">
      <div id="mailbox-breadcrumb-wrapper" className="mailbox-breadcrumb-wrapper mb-2">
        <Breadcrumb id="mailbox-breadcrumb" className="mailbox-breadcrumb">
          <BreadcrumbList id="mailbox-breadcrumb-list" className="mailbox-breadcrumb-list flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem id="mailbox-breadcrumb-games-item" className="mailbox-breadcrumb-item">
              <BreadcrumbLink id="mailbox-breadcrumb-games-link" className="mailbox-breadcrumb-link" href="/games">{t('common.games')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator id="mailbox-breadcrumb-separator-game" className="mailbox-breadcrumb-separator">/</BreadcrumbSeparator>
            <BreadcrumbItem id="mailbox-breadcrumb-game-item" className="mailbox-breadcrumb-item">
              <BreadcrumbLink id="mailbox-breadcrumb-game-link" className="mailbox-breadcrumb-link" href={`/games/${gameId}`}>{game?.name || t('common.game')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator id="mailbox-breadcrumb-separator-mailbox" className="mailbox-breadcrumb-separator">/</BreadcrumbSeparator>
            <BreadcrumbItem id="mailbox-breadcrumb-current-item" className="mailbox-breadcrumb-item">
              <span id="mailbox-breadcrumb-current" className="mailbox-breadcrumb-current">{t('common.mailbox')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div id="mailbox-header" className="mailbox-header flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div id="mailbox-header-left" className="mailbox-header-left flex items-center gap-3">
          <Button id="mailbox-back-btn" className="mailbox-back-btn" variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft id="mailbox-back-icon" className="mailbox-back-icon h-4 w-4"/>
          </Button>
          <div id="mailbox-header-text" className="mailbox-header-text group">
            <h1 id="mailbox-page-title" className="mailbox-page-title text-2xl font-bold">{t('mailbox.pageTitle')}</h1>
            <p id="mailbox-page-subtitle" className="mailbox-page-subtitle text-muted-foreground">{t('mailbox.pageSubtitle')}</p>
          </div>
        </div>
        <div id="mailbox-header-nav" className="mailbox-header-nav mt-4 md:mt-0">
          <GameNavButtons id="mailbox-game-nav" gameId={gameId} active="mailbox"/>
        </div>
      </div>

      <div id="mailbox-layout" className="mailbox-layout grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Column 1: Send System Mail */}
        <SendMailForm gameId={gameId} form={form} setForm={setForm} loading={loading} onSubmit={handleSubmit} onReceiverIdChange={handleReceiverIdChange} playerIdRef={playerIdRef} highlightPlayerId={highlightPlayerId}/>

        {/* Column 2: Settings + Player Mailbox */}
        <div id="mailbox-side-column" className="mailbox-side-column flex flex-col gap-4">
        {game && (<div id="mailbox-trading-setting" className="mailbox-trading-setting flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30">
            <div id="mailbox-trading-setting-text" className="mailbox-trading-setting-text">
              <p id="mailbox-trading-setting-title" className="mailbox-trading-setting-title text-sm font-medium">{t('game.allowPlayerTrading')}</p>
              <p id="mailbox-trading-setting-desc" className="mailbox-trading-setting-desc text-xs text-muted-foreground">{t('game.allowPlayerTradingDesc')}</p>
            </div>
            <Switch id="mailbox-trading-switch" className="mailbox-trading-switch" checked={game.settings?.allow_player_trading ?? false} onCheckedChange={async (checked) => {
                try {
                    const updated = await updateGame(game.id, {
                        settings: { ...game.settings, allow_player_trading: checked }
                    });
                    setGame(updated);
                    toast({
                        title: t('game.settingsUpdated'),
                        description: checked ? t('game.tradingEnabled') : t('game.tradingDisabled')
                    });
                }
                catch {
                    toast({ title: t('mailbox.toastErrorTitle'), description: t('game.failedUpdateSettings'), variant: "destructive" });
                }
            }}/>
          </div>)}
        <PlayerInboxCard gameId={gameId} receiverId={form.receiver_id} mailboxData={mailboxData} mailboxLoading={mailboxLoading} mailboxError={mailboxError} itemDefsMap={itemDefsMap} onRefresh={() => fetchPlayerMailbox(form.receiver_id)} onFocusPlayerId={handleFocusPlayerId}/>
        </div>
      </div>
    </div>);
}
