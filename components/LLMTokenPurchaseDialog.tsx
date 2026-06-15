"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useEscapeLayer } from "@/hooks/use-escape-manager";
import { api } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";

interface TokenPackage {
    id: string;
    package_key: string;
    tokens: number;
    sgem_cost: number;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface PackageCardProps {
    pkg: TokenPackage;
    sgemBalance: number | null;
    selected: boolean;
    onSelect: () => void;
}

interface DialogProps {
    gameId: string;
    compact?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

interface ContentProps {
    gameId: string;
    embedded?: boolean;
}

function fmt(n: number): string {
    if (n >= 1000000)
        return `${(n / 1000000).toLocaleString("en-US")}M`;
    if (n >= 1000)
        return `${(n / 1000).toLocaleString("en-US")}K`;
    return n.toLocaleString("en-US");
}

function PackageCard({ pkg, sgemBalance, selected, onSelect }: PackageCardProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const canAfford = sgemBalance === null || sgemBalance >= pkg.sgem_cost;
    const disabled = !pkg.is_active;

    return (
        <div
            id={`llm-purchase-card-${pkg.package_key}`}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (disabled)
                    return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect();
                }
            }}
            className={`relative flex flex-col gap-2 rounded-lg border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : disabled
                    ? "cursor-not-allowed border-border opacity-40"
                    : canAfford
                        ? "border-border hover:border-primary/50 hover:bg-muted/40"
                        : "border-amber-500/30 bg-amber-500/5 hover:border-amber-400/60 hover:bg-amber-500/10"}`}
        >
            {selected && (
                <span id={`llm-purchase-card-check-${pkg.package_key}`} className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5"/>
                </span>
            )}

            <div id={`llm-purchase-card-header-${pkg.package_key}`} className="flex items-center">
                <span id={`llm-purchase-card-name-${pkg.package_key}`} className="text-sm font-semibold capitalize">
                    {pkg.package_key}
                </span>
            </div>

            <div id={`llm-purchase-card-tokens-${pkg.package_key}`} className="flex items-baseline gap-1">
                <span id={`llm-purchase-card-tokens-val-${pkg.package_key}`} className="text-2xl font-bold tabular-nums">
                    {fmt(pkg.tokens)}
                </span>
                <span id={`llm-purchase-card-tokens-unit-${pkg.package_key}`} className="text-xs text-muted-foreground">
                    {t("llmTokenPurchase.tokensUnit")}
                </span>
            </div>

            <div id={`llm-purchase-card-cost-${pkg.package_key}`} className="flex items-center gap-1 text-sm text-muted-foreground">
                <span id={`llm-purchase-card-cost-icon-${pkg.package_key}`} className="text-blue-400" aria-hidden="true">💎</span>
                <span id={`llm-purchase-card-cost-val-${pkg.package_key}`} className="font-medium text-foreground">
                    {pkg.sgem_cost.toLocaleString("en-US")}
                </span>
                {!canAfford && (
                    <Button
                        id={`llm-purchase-card-buy-more-btn-${pkg.package_key}`}
                        type="button"
                        variant="outline"
                        size="icon"
                        className="ml-1 h-6 w-6 shrink-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-sm hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:text-emerald-300"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push("/payment?tab=buy-sgem");
                        }}
                        aria-label={t("llmTokenPurchase.buyMoreSGem")}
                    >
                        <Plus id={`llm-purchase-card-buy-more-icon-${pkg.package_key}`} className="h-3.5 w-3.5"/>
                    </Button>
                )}
            </div>
        </div>
    );
}

let premiumFloatId = 0;

