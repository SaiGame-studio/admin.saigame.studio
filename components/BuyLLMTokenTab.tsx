"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Loader2, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LLMTokenPurchaseDialog } from "@/components/LLMTokenPurchaseDialog";
import { getAllGames } from "@/lib/game-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";

const STORAGE_KEY = "payment:lastLlmTokenGameId";

export function BuyLLMTokenTab() {
    const { t } = useTranslation();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGameId, setSelectedGameId] = useState("");
    const [open, setOpen] = useState(false);

    async function reloadGames() {
        setLoading(true);
        try {
            const data = await getAllGames();
            setGames(data);
        }
        catch {
            setGames([]);
        }
        finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let active = true;

        async function loadGames() {
            setLoading(true);
            try {
                const data = await getAllGames();
                if (!active)
                    return;

                setGames(data);

                const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
                const nextSelected = saved && data.some((game) => game.id === saved) ? saved : "";
                setSelectedGameId(nextSelected);
            }
            catch {
                if (!active)
                    return;
                setGames([]);
                setSelectedGameId("");
            }
            finally {
                if (active)
                    setLoading(false);
            }
        }

        loadGames();

        return () => {
            active = false;
        };
    }, []);

    function handleOpenGame(gameId: string) {
        setSelectedGameId(gameId);
        setOpen(true);
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, gameId);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (games.length === 0) {
        return (
            <Card className="mt-6">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    {t("payment.noGamesAvailable")}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="mt-6 space-y-6">
            <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary"/>
                        <h2 className="text-lg font-semibold">{t("llmTokenPurchase.title")}</h2>
                    </div>
                    <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={reloadGames}
                        aria-label={t("payment.refreshBalance")}
                    >
                        <RefreshCw className="h-4 w-4"/>
                    </button>
                </div>
                <p className="text-sm text-muted-foreground">
                    {t("payment.selectGameDescription")}
                </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {games.map((game) => {
                    const isSelected = selectedGameId === game.id;
                    return (
                        <Card
                            key={game.id}
                            role="button"
                            tabIndex={0}
                            className={`cursor-pointer transition-all hover:border-primary/60 hover:shadow-sm ${isSelected ? "border-primary ring-2 ring-primary/30" : ""}`}
                            onClick={() => handleOpenGame(game.id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleOpenGame(game.id);
                                }
                            }}
                        >
                            <CardHeader className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-primary">
                                            <Gamepad2 className="h-5 w-5"/>
                                        </div>
                                        <div className="min-w-0">
                                            <CardTitle className="truncate text-base">{game.name}</CardTitle>
                                            <CardDescription className="truncate">{game.slug}</CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant={game.is_active ? "default" : "secondary"} className="shrink-0">
                                        {game.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                    {game.description || t("payment.buyTokenForThisGame")}
                                </p>
                                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{t("payment.selectGameTitle")}</span>
                                    <span>{t("llmTokenPurchase.triggerLabel")}</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </section>

            <LLMTokenPurchaseDialog gameId={selectedGameId || games[0].id} open={open} onOpenChange={setOpen}/>
        </div>
    );
}
