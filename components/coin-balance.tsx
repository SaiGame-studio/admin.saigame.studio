"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n/use-translation";
const STORAGE_KEY = "coin-balance-visible";
interface WalletData {
    id: string;
    user_id: string;
    balance: number;
    total_earned: number;
    total_spent: number;
    created_at: string;
    updated_at: string;
}
interface FloatItem {
    id: number;
    delta: number;
}
let floatIdCounter = 0;
export function CoinBalance() {
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [visible, setVisible] = useState<boolean | null>(null);
    const [floats, setFloats] = useState<FloatItem[]>([]);
    const prevBalanceRef = useRef<number | null>(null);
    const isFirstLoad = useRef(true);
    const { t } = useTranslation();
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        setVisible(stored !== "false");
    }, []);
    function toggleVisible() {
        setVisible(prev => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEY, String(next));
            return next;
        });
    }
    const fetchWallet = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const data = await api.get("/api/v1/coins/wallet");
            setWallet(prev => {
                const prevBal = prevBalanceRef.current;
                const newBal: number = data?.balance ?? 0;
                if (!isFirstLoad.current && prevBal !== null && newBal !== prevBal) {
                    const delta = newBal - prevBal;
                    const id = ++floatIdCounter;
                    setFloats(f => [...f, { id, delta }]);
                    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 5000);
                }
                isFirstLoad.current = false;
                prevBalanceRef.current = newBal;
                return data;
            });
        }
        catch {
            setError(true);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchWallet();
    }, [fetchWallet]);
    useEffect(() => {
        const handler = () => fetchWallet();
        window.addEventListener("wallet:refresh", handler);
        return () => window.removeEventListener("wallet:refresh", handler);
    }, [fetchWallet]);
    return (<TooltipProvider delayDuration={300}>
      <style>{`
        @keyframes coin-float-down {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          15%  { opacity: 1; transform: translateY(10px) scale(1.1); }
          75%  { opacity: 1; transform: translateY(36px) scale(1.05); }
          100% { opacity: 0; transform: translateY(52px) scale(0.9); }
        }
        .coin-float { animation: coin-float-down 5s ease-out forwards; pointer-events: none; }
      `}</style>
      <div className="relative flex items-center gap-1 rounded-md border bg-background px-2 h-10 text-sm">
        {/* Float texts */}
        {floats.map(({ id, delta }) => (<span key={id} className="coin-float absolute top-full mt-1 left-1/2 -translate-x-1/2 text-sm font-bold tabular-nums whitespace-nowrap select-none z-50" style={{ color: delta > 0 ? "#22c55e" : "#ef4444", textShadow: "0 0 3px #000, 0 0 3px #000, 0 0 3px #000, 0 0 6px #000" }}>
            {delta > 0 ? `🪙 +${delta.toLocaleString()}` : `🪙 ${delta.toLocaleString()}`}
          </span>))}

        {/* Coin icon + balance — click to toggle */}
        <button onClick={toggleVisible} className="flex items-center gap-1 cursor-pointer select-none focus-visible:outline-none rounded px-1.5 py-0.5 transition-colors hover:bg-muted active:bg-muted/80" aria-label={visible ? "Hide balance" : "Show balance"}>
          <span className="text-yellow-500" aria-hidden="true">🪙</span>
          <span className="min-w-[2rem] text-center font-medium tabular-nums">
            {loading ? (<span className="inline-block h-3 w-8 animate-pulse rounded bg-muted"/>) : error ? (<span className="text-destructive">—</span>) : visible ? ((wallet?.balance ?? 0).toLocaleString()) : (<span className="tracking-widest text-muted-foreground">••••</span>)}
          </span>
        </button>

        {/* Add coins button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-yellow-500 hover:text-yellow-400" asChild aria-label="Add coins">
              <Link href="/payment?tab=buy-scoin">
                <Plus className="h-3 w-3"/>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t('payment.addCoins')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Refresh button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={fetchWallet} disabled={loading} aria-label={t('payment.refreshBalance')}>
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}/>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t('payment.refreshBalance')}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>);
}