export function LLMTokenPurchaseContent({ gameId, embedded = false }: ContentProps) {
    const { t } = useTranslation();
    const [sgemBalance, setSgemBalance] = useState<number | null>(null);
    const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
    const [premiumRemaining, setPremiumRemaining] = useState<number | null>(null);
    const [loadingTokens, setLoadingTokens] = useState(false);
    const [packages, setPackages] = useState<TokenPackage[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [purchasing, setPurchasing] = useState(false);
    const premiumAnchorRef = useRef<HTMLDivElement | null>(null);
    const prevPremiumRef = useRef<number | null>(null);
    const [premiumFloats, setPremiumFloats] = useState<Array<{
        id: number;
        delta: number;
        x: number;
        y: number;
    }>>([]);

    const loadWallet = async () => {
        try {
            const data = await api.get("/api/v1/me/sgem-wallet");
            setSgemBalance(data.balance ?? null);
        }
        catch {
            // silent
        }
    };

    const loadTokenBalance = async () => {
        setLoadingTokens(true);
        try {
            const data = await api.get(`/api/v1/games/${gameId}/llm-tokens/balance`);
            const newPremium: number = data.premium_tokens_remaining ?? null;

            if (prevPremiumRef.current !== null && newPremium !== null && newPremium !== prevPremiumRef.current) {
                const delta = newPremium - prevPremiumRef.current;
                const rect = premiumAnchorRef.current?.getBoundingClientRect();
                const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
                const y = rect ? rect.top - 4 : 100;
                const floatId = ++premiumFloatId;

                setPremiumFloats((current) => [...current, { id: floatId, delta, x, y }]);
                setTimeout(() => setPremiumFloats((current) => current.filter((item) => item.id !== floatId)), 3000);
            }

            prevPremiumRef.current = newPremium;
            setFreeRemaining(data.free_tokens_remaining ?? null);
            setPremiumRemaining(newPremium);
        }
        catch {
            // silent
        }
        finally {
            setLoadingTokens(false);
        }
    };

    const loadPackages = async () => {
        setLoadingPackages(true);
        try {
            const data = await api.get(`/api/v1/games/${gameId}/llm-token-packages`);
            setPackages((data.packages ?? []).sort((a: TokenPackage, b: TokenPackage) => a.sort_order - b.sort_order));
        }
        catch {
            toast({
                title: t("llmTokenPurchase.toastFailedTitle"),
                description: t("llmTokenPurchase.toastFailedDesc"),
                variant: "destructive",
            });
        }
        finally {
            setLoadingPackages(false);
        }
    };

    useEffect(() => {
        loadWallet();
        loadTokenBalance();
        loadPackages();
        setSelectedKey(null);
    }, [gameId]);

    async function handleConfirmPurchase() {
        if (!selectedKey)
            return;

        const pkg = packages.find((item) => item.package_key === selectedKey);
        if (!pkg)
            return;

        const canAfford = sgemBalance === null || sgemBalance >= pkg.sgem_cost;
        if (!pkg.is_active || !canAfford) {
            toast({
                title: t("llmTokenPurchase.toastInsufficientTitle"),
                description: t("llmTokenPurchase.toastInsufficientDesc"),
                variant: "destructive",
            });
            return;
        }

        setPurchasing(true);
        try {
            const data = await api.post(`/api/v1/games/${gameId}/llm-tokens/purchase`, { package: pkg.package_key });
            const tokensAdded: number = data.tokens_purchased ?? pkg.tokens;

            toast({
                title: t("llmTokenPurchase.toastSuccessTitle"),
                description: `+${tokensAdded.toLocaleString("en-US")} ${t("llmTokenPurchase.toastSuccessDesc")}`,
            });

            await Promise.all([loadWallet(), loadTokenBalance()]);
            window.dispatchEvent(new CustomEvent("sgem-wallet:refresh"));
            window.dispatchEvent(new CustomEvent("llm-tokens:refresh", { detail: { gameId } }));
            setSelectedKey(null);
        }
        catch (err: unknown) {
            const e = err as {
                status?: number;
                data?: { detail?: string };
            };

            if (e?.status === 402) {
                toast({
                    title: t("llmTokenPurchase.toastInsufficientTitle"),
                    description: t("llmTokenPurchase.toastInsufficientDesc"),
                    variant: "destructive",
                });
            }
            else {
                const msg = e?.data?.detail ?? t("llmTokenPurchase.toastFailedDesc");
                toast({
                    title: t("llmTokenPurchase.toastFailedTitle"),
                    description: msg,
                    variant: "destructive",
                });
            }
        }
        finally {
            setPurchasing(false);
        }
    }

    return (
        <div id={`llm-purchase-content-${gameId}`} className={embedded ? "rounded-2xl border bg-background" : ""}>
            <style>{`
                @keyframes prem-float-up {
                  0%   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                  15%  { opacity: 1; transform: translateX(-50%) translateY(-10px) scale(1.1); }
                  75%  { opacity: 1; transform: translateX(-50%) translateY(-32px) scale(1.05); }
                  100% { opacity: 0; transform: translateX(-50%) translateY(-48px) scale(0.9); }
                }
                .prem-float { animation: prem-float-up 3s ease-out forwards; pointer-events: none; }
            `}</style>

            {typeof window !== "undefined" && premiumFloats.map(({ id, delta, x, y }) =>
                createPortal(
                    <span
                        key={id}
                        id={`llm-prem-float-${id}`}
                        className="prem-float fixed select-none whitespace-nowrap text-sm font-bold tabular-nums"
                        style={{
                            top: y,
                            left: x,
                            zIndex: 9999,
                            color: delta > 0 ? "#22c55e" : "#ef4444",
                            textShadow: "0 0 3px #000, 0 0 3px #000, 0 0 6px #000",
                        }}
                    >
                        {delta > 0 ? `+${fmt(delta)}` : fmt(delta)}
                    </span>,
                    document.body,
                )
            )}

            <div id={`llm-purchase-scroll-${gameId}`} className="flex flex-col gap-3 overflow-y-auto px-6 pt-6 pb-4">
                {embedded ? (
                    <div className="space-y-1">
                        <div id={`llm-purchase-title-${gameId}`} className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            <Zap className="h-4 w-4"/>
                            {t("llmTokenPurchase.title")}
                        </div>
                        <p id={`llm-purchase-desc-${gameId}`} className="text-sm text-muted-foreground">
                            {t("llmTokenPurchase.description")}
                        </p>
                    </div>
                ) : (
                    <SheetHeader>
                        <SheetTitle id={`llm-purchase-title-${gameId}`} className="flex items-center gap-2">
                            <Zap className="h-4 w-4"/>
                            {t("llmTokenPurchase.title")}
                        </SheetTitle>
                        <SheetDescription id={`llm-purchase-desc-${gameId}`}>
                            {t("llmTokenPurchase.description")}
                        </SheetDescription>
                    </SheetHeader>
                )}

                <div id={`llm-purchase-body-${gameId}`} className="mt-2 flex flex-col gap-3">
                    <div id={`llm-purchase-token-balances-${gameId}`} className="grid grid-cols-2 gap-2">
                        <div id={`llm-purchase-premium-bal-${gameId}`} ref={premiumAnchorRef} className="flex flex-col gap-0.5 rounded-md border px-3 py-2">
                            <span id={`llm-purchase-premium-bal-label-${gameId}`} className="text-xs text-muted-foreground">{t("llmTokenPurchase.premiumTokensRemaining")}</span>
                            {loadingTokens ? (
                                <Skeleton id={`llm-purchase-premium-bal-skel-${gameId}`} className="h-5 w-20"/>
                            ) : (
                                <span id={`llm-purchase-premium-bal-val-${gameId}`} className="text-sm font-semibold tabular-nums">
                                    {premiumRemaining !== null ? premiumRemaining.toLocaleString("en-US") : "—"}
                                </span>
                            )}
                        </div>

                        <div id={`llm-purchase-free-bal-${gameId}`} className="flex flex-col gap-0.5 rounded-md border px-3 py-2">
                            <span id={`llm-purchase-free-bal-label-${gameId}`} className="text-xs text-muted-foreground">{t("llmTokenPurchase.freeTokensRemaining")}</span>
                            {loadingTokens ? (
                                <Skeleton id={`llm-purchase-free-bal-skel-${gameId}`} className="h-5 w-20"/>
                            ) : (
                                <span id={`llm-purchase-free-bal-val-${gameId}`} className="text-sm font-semibold tabular-nums">
                                    {freeRemaining !== null ? freeRemaining.toLocaleString("en-US") : "—"}
                                </span>
                            )}
                        </div>
                    </div>

                    <p id={`llm-purchase-notice-${gameId}`} className="text-xs text-muted-foreground">
                        {t("llmTokenPurchase.nonRefundable")}
                    </p>

                    <div id={`llm-purchase-grid-${gameId}`} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {loadingPackages
                            ? Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="space-y-2 rounded-lg border px-4 py-3">
                                    <Skeleton className="h-4 w-20"/>
                                    <Skeleton className="h-8 w-24"/>
                                    <Skeleton className="h-4 w-16"/>
                                </div>
                            ))
                            : packages.map((pkg) => (
                                <PackageCard
                                    key={pkg.id}
                                    pkg={pkg}
                                    sgemBalance={sgemBalance}
                                    selected={selectedKey === pkg.package_key}
                                    onSelect={() => setSelectedKey(selectedKey === pkg.package_key ? null : pkg.package_key)}
                                />
                            ))}
                    </div>

                    <p id={`llm-purchase-select-hint-${gameId}`} className="text-center text-xs text-muted-foreground">
                        {t("llmTokenPurchase.selectHint")}
                    </p>
                </div>
            </div>

            <div id={`llm-purchase-footer-${gameId}`} className={`flex flex-col gap-3 border-t bg-background px-6 py-4 transition-all duration-200 ${selectedKey ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}>
                {(() => {
                    const selectedPackage = packages.find((item) => item.package_key === selectedKey);
                    if (!selectedPackage)
                        return null;
                    const canAfford = sgemBalance === null || sgemBalance >= selectedPackage.sgem_cost;
                    const canBuyNow = selectedPackage.is_active && canAfford;

                    return (
                        <>
                            <div id={`llm-purchase-footer-summary-${gameId}`} className="flex items-center justify-between text-sm">
                                <div id={`llm-purchase-footer-pkg-${gameId}`} className="flex flex-col gap-0.5">
                                    <span id={`llm-purchase-footer-pkg-name-${gameId}`} className="font-semibold capitalize">
                                        {selectedPackage.package_key}
                                    </span>
                                    <span id={`llm-purchase-footer-pkg-tokens-${gameId}`} className="text-muted-foreground">
                                        +{fmt(selectedPackage.tokens)} {t("llmTokenPurchase.tokensUnit")}
                                    </span>
                                </div>
                                <div id={`llm-purchase-footer-pkg-cost-${gameId}`} className="flex items-center gap-1 text-base font-bold">
                                    <span id={`llm-purchase-footer-pkg-cost-icon-${gameId}`} className="text-blue-400" aria-hidden="true">💎</span>
                                    <span id={`llm-purchase-footer-pkg-cost-val-${gameId}`}>{selectedPackage.sgem_cost.toLocaleString("en-US")}</span>
                                    <span id={`llm-purchase-footer-pkg-cost-unit-${gameId}`} className="text-xs font-normal text-muted-foreground">
                                        sGem
                                    </span>
                                </div>
                            </div>
                            <p id={`llm-purchase-footer-warning-${gameId}`} className="text-xs text-muted-foreground">
                                {t("llmTokenPurchase.nonRefundable")}
                            </p>
                            <div id={`llm-purchase-footer-actions-${gameId}`} className="flex gap-2">
                                <Button id={`llm-purchase-footer-cancel-${gameId}`} variant="outline" className="flex-1" disabled={purchasing} onClick={() => setSelectedKey(null)}>
                                    {t("common.cancel")}
                                </Button>
                                {canBuyNow ? (
                                    <Button id={`llm-purchase-footer-confirm-${gameId}`} className="flex-1" disabled={purchasing} onClick={handleConfirmPurchase}>
                                        {purchasing ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                {t("llmTokenPurchase.processing")}
                                            </>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5">
                                                <span>{t("llmTokenPurchase.confirmPay")}</span>
                                                <span id={`llm-purchase-footer-confirm-icon-${gameId}`} className="text-blue-400" aria-hidden="true">💎</span>
                                                <span>{selectedPackage.sgem_cost.toLocaleString("en-US")}</span>
                                            </span>
                                        )}
                                    </Button>
                                ) : (
                                    purchasing ? (
                                        <Button
                                            id={`llm-purchase-footer-buy-more-${gameId}`}
                                            className="flex-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:text-emerald-200"
                                            variant="outline"
                                            disabled
                                        >
                                            {t("llmTokenPurchase.buyMoreSGem")}
                                        </Button>
                                    ) : (
                                        <Button
                                            id={`llm-purchase-footer-buy-more-${gameId}`}
                                            className="flex-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:text-emerald-200"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link id={`llm-purchase-footer-buy-more-link-${gameId}`} href="/payment?tab=buy-sgem">
                                                {t("llmTokenPurchase.buyMoreSGem")}
                                            </Link>
                                        </Button>
                                    )
                                )}
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
}

export function LLMTokenPurchaseDialog({ gameId, compact = false, open: controlledOpen, onOpenChange: onControlledOpenChange }: DialogProps) {
    const { t } = useTranslation();
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    const setOpen = (value: boolean) => {
        if (isControlled)
            onControlledOpenChange?.(value);
        else
            setInternalOpen(value);
    };

    useEscapeLayer(open, () => setOpen(false), 1);

    const triggerButton = (
        <Button id={`llm-purchase-trigger-${gameId}`} variant="outline" size={compact ? "icon" : "sm"} className={compact ? "h-8 w-8" : "flex items-center gap-1.5"} onClick={() => setOpen(true)}>
            <Zap className="h-4 w-4"/>
            {!compact && t("llmTokenPurchase.triggerLabel")}
        </Button>
    );

    return (
        <>
            {!isControlled && (compact ? (
                <Tooltip>
                    <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
                    <TooltipContent side="top">{t("llmTokenPurchase.triggerLabel")}</TooltipContent>
                </Tooltip>
            ) : triggerButton)}

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent id={`llm-purchase-sheet-${gameId}`} side="right" className="top-14 flex h-[calc(100%-3.5rem)] w-full flex-col overflow-y-auto p-0 sm:max-w-[672px] lg:top-[60px] lg:h-[calc(100%-60px)]" overlayClassName="top-14 lg:top-[60px]">
                    {open ? <LLMTokenPurchaseContent gameId={gameId}/> : null}
                </SheetContent>
            </Sheet>
        </>
    );
}




