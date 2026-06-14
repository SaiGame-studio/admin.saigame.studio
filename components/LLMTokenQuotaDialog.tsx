"use client";
import { useEffect, useState } from "react";
import { BotMessageSquare, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { CopyButton } from "@/components/CopyButton";
import { getLLMTokenBalance, topUpLLMTokens, type LLMTokenBalance, type AdminGame, } from "@/lib/admin-api";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getBarColor(pct: number): string {
    if (pct >= 50)
        return "#22c55e";
    if (pct >= 20)
        return "#f59e0b";
    return "#ef4444";
}
function formatTokens(n: number): string {
    return n.toLocaleString("en-US");
}
// ---------------------------------------------------------------------------
// Token Pool Row
// ---------------------------------------------------------------------------
interface PoolRowProps {
    id: string;
    label: string;
    remaining: number;
    used: number;
    onTopUp: (amount: number) => Promise<void>;
}
function TokenPoolRow({ id, label, remaining, used, onTopUp }: PoolRowProps) {
    const [topUpOpen, setTopUpOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [topping, setTopping] = useState(false);
    const total = remaining + used;
    const pct = total > 0 ? Math.min(100, (remaining / total) * 100) : 0;
    const barColor = getBarColor(pct);
    const preview = remaining + (parseInt(amount, 10) || 0);
    async function handleConfirm() {
        const n = parseInt(amount, 10);
        if (!n || n <= 0) {
            toast({ title: "Invalid amount", description: "Enter a positive integer.", variant: "destructive" });
            return;
        }
        setTopping(true);
        try {
            await onTopUp(n);
            setTopUpOpen(false);
            setAmount("");
        }
        finally {
            setTopping(false);
        }
    }
    return (<div id={`llm-token-pool-${id}`} className="rounded-lg border px-4 py-3 space-y-2">
      {/* Header */}
      <div id={`llm-token-pool-header-${id}`} className="flex items-center justify-between gap-2">
        <span id={`llm-token-pool-label-${id}`} className="text-sm font-medium">{label}</span>
        <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
          <DialogTrigger asChild>
            <Button id={`llm-token-topup-trigger-${id}`} variant="outline" size="sm" className="h-7 text-xs px-2.5">
              Top-up ↑
            </Button>
          </DialogTrigger>
          <DialogContent id={`llm-token-topup-dialog-${id}`} className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle id={`llm-token-topup-title-${id}`}>Top-up {label}</DialogTitle>
              <DialogDescription id={`llm-token-topup-desc-${id}`}>
                Enter the number of tokens to add. This is additive — not a replacement.
              </DialogDescription>
            </DialogHeader>
            <div id={`llm-token-topup-form-${id}`} className="space-y-4 py-2">
              <div id={`llm-token-topup-amount-field-${id}`} className="space-y-1.5">
                <Label htmlFor={`llm-token-amount-${id}`}>Amount to add</Label>
                <div id={`llm-token-amount-wrap-${id}`} className="flex items-center gap-2">
                  <Input id={`llm-token-amount-${id}`} type="number" min={1} step={1} placeholder="500000" value={amount} onChange={(e) => setAmount(e.target.value)}/>
                  <span id={`llm-token-amount-unit-${id}`} className="text-sm text-muted-foreground shrink-0">tokens</span>
                </div>
              </div>
              <div id={`llm-token-topup-preview-${id}`} className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-1">
                <div id={`llm-token-preview-current-${id}`} className="flex justify-between">
                  <span className="text-muted-foreground">Current remaining</span>
                  <span className="font-mono">{formatTokens(remaining)}</span>
                </div>
                <div id={`llm-token-preview-after-${id}`} className="flex justify-between font-medium">
                  <span>After top-up</span>
                  <span className="font-mono text-green-600">{formatTokens(preview)}</span>
                </div>
              </div>
            </div>
            <DialogFooter id={`llm-token-topup-footer-${id}`}>
              <Button id={`llm-token-topup-cancel-${id}`} variant="outline" onClick={() => setTopUpOpen(false)} disabled={topping}>Cancel</Button>
              <Button id={`llm-token-topup-confirm-${id}`} onClick={handleConfirm} disabled={topping || !amount}>
                {topping && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                Confirm ✓
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress bar */}
      <div id={`llm-token-bar-wrap-${id}`} className="space-y-1">
        <div id={`llm-token-bar-track-${id}`} className="h-2 rounded-full bg-muted overflow-hidden">
          <div id={`llm-token-bar-fill-${id}`} className="h-full rounded-full transition-all" style={{ width: `${pct.toFixed(1)}%`, backgroundColor: barColor }}/>
        </div>
        <div id={`llm-token-bar-stats-${id}`} className="flex items-center justify-between text-xs text-muted-foreground">
          <span id={`llm-token-remaining-${id}`}>
            <span className="font-semibold text-foreground">{formatTokens(remaining)}</span> remaining
          </span>
        </div>
      </div>

      {/* Secondary stats */}
      <div id={`llm-token-secondary-${id}`} className="flex gap-4 text-xs text-muted-foreground">
        <span id={`llm-token-used-${id}`}>Used: <span className="text-foreground">{formatTokens(used)}</span></span>
      </div>
    </div>);
}
// ---------------------------------------------------------------------------
// Main Dialog
// ---------------------------------------------------------------------------
interface Props {
    game: AdminGame;
}
export function LLMTokenQuotaDialog({ game }: Props) {
    const [open, setOpen] = useState(false);
    const [balance, setBalance] = useState<LLMTokenBalance | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getLLMTokenBalance(game.id);
            setBalance(data);
        }
        catch (err: unknown) {
            const msg = (err as {
                detail?: string;
            })?.detail ?? String(err);
            setError(msg);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (open)
            load();
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
    async function handleFreeTopUp(amount: number) {
        try {
            await topUpLLMTokens(game.id, { free_tokens: amount });
            toast({ title: "Top-up successful", description: `Added ${formatTokens(amount)} free tokens to ${game.name}.` });
            await load();
        }
        catch (err: unknown) {
            const msg = (err as {
                detail?: string;
            })?.detail ?? String(err);
            toast({ title: "Top-up failed", description: msg, variant: "destructive" });
            throw err;
        }
    }
    async function handlePremiumTopUp(amount: number) {
        try {
            await topUpLLMTokens(game.id, { premium_tokens: amount });
            toast({ title: "Top-up successful", description: `Added ${formatTokens(amount)} premium tokens to ${game.name}.` });
            await load();
        }
        catch (err: unknown) {
            const msg = (err as {
                detail?: string;
            })?.detail ?? String(err);
            toast({ title: "Top-up failed", description: msg, variant: "destructive" });
            throw err;
        }
    }
    return (<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id={`llm-quota-trigger-${game.id}`} variant="outline" size="sm" className="flex items-center gap-1.5">
          <BotMessageSquare className="h-3.5 w-3.5"/>
          LLM Tokens
        </Button>
      </DialogTrigger>
      <DialogContent id={`llm-quota-dialog-${game.id}`} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle id={`llm-quota-title-${game.id}`} className="flex flex-col gap-0.5">
            <span id={`llm-quota-title-label-${game.id}`} className="flex items-center gap-2 text-base">
              <BotMessageSquare className="h-4 w-4"/>
              LLM Token Quota
            </span>
            <span id={`llm-quota-title-game-${game.id}`} className="text-sm font-semibold text-foreground">{game.name}</span>
          </DialogTitle>
          <DialogDescription id={`llm-quota-desc-${game.id}`} className="flex items-center gap-1.5 text-xs font-mono break-all">
            <span id={`llm-quota-game-id-text-${game.id}`}>{game.id}</span>
            <CopyButton id={`llm-quota-copy-id-${game.id}`} text={game.id}/>
          </DialogDescription>
        </DialogHeader>

        <div id={`llm-quota-body-${game.id}`} className="py-1 space-y-3">
          {loading && !balance && (<div id={`llm-quota-skeleton-${game.id}`} className="space-y-3">
              <Skeleton className="h-24 w-full"/>
              <Skeleton className="h-24 w-full"/>
            </div>)}

          {error && !loading && (<div id={`llm-quota-error-${game.id}`} className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {error}
            </div>)}

          {balance && !error && (<>
              <p id={`llm-quota-priority-note-${game.id}`} className="text-xs text-muted-foreground">
                Premium tokens are used first.<br />Free tokens are used when premium is exhausted.
              </p>
              <TokenPoolRow id={`premium-${game.id}`} label="💎 Premium Tokens (priority)" remaining={balance.premium_tokens_remaining} used={balance.premium_tokens_used} onTopUp={handlePremiumTopUp}/>
              <TokenPoolRow id={`free-${game.id}`} label="🆓 Free Tokens" remaining={balance.free_tokens_remaining} used={balance.free_tokens_used} onTopUp={handleFreeTopUp}/>
            </>)}
        </div>

        <DialogFooter id={`llm-quota-footer-${game.id}`}>
          <Button id={`llm-quota-refresh-${game.id}`} variant="ghost" size="sm" onClick={load} disabled={loading} className="flex items-center gap-1.5 mr-auto">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>
            Refresh
          </Button>
          <Button id={`llm-quota-close-${game.id}`} variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
