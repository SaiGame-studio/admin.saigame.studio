"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getGame, fetchGameTeams, getGameCcu, getAllGameTags, updateGame, type GameCcu } from "@/lib/game-api";
import { fetchStudioWithCache } from "@/lib/studio-api";
import type { Game } from "@/types/game";
import type { Studio } from "@/types/studio";
import type { Team } from "@/types/team";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Gamepad2, ExternalLink, Store, Package, Users, Copy, Check, BarChart2, BookOpen, Dices, ScrollText, RefreshCw, Tag, X, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { Progress } from "@/components/ui/progress";
import { GameNameEditable, GameStatusEditable, GameDescriptionEditable } from "@/components/StudioNameEditable";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { useTranslation } from '@/lib/i18n/use-translation';
import { DeleteGameDialog } from "@/components/DeleteGameDialog";
import { GameNavButtons } from "@/components/GameNavButtons";
import { DailyQuestMaxAdvanceDays } from "@/components/DailyQuestMaxAdvanceDays";
import { TracingSettingsGroup } from "@/components/TracingSettingsGroup";
import { RemoveTeamFromGameDialog } from "@/components/RemoveTeamFromGameDialog";
import { AddTeamToGameDialog } from "@/components/AddTeamToGameDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { getGamePlugins, getPluginCatalog, type GamePluginsResult, type Plugin } from "@/lib/plugin-api";
import { EquipmentPanel } from "@/components/EquipmentPanel";
import { GamePublicInfoCard } from "./GamePublicInfoCard";
const fmt = (n: number) => n.toLocaleString();
export default function GameDetailsPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id: gameId } = React.use(params);
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    const [game, setGame] = useState<Game | null>(null);
    const [studio, setStudio] = useState<Studio | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [teamsLoading, setTeamsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [gamePlugins, setGamePlugins] = useState<GamePluginsResult | null>(null);
    const [catalog, setCatalog] = useState<Plugin[]>([]);
    const [ccu, setCcu] = useState<GameCcu | null>(null);
    const [ccuRefreshing, setCcuRefreshing] = useState(false);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [tagsOpen, setTagsOpen] = useState(false);
    const [tagsSaving, setTagsSaving] = useState(false);
    const [tagSearch, setTagSearch] = useState("");
    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current)
            return;
        hasFetched.current = true;
        async function loadGame() {
            try {
                setLoading(true);
                const gameData = await getGame(gameId);
                setGame(gameData);
                // Load studio data if studio_id exists
                if (gameData.studio_id) {
                    try {
                        const studioData = await fetchStudioWithCache(gameData.studio_id);
                        setStudio(studioData);
                    }
                    catch (err) {
                        console.error("Failed to load studio:", err);
                    }
                }
                setError(null);
            }
            catch (err) {
                setError(t('game.loadErrorRetry'));
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        }
        async function loadTeams() {
            try {
                setTeamsLoading(true);
                const teamsData = await fetchGameTeams(gameId);
                setTeams(teamsData);
            }
            catch (err) {
                console.error("Failed to load teams:", err);
            }
            finally {
                setTeamsLoading(false);
            }
        }
        async function loadPlugins() {
            try {
                const [catalogData, pluginsData] = await Promise.all([
                    getPluginCatalog(),
                    getGamePlugins(gameId),
                ]);
                setCatalog(catalogData);
                setGamePlugins(pluginsData);
            }
            catch (err) {
                console.error("Failed to load plugins:", err);
            }
        }
        async function loadCcu() {
            try {
                const ccuData = await getGameCcu(gameId);
                setCcu(ccuData);
            }
            catch (err) {
                console.error("Failed to load CCU:", err);
            }
        }
        async function loadTags() {
            try {
                const tags = await getAllGameTags();
                setAllTags(tags);
            }
            catch (err) {
                console.error("Failed to load game tags:", err);
            }
        }
        loadGame().then();
        loadTeams().then();
        loadPlugins().then();
        loadCcu().then();
        loadTags().then();
    }, [gameId]);
    const refreshCcu = async () => {
        setCcuRefreshing(true);
        try {
            const ccuData = await getGameCcu(gameId);
            setCcu(ccuData);
        }
        catch (err) {
            console.error("Failed to refresh CCU:", err);
        }
        finally {
            setCcuRefreshing(false);
        }
    };
    const handleAddTag = async (tag: string) => {
        if (!game)
            return;
        const currentTags = game.tags ?? [];
        const normalized = tag.trim().toLowerCase();
        if (currentTags.includes(normalized))
            return;
        if (currentTags.length >= 10) {
            toast({ title: t('game.tagLimitReached'), description: t('game.tagLimitDesc'), variant: "destructive" });
            return;
        }
        const newTags = [...currentTags, normalized];
        setTagsSaving(true);
        try {
            const updated = await updateGame(gameId, { tags: newTags });
            setGame(prev => prev ? { ...prev, tags: updated.tags } : prev);
            setTagsOpen(false);
            setTagSearch("");
        }
        catch (err) {
            console.error("Failed to add tag:", err);
            toast({ title: t('common.error'), description: t('game.failedAddTag'), variant: "destructive" });
        }
        finally {
            setTagsSaving(false);
        }
    };
    const handleRemoveTag = async (tag: string) => {
        if (!game)
            return;
        const newTags = (game.tags ?? []).filter(t => t !== tag);
        setTagsSaving(true);
        try {
            const updated = await updateGame(gameId, { tags: newTags });
            setGame(prev => prev ? { ...prev, tags: updated.tags } : prev);
        }
        catch (err) {
            console.error("Failed to remove tag:", err);
            toast({ title: t('common.error'), description: t('game.failedRemoveTag'), variant: "destructive" });
        }
        finally {
            setTagsSaving(false);
        }
    };
    const handleTeamRemoved = () => {
        fetchGameTeams(gameId)
            .then(data => setTeams(data))
            .catch(err => console.error("Failed to reload teams:", err));
    };
    function getStatusColor(status: string) {
        switch (status) {
            case "released":
                return "bg-green-500";
            case "beta":
                return "bg-blue-500";
            case "alpha":
                return "bg-purple-500";
            case "development":
                return "bg-yellow-500";
            case "archived":
                return "bg-gray-500";
            default:
                return "bg-gray-500";
        }
    }
    if (loading) {
        return (<div id="game-detail-loading-page" className="game-detail-page container mx-auto px-4 py-4 sm:px-6 sm:py-6">
                <div id="game-detail-loading-content" className="game-detail-loading animate-pulse">
                    <div id="game-detail-loading-title" className="game-detail-loading-title h-8 w-1/3 bg-muted/50 rounded mb-4"/>
                    <div id="game-detail-loading-breadcrumb" className="game-detail-loading-breadcrumb h-4 w-1/4 bg-muted/50 rounded mb-8"/>
                    <Card id="game-detail-loading-card" className="game-detail-loading-card">
                        <CardHeader id="game-detail-loading-card-header" className="game-detail-loading-card-header h-24 bg-muted/50 rounded-t-lg"/>
                        <CardContent id="game-detail-loading-card-content" className="game-detail-loading-card-content p-6">
                            <div id="game-detail-loading-line-primary" className="game-detail-loading-line h-4 w-3/4 bg-muted/50 rounded mb-4"/>
                            <div id="game-detail-loading-line-secondary" className="game-detail-loading-line h-4 w-1/2 bg-muted/50 rounded mb-4"/>
                            <div id="game-detail-loading-line-tertiary" className="game-detail-loading-line h-4 w-2/3 bg-muted/50 rounded"/>
                        </CardContent>
                        <CardFooter id="game-detail-loading-card-footer" className="game-detail-loading-card-footer bg-muted/20 h-12 rounded-b-lg"/>
                    </Card>
                </div>
            </div>);
    }
    if (error || !game) {
        return (<div id="game-detail-error-page" className="game-detail-page container mx-auto px-4 py-4 sm:px-6 sm:py-6">
                <Card id="game-detail-error-card" className="game-detail-error-card border-destructive">
                    <CardHeader id="game-detail-error-card-header" className="game-detail-error-card-header">
                        <CardTitle id="game-detail-error-title" className="game-detail-error-title">{t('common.error')}</CardTitle>
                        <CardDescription id="game-detail-error-description" className="game-detail-error-description">{t('game.loadError')}</CardDescription>
                    </CardHeader>
                    <CardContent id="game-detail-error-card-content" className="game-detail-error-card-content">
                        <p id="game-detail-error-message" className="game-detail-error-message">{error || t('game.notFoundText')}</p>
                    </CardContent>
                    <CardFooter id="game-detail-error-card-footer" className="game-detail-error-card-footer">
                        <Button id="game-detail-error-back-button" className="game-detail-error-back-button" variant="outline" onClick={() => router.back()}>
                            {t('common.back')}
                        </Button>
                        <Button id="game-detail-error-retry-button" className="game-detail-error-retry-button ml-2" onClick={() => router.refresh()}>
                            {t('game.tryAgain')}
                        </Button>
                    </CardFooter>
                </Card>
            </div>);
    }
    return (<div id="game-detail-page" className="game-detail-page container mx-auto px-4 py-4 sm:px-6 sm:py-6">
            <div id="game-detail-breadcrumb-section" className="game-detail-breadcrumb-section mb-2">
                <Breadcrumb id="game-detail-breadcrumb" className="game-detail-breadcrumb">
                    <BreadcrumbList id="game-detail-breadcrumb-list" className="game-detail-breadcrumb-list flex-nowrap overflow-x-auto whitespace-nowrap">
                        <BreadcrumbItem id="game-detail-breadcrumb-studios-item" className="game-detail-breadcrumb-item">
                            <BreadcrumbLink id="game-detail-breadcrumb-studios-link" className="game-detail-breadcrumb-link" href="/studios">{t('common.studios')}</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator id="game-detail-breadcrumb-studios-separator" className="game-detail-breadcrumb-separator">/</BreadcrumbSeparator>
                        {game.studio_id && (<>
                                <BreadcrumbItem id="game-detail-breadcrumb-studio-item" className="game-detail-breadcrumb-item">
                                    <BreadcrumbLink id="game-detail-breadcrumb-studio-link" className="game-detail-breadcrumb-link" href={`/studios/${game.studio_id}`}>
                                        {studio?.name || game.studio?.name || t('common.studio')}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator id="game-detail-breadcrumb-studio-separator" className="game-detail-breadcrumb-separator">/</BreadcrumbSeparator>
                            </>)}
                        <BreadcrumbItem id="game-detail-breadcrumb-current-item" className="game-detail-breadcrumb-item">
                            <span id="game-detail-breadcrumb-current-name" className="game-detail-breadcrumb-current-name">{game.name}</span>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div id="game-detail-header" className="game-detail-header flex flex-col gap-4 mb-6 md:flex-row md:justify-between md:items-center md:gap-0">
                <div id="game-detail-header-primary" className="game-detail-header-primary flex items-center gap-3 min-w-0">
                    <Button id="game-detail-back-button" variant="outline" size="icon" className="game-detail-back-button shrink-0" onClick={() => game.studio_id ? router.push(`/studios/${game.studio_id}`) : router.back()}>
                        <ArrowLeft className="h-4 w-4"/>
                    </Button>
                    <div id="game-detail-title-section" className="game-detail-title-section group min-w-0 flex-1">
                        <div id="game-detail-title-row" className="game-detail-title-row flex items-center gap-2 flex-wrap">
                            <GameNameEditable game={game} gameId={game.id} onNameUpdate={newName => setGame(prev => prev ? { ...prev, name: newName } : prev)}/>
                            <Badge id="game-detail-status-badge" variant={game.is_active ? "default" : "destructive"} className={`game-detail-status-badge ${game.is_active ? "bg-green-600 hover:bg-green-600" : ""}`}>
                                {game.is_active ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div id="game-detail-header-actions" className="game-detail-header-actions flex flex-col gap-2 items-start md:items-end">
                    <GameNavButtons gameId={game.id} active="detail"/>
                    <DeleteGameDialog game={game}/>
                </div>
            </div>

            <div id="game-detail-content" className="game-detail-content grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card id="game-detail-information-card" className="game-detail-information-card lg:col-span-2 group">
                    <CardHeader id="game-detail-information-header" className="game-detail-information-header">
                        <CardTitle id="game-detail-information-title" className="game-detail-information-title flex items-center">
                            <Gamepad2 className="mr-2 h-5 w-5"/>
                            {t('game.privateInfo')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent id="game-detail-information-content" className="game-detail-information-content">
                        <div id="game-detail-information-grid" className="game-detail-information-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div id="game-detail-information-primary" className="game-detail-information-column space-y-4">
                                <div id="game-detail-id-field" className="game-detail-field">
                                    <h3 id="game-detail-id-label" className="game-detail-field-label text-sm font-medium">{t('game.gameId')}</h3>
                                    <div id="game-detail-id-value-row" className="game-detail-id-value-row flex items-center gap-2">
                                        <code id="game-detail-id-value" className="game-detail-id-value relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm break-all">
                                            {game.id}
                                        </code>
                                        <Button id="game-detail-copy-id-button" variant="ghost" size="icon" className="game-detail-copy-id-button h-7 w-7 shrink-0" onClick={() => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(game.id);
            }
            else {
                const textarea = document.createElement('textarea');
                textarea.value = game.id;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }}>
                                            {copied ? <Check className="h-3.5 w-3.5 text-green-500"/> : <Copy className="h-3.5 w-3.5"/>}
                                        </Button>
                                    </div>
                                </div>
                                {game.studio_id && (<div id="game-detail-studio-field" className="game-detail-field">
                                        <h3 id="game-detail-studio-label" className="game-detail-field-label text-sm font-medium">{t('common.studio')}</h3>
                                        <Link id="game-detail-studio-link" href={`/studios/${game.studio_id}`} className="game-detail-studio-link inline-flex items-center gap-1 hover:text-primary transition-colors text-lg">
                                            {studio?.name || game.studio_id}
                                            <ExternalLink className="w-4 h-4"/>
                                        </Link>
                                    </div>)}
                                <div id="game-detail-lifecycle-status-field" className="game-detail-field">
                                    <h3 id="game-detail-lifecycle-status-label" className="game-detail-field-label text-sm font-medium">{t('game.status')}</h3>
                                    <GameStatusEditable game={game} gameId={game.id} onStatusUpdate={newStatus => setGame(prev => prev ? { ...prev, status: newStatus } : prev)}/>
                                </div>
                                {game.tier && (<div id="game-detail-tier-field" className="game-detail-field">
                                        <h3 id="game-detail-tier-label" className="game-detail-field-label text-sm font-medium">{t('game.tier')}</h3>
                                        <p id="game-detail-tier-value" className="game-detail-field-value text-lg">{game.tier}</p>
                                    </div>)}
                                {game.studio?.name && (<div id="game-detail-studio-name-field" className="game-detail-field">
                                        <h3 id="game-detail-studio-name-label" className="game-detail-field-label text-sm font-medium">{t('game.studioName')}</h3>
                                        <p id="game-detail-studio-name-value" className="game-detail-field-value text-lg">
                                            <Link id="game-detail-studio-name-link" href={`/studios/${game.studio.id}`} className="game-detail-studio-name-link inline-flex items-center gap-1 hover:text-primary">
                                                {game.studio.name}
                                                <ExternalLink className="w-4 h-4 "/>
                                            </Link>
                                        </p>
                                    </div>)}
                                <div id="game-detail-created-at-field" className="game-detail-field">
                                    <h3 id="game-detail-created-at-label" className="game-detail-field-label text-xs font-medium text-muted-foreground">{t('game.createdAt')}</h3>
                                    <p id="game-detail-created-at-value" className="game-detail-field-value text-sm">{formatTimestamp(game.created_at)}</p>
                                </div>
                                <div id="game-detail-updated-at-field" className="game-detail-field">
                                    <h3 id="game-detail-updated-at-label" className="game-detail-field-label text-xs font-medium text-muted-foreground">{t('game.updatedAt')}</h3>
                                    <p id="game-detail-updated-at-value" className="game-detail-field-value text-sm">{formatTimestamp(game.updated_at)}</p>
                                </div>
                            </div>
                            <div id="game-detail-information-secondary" className="game-detail-information-column space-y-4">
                                <GameDescriptionEditable game={game} gameId={game.id} onDescriptionUpdate={newDescription => setGame(prev => prev ? { ...prev, description: newDescription } : prev)}/>
                                <div id="game-detail-tags-field" className="game-detail-tags-field">
                                    <h3 id="game-detail-tags-label" className="game-detail-field-label text-sm font-medium flex items-center gap-1 mb-2">
                                        <Tag className="h-3.5 w-3.5"/>
                                        {t('game.tags')}
                                        <span id="game-detail-tags-count" className="game-detail-tags-count text-xs text-muted-foreground font-normal">
                                            {(game.tags ?? []).length}/10
                                        </span>
                                    </h3>
                                    <div id="game-detail-tags-list" className="game-detail-tags-list flex flex-wrap items-center gap-1.5">
                                        {(game.tags ?? []).map(tag => (<Badge id={`game-detail-tag-${tag}`} key={tag} variant="secondary" className="game-detail-tag gap-1 pr-1 text-xs">
                                                {tag}
                                                <button id={`game-detail-remove-tag-${tag}`} onClick={() => handleRemoveTag(tag)} disabled={tagsSaving} className="game-detail-remove-tag-button ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors disabled:opacity-50">
                                                    <X className="h-3 w-3"/>
                                                </button>
                                            </Badge>))}
                                        {(game.tags ?? []).length < 10 && (<Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                                                <PopoverTrigger id="game-detail-add-tag-trigger" className="game-detail-add-tag-trigger" asChild>
                                                    <Button id="game-detail-add-tag-button" variant="outline" size="sm" className="game-detail-add-tag-button h-6 gap-1 text-xs px-2" disabled={tagsSaving}>
                                                        {tagsSaving ? <Loader2 className="h-3 w-3 animate-spin"/> : <Plus className="h-3 w-3"/>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent id="game-detail-add-tag-popover" className="game-detail-add-tag-popover w-60 p-2" align="start">
                                                    <input id="game-detail-tag-search-input" type="text" placeholder={t('game.searchTags')} value={tagSearch} onChange={e => setTagSearch(e.target.value)} className="game-detail-tag-search-input w-full px-2 py-1.5 text-sm border rounded-md bg-transparent outline-none focus:ring-1 focus:ring-ring mb-2"/>
                                                    <div id="game-detail-tag-options" className="game-detail-tag-options max-h-48 overflow-y-auto space-y-0.5">
                                                        {allTags
                .filter(t => !(game.tags ?? []).includes(t))
                .filter(t => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase()))
                .map(tag => (<button id={`game-detail-add-tag-option-${tag}`} key={tag} onClick={() => handleAddTag(tag)} disabled={tagsSaving} className="game-detail-add-tag-option w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors disabled:opacity-50">
                                                                    {tag}
                                                                </button>))}
                                                        {allTags.filter(t => !(game.tags ?? []).includes(t)).filter(t => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (<p id="game-detail-no-tag-options" className="game-detail-no-tag-options text-xs text-muted-foreground px-2 py-1.5">{t('game.noTagsAvailable')}</p>)}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>)}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </CardContent>
                </Card>

                {/* Settings Card — right column */}
                <Card id="game-detail-settings-card" className="game-detail-settings-card lg:col-span-1">
                    <CardHeader id="game-detail-settings-header" className="game-detail-settings-header">
                        <CardTitle id="game-detail-settings-title" className="game-detail-settings-title flex items-center text-base">
                            {t('common.settings')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent id="game-detail-settings-content" className="game-detail-settings-content">
                        {/* Daily Quest Max Advance Days */}
                        <div id="game-detail-daily-quest-settings" className="game-detail-setting-row flex flex-col gap-2 py-2 border-b border-border">
                            <div id="game-detail-daily-quest-setting-control" className="game-detail-setting-control flex items-center justify-between gap-3 flex-wrap">
                                <Label id="game-detail-daily-quest-setting-label" htmlFor="daily-quest-days" className="game-detail-setting-label text-sm font-medium">
                                    {t('game.dailyQuestAdvanceDays')}
                                </Label>
                                <DailyQuestMaxAdvanceDays game={game} onUpdate={setGame}/>
                            </div>
                            <p id="game-detail-daily-quest-setting-description" className="game-detail-setting-description text-xs text-muted-foreground">
                                {t('game.dailyQuestAdvanceDaysDesc')}
                            </p>
                        </div>

                        {/* Toggle 1: Allow player trading and mailbox */}
                        <div id="game-detail-trading-settings" className="game-detail-setting-row flex flex-col gap-2 py-2 border-b border-border">
                            <div id="game-detail-trading-setting-control" className="game-detail-setting-control flex items-center justify-between gap-3 flex-wrap">
                                <Label id="game-detail-trading-setting-label" htmlFor="game-detail-allow-trading-switch" className="game-detail-setting-label text-sm font-medium cursor-pointer">
                                    {t('game.allowPlayerTrading')}
                                </Label>
                                <Switch id="game-detail-allow-trading-switch" className="game-detail-allow-trading-switch" checked={game.settings?.allow_player_trading ?? false} onCheckedChange={async (checked) => {
            try {
                const updated = await updateGame(game.id, {
                    settings: {
                        ...game.settings,
                        allow_player_trading: checked
                    }
                });
                setGame(updated);
                toast({
                    title: t('game.settingsUpdated'),
                    description: checked ? t('game.tradingEnabled') : t('game.tradingDisabled')
                });
            }
            catch (err) {
                toast({
                    title: t('common.error'),
                    description: t('game.failedUpdateSettings'),
                    variant: "destructive"
                });
            }
        }}/>
                            </div>
                            <p id="game-detail-trading-setting-description" className="game-detail-setting-description text-xs text-muted-foreground">
                                {t('game.allowPlayerTradingDesc')}
                            </p>
                        </div>

                        {/* Toggle 2 & 3: Allow tracing player event + Leaderboard tracing */}
                        <div id="game-detail-tracing-settings" className="game-detail-tracing-settings mt-5">
                            <TracingSettingsGroup gameId={game.id} game={game}/>
                        </div>
                    </CardContent>
                </Card>

                {/* Limits & Usage Section */}
                {(game.limits || game.usage) && (<Card id="game-detail-limits-card" className="game-detail-limits-card lg:col-span-3">
                        <CardHeader id="game-detail-limits-header" className="game-detail-limits-header">
                            <CardTitle id="game-detail-limits-title" className="game-detail-limits-title flex items-center">
                                <BarChart2 className="mr-2 h-5 w-5"/>
                                {t('game.limitsAndUsage')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent id="game-detail-limits-content" className="game-detail-limits-content">
                            <div id="game-detail-limits-grid" className="game-detail-limits-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Column 1: First set of limits */}
                                <div id="game-detail-limits-primary-column" className="game-detail-limits-column space-y-6">
                                    {/* Concurrent Users (CCU) */}
                                    <div id="game-detail-limit-ccu" className="game-detail-limit-item space-y-2">
                                        <div id="game-detail-limit-ccu-header" className="game-detail-limit-header flex justify-between text-sm">
                                            <span id="game-detail-limit-ccu-label" className="game-detail-limit-label font-medium inline-flex items-center gap-1">
                                                {t('game.onlineUsers')}
                                                <button id="game-detail-refresh-ccu-button" onClick={refreshCcu} disabled={ccuRefreshing} className="game-detail-refresh-ccu-button inline-flex items-center justify-center h-4 w-4 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" title={t('common.refresh')}>
                                                    <RefreshCw className={`h-3 w-3 ${ccuRefreshing ? 'animate-spin' : ''}`}/>
                                                </button>
                                            </span>
                                            <span id="game-detail-limit-ccu-value" className={`game-detail-limit-value text-muted-foreground ${ccu && ccu.ccu.current >= ccu.ccu.limit ? 'text-destructive font-semibold' : ''}`}>
                                                {fmt(ccu?.ccu.current ?? 0)} / {ccu ? fmt(ccu.ccu.limit) : (game.limits?.max_concurrent_users != null ? fmt(game.limits.max_concurrent_users) : '∞')}
                                                {ccu && ccu.ccu.current >= ccu.ccu.limit && ` (${t('game.limitReached')})`}
                                            </span>
                                        </div>
                                        <Progress id="game-detail-limit-ccu-progress" className={`game-detail-limit-progress h-2 ${ccu && ccu.ccu.current >= ccu.ccu.limit ? '[&>div]:bg-destructive' : ''}`} value={ccu ? Math.min(ccu.ccu.utilization_pct, 100) : 0}/>
                                    </div>
                                    {/* Player Profiles (Total Players) */}
                                    <div id="game-detail-limit-players" className="game-detail-limit-item space-y-2">
                                    <div id="game-detail-limit-players-header" className="game-detail-limit-header flex justify-between text-sm">
                                        <Link id="game-detail-limit-players-link" href={`/games/${game.id}/players`} className="game-detail-limit-link font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.totalPlayer')}
                                            <ExternalLink className="h-3 w-3"/>
                                        </Link>
                                        <span id="game-detail-limit-players-value" className={`game-detail-limit-value text-muted-foreground ${game.limits?.max_player_profiles != null && (game.usage?.player_profiles ?? 0) >= game.limits.max_player_profiles ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.player_profiles ?? 0)} / {game.limits?.max_player_profiles != null ? fmt(game.limits.max_player_profiles) : '∞'}
                                            {game.limits?.max_player_profiles != null && (game.usage?.player_profiles ?? 0) >= game.limits.max_player_profiles && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress value={game.limits?.max_player_profiles
                ? Math.min(((game.usage?.player_profiles ?? 0) / game.limits.max_player_profiles) * 100, 100)
                : 0} className={`h-2 ${game.limits?.max_player_profiles != null && (game.usage?.player_profiles ?? 0) >= game.limits.max_player_profiles ? '[&>div]:bg-destructive' : ''}`}/>
                                </div>
                                {/* Items */}
                                <div id="game-detail-limit-items" className="game-detail-limit-item space-y-2">
                                    <div id="game-detail-limit-items-header" className="game-detail-limit-header flex justify-between text-sm">
                                        <Link id="game-detail-limit-items-link" href={`/games/${game.id}/items`} className="game-detail-limit-link font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.items')}
                                            <ExternalLink className="h-3 w-3"/>
                                        </Link>
                                        <span id="game-detail-limit-items-value" className={`game-detail-limit-value text-muted-foreground ${game.limits?.max_items != null && (game.usage?.items ?? 0) >= game.limits.max_items ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.items ?? 0)} / {game.limits?.max_items != null ? fmt(game.limits.max_items) : '∞'}
                                            {game.limits?.max_items != null && (game.usage?.items ?? 0) >= game.limits.max_items && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress value={game.limits?.max_items
                ? Math.min(((game.usage?.items ?? 0) / game.limits.max_items) * 100, 100)
                : 0} className={`h-2 ${game.limits?.max_items != null && (game.usage?.items ?? 0) >= game.limits.max_items ? '[&>div]:bg-destructive' : ''}`}/>
                                </div>
                                {/* Shops */}
                                <div id="game-detail-limit-shops" className="game-detail-limit-item space-y-2">
                                    <div id="game-detail-limit-shops-header" className="game-detail-limit-header flex justify-between text-sm">
                                        <Link id="game-detail-limit-shops-link" href={`/games/${game.id}/shops`} className="game-detail-limit-link font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.shops')}
                                            <ExternalLink className="h-3 w-3"/>
                                        </Link>
                                        <span id="game-detail-limit-shops-value" className={`game-detail-limit-value text-muted-foreground ${game.limits?.max_shops != null && (game.usage?.shops ?? 0) >= game.limits.max_shops ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.shops ?? 0)} / {game.limits?.max_shops != null ? fmt(game.limits.max_shops) : '∞'}
                                            {game.limits?.max_shops != null && (game.usage?.shops ?? 0) >= game.limits.max_shops && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress value={game.limits?.max_shops
                ? Math.min(((game.usage?.shops ?? 0) / game.limits.max_shops) * 100, 100)
                : 0} className={`h-2 ${game.limits?.max_shops != null && (game.usage?.shops ?? 0) >= game.limits.max_shops ? '[&>div]:bg-destructive' : ''}`}/>
                                </div>
                                {/* Entity Defs */}
                                <div id="game-detail-limit-entities" className="game-detail-limit-item space-y-2">
                                    <div id="game-detail-limit-entities-header" className="game-detail-limit-header flex justify-between text-sm">
                                        <Link id="game-detail-limit-entities-link" href={`/games/${game.id}/entities`} className="game-detail-limit-link font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.entityDefs')}
                                            <ExternalLink className="h-3 w-3"/>
                                        </Link>
                                        <span id="game-detail-limit-entities-value" className={`game-detail-limit-value text-muted-foreground ${game.limits?.max_entity_defs != null && (game.usage?.entity_definitions ?? 0) >= game.limits.max_entity_defs ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.entity_definitions ?? 0)} / {game.limits?.max_entity_defs != null ? fmt(game.limits.max_entity_defs) : '∞'}
                                            {game.limits?.max_entity_defs != null && (game.usage?.entity_definitions ?? 0) >= game.limits.max_entity_defs && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress value={game.limits?.max_entity_defs
                ? Math.min(((game.usage?.entity_definitions ?? 0) / game.limits.max_entity_defs) * 100, 100)
                : 0} className={`h-2 ${game.limits?.max_entity_defs != null && (game.usage?.entity_definitions ?? 0) >= game.limits.max_entity_defs ? '[&>div]:bg-destructive' : ''}`}/>
                                </div>
                            </div>

                            {/* Column 2: Second set of limits */}
                            <div id="game-detail-limits-secondary-column" className="game-detail-limits-column space-y-6">
                                {/* Quests */}
                                <div id="game-detail-limit-quests" className="game-detail-limit-item space-y-2">
                                    <div id="game-detail-limit-quests-header" className="game-detail-limit-header flex justify-between text-sm">
                                        <Link id="game-detail-limit-quests-link" href={`/games/${game.id}/quests`} className="game-detail-limit-link font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.quests') ?? 'Quests'}
                                            <ExternalLink className="h-3 w-3"/>
                                        </Link>
                                        <span id="game-detail-limit-quests-value" className={`game-detail-limit-value text-muted-foreground ${game.limits?.max_quests != null && (game.usage?.quests ?? 0) >= game.limits.max_quests ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.quests ?? 0)} / {game.limits?.max_quests != null ? fmt(game.limits.max_quests) : '∞'}
                                            {game.limits?.max_quests != null && (game.usage?.quests ?? 0) >= game.limits.max_quests && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress value={game.limits?.max_quests
                ? Math.min(((game.usage?.quests ?? 0) / game.limits.max_quests) * 100, 100)
                : 0} className={`h-2 ${game.limits?.max_quests != null && (game.usage?.quests ?? 0) >= game.limits.max_quests ? '[&>div]:bg-destructive' : ''}`}/>
                                </div>
                                {/* Leaderboards */}
                                <div id="game-detail-limit-leaderboards" className="game-detail-limit-item space-y-2">
                                    <div id="game-detail-limit-leaderboards-header" className="game-detail-limit-header flex justify-between text-sm">
                                        <Link id="game-detail-limit-leaderboards-link" href={`/games/${game.id}/leaderboard`} className="game-detail-limit-link font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.leaderboards') ?? 'Leaderboards'}
                                            <ExternalLink className="h-3 w-3"/>
                                        </Link>
                                        <span id="game-detail-limit-leaderboards-value" className={`game-detail-limit-value text-muted-foreground ${game.limits?.max_leaderboards != null && (game.usage?.leaderboards ?? 0) >= game.limits.max_leaderboards ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.leaderboards ?? 0)} / {game.limits?.max_leaderboards != null ? fmt(game.limits.max_leaderboards) : '∞'}
                                            {game.limits?.max_leaderboards != null && (game.usage?.leaderboards ?? 0) >= game.limits.max_leaderboards && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress value={game.limits?.max_leaderboards
                ? Math.min(((game.usage?.leaderboards ?? 0) / game.limits.max_leaderboards) * 100, 100)
                : 0} className={`h-2 ${game.limits?.max_leaderboards != null && (game.usage?.leaderboards ?? 0) >= game.limits.max_leaderboards ? '[&>div]:bg-destructive' : ''}`}/>
                                </div>
                                {/* Journey Node */}
                                <div id="game-detail-limit-journey-nodes" className="game-detail-limit-item space-y-2">
                                    <div id="game-detail-limit-journey-nodes-header" className="game-detail-limit-header flex justify-between text-sm">
                                        <Link id="game-detail-limit-journey-nodes-link" href={`/games/${game.id}/analytic`} className="game-detail-limit-link font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.nodeDefinitions') ?? 'Journey Node'}
                                            <ExternalLink className="h-3 w-3"/>
                                        </Link>
                                        <span id="game-detail-limit-journey-nodes-value" className={`game-detail-limit-value text-muted-foreground ${game.limits?.max_node_definitions != null && (game.usage?.node_definitions ?? 0) >= game.limits.max_node_definitions ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.node_definitions ?? 0)} / {game.limits?.max_node_definitions != null ? fmt(game.limits.max_node_definitions) : '∞'}
                                            {game.limits?.max_node_definitions != null && (game.usage?.node_definitions ?? 0) >= game.limits.max_node_definitions && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress value={game.limits?.max_node_definitions
                ? Math.min(((game.usage?.node_definitions ?? 0) / game.limits.max_node_definitions) * 100, 100)
                : 0} className={`h-2 ${game.limits?.max_node_definitions != null && (game.usage?.node_definitions ?? 0) >= game.limits.max_node_definitions ? '[&>div]:bg-destructive' : ''}`}/>
                                </div>
                                {/* Event Types */}
                                <div id="game-detail-limit-event-types" className="game-detail-limit-item space-y-2">
                                    <div id="game-detail-limit-event-types-header" className="game-detail-limit-header flex justify-between text-sm">
                                        <Link id="game-detail-limit-event-types-link" href={`/games/${game.id}/analytic?tab=event-types`} className="game-detail-limit-link font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.eventTypes') ?? 'Event Types'}
                                            <ExternalLink className="h-3 w-3"/>
                                        </Link>
                                        <span id="game-detail-limit-event-types-value" className={`game-detail-limit-value text-muted-foreground ${game.limits?.max_event_types != null && (game.usage?.event_types ?? 0) >= game.limits.max_event_types ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.event_types ?? 0)} / {game.limits?.max_event_types != null ? fmt(game.limits.max_event_types) : '∞'}
                                            {game.limits?.max_event_types != null && (game.usage?.event_types ?? 0) >= game.limits.max_event_types && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress value={game.limits?.max_event_types
                ? Math.min(((game.usage?.event_types ?? 0) / game.limits.max_event_types) * 100, 100)
                : 0} className={`h-2 ${game.limits?.max_event_types != null && (game.usage?.event_types ?? 0) >= game.limits.max_event_types ? '[&>div]:bg-destructive' : ''}`}/>
                                </div>
                                {/* Scripts */}
                                <div id="game-detail-limit-scripts" className="game-detail-limit-item space-y-2">
                                    <div id="game-detail-limit-scripts-header" className="game-detail-limit-header flex justify-between text-sm">
                                        <Link id="game-detail-limit-scripts-link" href={`/games/${game.id}/scripts`} className="game-detail-limit-link font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.scripts') ?? 'Scripts'}
                                            <ExternalLink className="h-3 w-3"/>
                                        </Link>
                                        <span id="game-detail-limit-scripts-value" className={`game-detail-limit-value text-muted-foreground ${game.limits?.max_scripts != null && (game.usage?.scripts ?? 0) >= game.limits.max_scripts ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.scripts ?? 0)} / {game.limits?.max_scripts != null ? fmt(game.limits.max_scripts) : '∞'}
                                            {game.limits?.max_scripts != null && (game.usage?.scripts ?? 0) >= game.limits.max_scripts && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress value={game.limits?.max_scripts
                ? Math.min(((game.usage?.scripts ?? 0) / game.limits.max_scripts) * 100, 100)
                : 0} className={`h-2 ${game.limits?.max_scripts != null && (game.usage?.scripts ?? 0) >= game.limits.max_scripts ? '[&>div]:bg-destructive' : ''}`}/>
                                </div>
                            </div>

                            {/* Column 3: Equipment Panel */}
                            {catalog.length > 0 && (<EquipmentPanel gameId={game.id} catalog={catalog} gamePlugins={gamePlugins}/>)}
                        </div>
                        </CardContent>
                    </Card>)}

                {/* Teams Section */}
                <Card id="game-detail-teams-card" className="game-detail-teams-card lg:col-span-3 mt-6">
                    <CardHeader id="game-detail-teams-header" className="game-detail-teams-header flex flex-row items-start justify-between gap-3 space-y-0 pb-4">
                        <div id="game-detail-teams-heading" className="game-detail-teams-heading min-w-0">
                            <CardTitle id="game-detail-teams-title" className="game-detail-teams-title">{t('studio.teams')}</CardTitle>
                            <CardDescription id="game-detail-teams-description" className="game-detail-teams-description">{t('game.teamsDesc')}</CardDescription>
                        </div>
                        {game.studio_id && (<div id="game-detail-teams-actions" className="game-detail-teams-actions shrink-0">
                                <AddTeamToGameDialog gameId={game.id} studioId={game.studio_id} existingTeamIds={teams.map(t => t.id)} onTeamsAdded={handleTeamRemoved}/>
                            </div>)}
                    </CardHeader>
                    <CardContent id="game-detail-teams-content" className="game-detail-teams-content group">
                        {teamsLoading ? (<div id="game-detail-teams-loading" className="game-detail-teams-loading space-y-2">
                                <Skeleton id="game-detail-teams-loading-skeleton" className="game-detail-teams-loading-skeleton h-6 w-full"/>
                            </div>) : teams.length > 0 ? (<div id="game-detail-teams-list" className="game-detail-teams-list flex flex-wrap items-center gap-2">
                                {teams.map((team, index) => (<React.Fragment key={team.id}>
                                        <div id={`game-detail-team-${team.id}`} className="game-detail-team inline-flex items-center gap-1">
                                            <Link id={`game-detail-team-link-${team.id}`} href={`/teams/${team.id}`} className="game-detail-team-link inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                {team.name}
                                                <ExternalLink className="w-4 h-4"/>
                                            </Link>
                                            <RemoveTeamFromGameDialog gameId={game.id} team={team} onTeamRemoved={handleTeamRemoved}/>
                                        </div>
                                        {index < teams.length - 1 && (<span id={`game-detail-team-separator-${team.id}`} className="game-detail-team-separator text-muted-foreground">•</span>)}
                                    </React.Fragment>))}
                            </div>) : (<p id="game-detail-teams-empty-state" className="game-detail-teams-empty-state text-sm text-muted-foreground">{t('game.noTeamsAssigned')}</p>)}
                    </CardContent>
                </Card>
                <GamePublicInfoCard gameId={game.id} defaultGameName={game.name}/>
            </div>
        </div>);
}
