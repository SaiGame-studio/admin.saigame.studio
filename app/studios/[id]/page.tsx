"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchStudio, fetchStudioGames, fetchStudioTeams, fetchStudioMembers, removeStudioMember, type StudioMember } from "@/lib/studio-api";
import { formatTimestamp, formatISODate } from "@/lib/utils/date-utils";
import type { Studio } from "@/types/studio";
import type { Game } from "@/types/game";
import type { Team } from "@/types/team";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, Plus, ExternalLink, BarChart2, Trash2, Users, Gamepad2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import StudioNameEditable, { StudioDescriptionEditable } from "@/components/StudioNameEditable";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { useTranslation } from '@/lib/i18n/use-translation';
import CreateTeamDialog from "@/components/CreateTeamDialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/CopyButton";
export default function StudioDetailsPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = React.use(params);
    const [studio, setStudio] = useState<Studio | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [members, setMembers] = useState<StudioMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [gamesLoading, setGamesLoading] = useState(false);
    const [teamsLoading, setTeamsLoading] = useState(true);
    const [membersLoading, setMembersLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gamesError, setGamesError] = useState<string | null>(null);
    const [teamsError, setTeamsError] = useState<string | null>(null);
    const [membersError, setMembersError] = useState<string | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('games');
    const hasFetched = useRef(false);
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    // ── Load studio info + teams once on mount ───────────────────────────
    useEffect(() => {
        if (hasFetched.current)
            return;
        hasFetched.current = true;
        async function loadStudio() {
            try {
                setLoading(true);
                const data = await fetchStudio(id);
                setStudio(data);
                setError(null);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load studio details");
            }
            finally {
                setLoading(false);
            }
        }
        async function loadTeams() {
            try {
                setTeamsLoading(true);
                const data = await fetchStudioTeams(id);
                setTeams(data);
                setTeamsError(null);
            }
            catch (err) {
                setTeamsError(err instanceof Error ? err.message : "Failed to load studio teams");
            }
            finally {
                setTeamsLoading(false);
            }
        }
        loadStudio();
        loadTeams();
    }, [id]);
    // ── Per-tab loaders ──────────────────────────────────────────────────
    const loadGames = useCallback(async () => {
        try {
            setGamesLoading(true);
            setGamesError(null);
            const data = await fetchStudioGames(id);
            setGames(data);
        }
        catch (err) {
            setGamesError(err instanceof Error ? err.message : "Failed to load studio games");
        }
        finally {
            setGamesLoading(false);
        }
    }, [id]);
    const loadMembers = useCallback(async () => {
        try {
            setMembersLoading(true);
            setMembersError(null);
            const data = await fetchStudioMembers(id);
            setMembers(data);
        }
        catch (err) {
            setMembersError(err instanceof Error ? err.message : "Failed to load studio members");
        }
        finally {
            setMembersLoading(false);
        }
    }, [id]);
    // ── Reload content whenever active tab changes (lazy on first visit) ─
    useEffect(() => {
        if (activeTab === 'games')
            loadGames();
        else if (activeTab === 'members')
            loadMembers();
    }, [activeTab, loadGames, loadMembers]);
    async function handleRemoveMember(userId: string) {
        if (!studio)
            return;
        setRemovingMemberId(userId);
        try {
            await removeStudioMember(studio.id, userId);
            setMembers(prev => {
                const updated = prev.filter(m => m.user_id !== userId);
                setStudio(s => s ? {
                    ...s,
                    usage: s.usage ? { ...s.usage, total_members: updated.length } : s.usage
                } : s);
                return updated;
            });
            toast({ title: t('studio.removeMemberSuccess') });
        }
        catch (err) {
            toast({ title: t('studio.removeMemberError'), variant: "destructive" });
        }
        finally {
            setRemovingMemberId(null);
        }
    }
    return (<div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/studios">{t('common.studios')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="">{studio?.name || t('studio.details')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {error && (<Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>)}

      {teamsError && (<Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>{teamsError}</AlertDescription>
        </Alert>)}

      {loading ? (<Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mb-2"/>
            <Skeleton className="h-4 w-1/4"/>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full"/>
            <Skeleton className="h-4 w-full"/>
            <Skeleton className="h-4 w-3/4"/>
          </CardContent>
        </Card>) : studio ? (<>
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => router.push("/studios")}>
                <ArrowLeft className="h-4 w-4"/>
              </Button>
              <div className="group">
              <StudioNameEditable studio={studio} studioId={studio.id} onNameUpdate={newName => setStudio(prev => prev ? { ...prev, name: newName } : prev)}/>
              <StudioDescriptionEditable studio={studio} studioId={studio.id} onDescriptionUpdate={newDescription => setStudio(prev => prev ? { ...prev, description: newDescription } : prev)}/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('studio.details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">ID</p>
                  <p className="text-sm flex items-center">{studio.id}<CopyButton text={studio.id}/></p>
                </div>
                {studio.slug && (<div>
                    <p className="text-sm font-medium">Slug</p>
                    <Badge variant="outline" className="font-mono">{studio.slug}</Badge>
                  </div>)}
                <div>
                  <p className="text-sm font-medium">{t('studio.gamesCount')}</p>
                  <p className="text-sm">{studio.usage?.games ?? studio.game_count}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t('studio.ownerUserId')}</p>
                  <p className="text-sm flex items-center">{studio.owner_user_id}<CopyButton text={studio.owner_user_id}/></p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('studio.timestamps')}</CardTitle>
                <CardDescription>{t('studio.timestampsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">{t('studio.createdAt')}</p>
                  <p className="text-sm ">{formatTimestamp(studio.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t('studio.updatedAt')}</p>
                  <p className="text-sm ">{formatTimestamp(studio.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Limits & Usage Section */}
          {(studio.limits || studio.usage) && (<Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart2 className="mr-2 h-5 w-5"/>
                  {t('studio.limitsAndUsage')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Games */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{t('common.games')}</span>
                      <span className={`text-muted-foreground ${studio.limits?.max_games != null && (studio.usage?.games ?? 0) >= studio.limits.max_games
                    ? 'text-destructive font-semibold'
                    : ''}`}>
                        {studio.usage?.games ?? 0} / {studio.limits?.max_games ?? '∞'}
                        {studio.limits?.max_games != null && (studio.usage?.games ?? 0) >= studio.limits.max_games && ` (${t('studio.limitReached')})`}
                      </span>
                    </div>
                    <Progress value={studio.limits?.max_games
                    ? Math.min(((studio.usage?.games ?? 0) / studio.limits.max_games) * 100, 100)
                    : 0} className={`h-2 ${studio.limits?.max_games != null && (studio.usage?.games ?? 0) >= studio.limits.max_games
                    ? '[&>div]:bg-destructive'
                    : ''}`}/>
                  </div>
                  {/* Teams */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{t('studio.teams')}</span>
                      <span className={`text-muted-foreground ${studio.limits?.max_teams != null && (studio.usage?.teams ?? 0) >= studio.limits.max_teams
                    ? 'text-destructive font-semibold'
                    : ''}`}>
                        {studio.usage?.teams ?? 0} / {studio.limits?.max_teams ?? '∞'}
                        {studio.limits?.max_teams != null && (studio.usage?.teams ?? 0) >= studio.limits.max_teams && ` (${t('studio.limitReached')})`}
                      </span>
                    </div>
                    <Progress value={studio.limits?.max_teams
                    ? Math.min(((studio.usage?.teams ?? 0) / studio.limits.max_teams) * 100, 100)
                    : 0} className={`h-2 ${studio.limits?.max_teams != null && (studio.usage?.teams ?? 0) >= studio.limits.max_teams
                    ? '[&>div]:bg-destructive'
                    : ''}`}/>
                  </div>
                  {/* Total Members */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{t('studio.totalMembers')}</span>
                      <span className={`text-muted-foreground ${studio.limits?.max_total_members != null && (studio.usage?.total_members ?? 0) >= studio.limits.max_total_members
                    ? 'text-destructive font-semibold'
                    : ''}`}>
                        {studio.usage?.total_members ?? 0} / {studio.limits?.max_total_members ?? '∞'}
                        {studio.limits?.max_total_members != null && (studio.usage?.total_members ?? 0) >= studio.limits.max_total_members && ` (${t('studio.limitReached')})`}
                      </span>
                    </div>
                    <Progress value={studio.limits?.max_total_members
                    ? Math.min(((studio.usage?.total_members ?? 0) / studio.limits.max_total_members) * 100, 100)
                    : 0} className={`h-2 ${studio.limits?.max_total_members != null && (studio.usage?.total_members ?? 0) >= studio.limits.max_total_members
                    ? '[&>div]:bg-destructive'
                    : ''}`}/>
                  </div>
                </div>
              </CardContent>
            </Card>)}

          {/* Teams Section */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('studio.teams')}</CardTitle>
                <CardDescription>{t('studio.teamsInStudio')}</CardDescription>
              </div>
              <CreateTeamDialog studioId={studio.id} existingTeamCount={studio.usage?.teams ?? teams.length} onTeamCreated={(newTeam) => {
                setTeams(prev => [...prev, newTeam]);
                // Re-fetch studio to get accurate usage/limits from API
                fetchStudio(id)
                    .then(updated => setStudio(updated))
                    .catch(() => {
                    // Fallback: update locally if fetch fails
                    setStudio(prev => prev ? {
                        ...prev,
                        usage: prev.usage ? { ...prev.usage, teams: (prev.usage.teams ?? 0) + 1 } : prev.usage
                    } : prev);
                });
            }}/>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (<div className="flex gap-2">
                  <Skeleton className="h-8 w-24"/>
                  <Skeleton className="h-8 w-24"/>
                  <Skeleton className="h-8 w-24"/>
                </div>) : teams.length > 0 ? (<div className="flex flex-wrap gap-2">
                  {teams.map((team) => (<Link key={team.id} href={`/teams/${team.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 max-w-[180px]">
                        <span className="truncate">{team.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0"/>
                      </Button>
                    </Link>))}
                </div>) : (<p className="text-sm text-muted-foreground">{t('studio.noTeams')}</p>)}
            </CardContent>
          </Card>

          {/* Games + Members Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList>
              <TabsTrigger value="games" className="flex items-center gap-1.5">
                <Gamepad2 className="h-4 w-4"/>
                {t('common.games')}
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-1.5">
                <Users className="h-4 w-4"/>
                {t('studio.members')}
              </TabsTrigger>
            </TabsList>

            {/* ── Games Tab ──────────────────────────────────────── */}
            <TabsContent value="games">
              <Card className="border-t-0 rounded-tl-none">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t('common.games')}</CardTitle>
                    <CardDescription>{t('studio.gamesBelonging')}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={loadGames} disabled={gamesLoading}>
                      <RefreshCw className={`h-4 w-4 ${gamesLoading ? 'animate-spin' : ''}`}/>
                    </Button>
                    <Button asChild size="sm">
                      <a href={`/games/new?studio=${studio.id}`}>
                        <Plus className="mr-1.5 h-4 w-4"/> {t('studio.createGame')}
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {gamesError && (<Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4"/>
                      <AlertDescription>{gamesError}</AlertDescription>
                    </Alert>)}
                  {gamesLoading ? (<div className="space-y-4">
                      <Skeleton className="h-12 w-full"/>
                      <Skeleton className="h-12 w-full"/>
                      <Skeleton className="h-12 w-full"/>
                    </div>) : games.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {games.map((game) => (<div key={game.id} className="p-4 border rounded-md">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-lg">
                                <Link href={`/games/${game.id}`} className="inline-flex items-center gap-1 hover:text-primary">
                                  {game.name}
                                  <ExternalLink className="w-4 h-4"/>
                                </Link>
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => router.push(`/games/${game.id}`)}>
                              {t('studio.viewDetails')}
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-sm font-medium">ID</p>
                              <p className="text-sm">{game.id}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{t('studio.status')}</p>
                              <p className="text-sm">{game.status}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{t('studio.shopCount')}</p>
                              <p className="text-sm">{game.usage?.shops ?? 0}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{t('studio.totalPlayer')}</p>
                              <p className="text-sm">{game.usage?.player_profiles ?? 0}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{t('studio.itemProfileCount')}</p>
                              <p className="text-sm">{game.usage?.items ?? 0}</p>
                            </div>
                          </div>
                        </div>))}
                    </div>) : (<div className="text-center py-6">
                      <p>{t('studio.noGamesInStudio')}</p>
                      <Button asChild className="mt-4">
                        <a href={`/games/new?studio=${studio.id}`}>
                          <Plus className="mr-2 h-4 w-4"/> {t('studio.createFirstGame')}
                        </a>
                      </Button>
                    </div>)}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Members Tab ────────────────────────────────────── */}
            <TabsContent value="members">
              <Card className="border-t-0 rounded-tl-none">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5"/>
                      {t('studio.members')}
                    </CardTitle>
                    <CardDescription>{t('studio.membersInStudio')}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadMembers} disabled={membersLoading}>
                    <RefreshCw className={`h-4 w-4 mr-1.5 ${membersLoading ? 'animate-spin' : ''}`}/>
                    {t('common.refresh')}
                  </Button>
                </CardHeader>
                <CardContent>
                  {membersError && (<Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4"/>
                      <AlertDescription>{membersError}</AlertDescription>
                    </Alert>)}
                  {membersLoading ? (<div className="space-y-2">
                      <Skeleton className="h-10 w-full"/>
                      <Skeleton className="h-10 w-full"/>
                      <Skeleton className="h-10 w-full"/>
                    </div>) : members.length > 0 ? (<Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>{t('studio.memberEmail')}</TableHead>
                          <TableHead>Teams</TableHead>
                          <TableHead>{t('studio.memberJoinedAt')}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (<TableRow key={member.id}>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 font-medium text-sm">
                                  {member.display_name ?? '-'}
                                  {member.is_owner && <Badge variant="secondary" className="ml-1">Owner</Badge>}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs text-muted-foreground">{member.user_id}</span>
                                  <CopyButton text={member.user_id}/>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{member.email ?? '-'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {member.teams && member.teams.length > 0 ? member.teams.map(team => (<Link key={team.id} href={`/teams/${team.id}`}>
                                    <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1">
                                      <span className="truncate max-w-[120px]">{team.name}</span>
                                      <ExternalLink className="h-3 w-3 shrink-0"/>
                                    </Button>
                                  </Link>)) : <span className="text-xs text-muted-foreground">-</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatISODate(member.joined_at)}
                            </TableCell>
                            <TableCell>
                              {!member.is_owner && (<AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={removingMemberId === member.user_id}>
                                      <Trash2 className="h-4 w-4"/>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('studio.removeMember')}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('studio.removeMemberConfirm')}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleRemoveMember(member.user_id)}>
                                        {t('studio.removeMember')}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>)}
                            </TableCell>
                          </TableRow>))}
                      </TableBody>
                    </Table>) : (<p className="text-sm text-muted-foreground">{t('studio.noMembers')}</p>)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>) : (<Alert>
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>{t('studio.notFound')}</AlertTitle>
          <AlertDescription>{t('studio.notFoundDesc')}</AlertDescription>
        </Alert>)}
    </div>);
}
