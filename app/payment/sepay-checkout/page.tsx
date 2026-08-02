"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Copy, Loader2, XCircle, AlertTriangle, } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TransactionIntent {
    provider_transaction_id: string;
    qr_code_data: string;
    bank_account: string;
    bank_name: string;
    transfer_amount: number;
    transfer_note: string;
    expires_at: string;
    pay_url?: string;
}
/** Normalize PascalCase intent from API to camelCase */
function normalizeIntent(raw: any): TransactionIntent | null {
    if (!raw)
        return null;
    return {
        provider_transaction_id: raw.provider_transaction_id ?? raw.ProviderTransactionID ?? "",
        qr_code_data: raw.qr_code_data ?? raw.QRCodeData ?? "",
        bank_account: raw.bank_account ?? raw.BankAccount ?? "",
        bank_name: raw.bank_name ?? raw.BankName ?? "",
        transfer_amount: raw.transfer_amount ?? raw.TransferAmount ?? 0,
        transfer_note: raw.transfer_note ?? raw.TransferNote ?? "",
        expires_at: raw.expires_at ?? raw.ExpiresAt ?? "",
        pay_url: raw.pay_url ?? raw.PayURL ?? raw.MoMoPayURL ?? raw.momo_pay_url ?? raw.CheckoutURL ?? raw.checkout_url ?? "",
    };
}
interface Transaction {
    id: string;
    user_id: string;
    provider_key: string;
    status: string;
    amount: number;
    currency: string;
    scoin_amount: number;
    created_at: string;
}
interface InitiateResponse {
    transaction: Transaction;
    intent: TransactionIntent;
}
type PaymentStatus = "pending" | "awaiting_payment" | "completed" | "failed" | "expired" | "credit_failed";
function isWaiting(s: PaymentStatus) {
    return s === "pending" || s === "awaiting_payment";
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPrice(amount: number | undefined | null, currency: string): string {
    if (amount == null || isNaN(amount))
        return "—";
    if (currency === "VND") {
        return amount.toLocaleString("vi-VN") + " ₫";
    }
    try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
    }
    catch {
        return `${amount.toLocaleString()} ${currency}`;
    }
}
function useCountdown(expiresAt: string | null) {
    // -1 = not yet initialized (don't treat as expired)
    const [remaining, setRemaining] = useState<number>(-1);
    useEffect(() => {
        if (!expiresAt)
            return;
        function tick() {
            const diff = Math.max(0, Math.floor((new Date(expiresAt!).getTime() - Date.now()) / 1000));
            setRemaining(diff);
        }
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);
    const safe = Math.max(0, remaining);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return { remaining, display: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` };
}
// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------
function CopyBtn({ text }: {
    text: string;
}) {
    const { toast } = useToast();
    const { t } = useTranslation();
    return (<Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
            navigator.clipboard.writeText(text);
            toast({ title: t("sepayCheckout.copied") });
        }}>
      <Copy className="h-3.5 w-3.5"/>
    </Button>);
}
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CheckoutPage() {
    return (<Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>}>
      <CheckoutPageContent />
    </Suspense>);
}
function CheckoutPageContent() {
    const searchParams = useSearchParams();
    const txId = searchParams.get("tx_id");
    const { t } = useTranslation();
    const { toast } = useToast();
    // State from initiate response (passed via sessionStorage)
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [intent, setIntent] = useState<TransactionIntent | null>(null);
    const [status, setStatus] = useState<PaymentStatus>("pending");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdown = useCountdown(intent?.expires_at ?? null);
    const countdownStartedRef = useRef(false);
    // Track if countdown was ever positive (i.e. not already expired on load)
    useEffect(() => {
        if (countdown.remaining > 0)
            countdownStartedRef.current = true;
    }, [countdown.remaining]);
    // Load transaction data from sessionStorage or fetch
    useEffect(() => {
        if (!txId) {
            setError("No transaction ID");
            setLoading(false);
            return;
        }
        const stored = sessionStorage.getItem(`sepay:${txId}`);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                const root = data?.data ?? data;
                const tx = root?.transaction;
                const it = normalizeIntent(root?.intent);
                if (tx) {
                    setTransaction(tx);
                    setStatus((tx.status ?? "awaiting_payment") as PaymentStatus);
                }
                if (it)
                    setIntent(it);
                setLoading(false);
                return;
            }
            catch { /* fall through to fetch */ }
        }
        // Fallback: fetch transaction status
        async function fetchTx() {
            try {
                const data = await api.get(`/api/v1/payments/transactions/${txId}`);
                console.log("[SePay Checkout] fetched tx:", data);
                const tx = data?.transaction ?? data;
                setTransaction(tx);
                setStatus((tx.status ?? "pending") as PaymentStatus);
            }
            catch (err: any) {
                setError(err?.data?.error ?? err?.message ?? "Failed to load transaction");
            }
            finally {
                setLoading(false);
            }
        }
        fetchTx();
    }, [txId]);
    // Polling
    const pollTransaction = useCallback(async () => {
        if (!txId)
            return;
        try {
            const data = await api.get(`/api/v1/payments/transactions/${txId}`);
            const newStatus = data.status as PaymentStatus;
            setStatus(newStatus);
            if (newStatus === "completed") {
                window.dispatchEvent(new CustomEvent("wallet:refresh"));
            }
            if (!isWaiting(newStatus)) {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            }
        }
        catch { /* ignore poll errors */ }
    }, [txId]);
    useEffect(() => {
        if (!txId || !isWaiting(status))
            return;
        pollingRef.current = setInterval(pollTransaction, 5000);
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [txId, status, pollTransaction]);
    // Stop polling when countdown expires
    useEffect(() => {
        if (countdown.remaining === 0 && countdownStartedRef.current && isWaiting(status)) {
            setStatus("expired");
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        }
    }, [countdown.remaining, status, intent?.expires_at]);
    // Auto-redirect if pay_url is present
    useEffect(() => {
        if (intent?.pay_url && isWaiting(status)) {
            const timer = setTimeout(() => {
                window.location.href = intent.pay_url!;
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [intent?.pay_url, status]);
    // ---------------------------------------------------------------------------
    // Render: Loading
    // ---------------------------------------------------------------------------
    if (loading) {
        return (<div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          <Skeleton className="h-8 w-48"/>
          <Skeleton className="h-64 w-full"/>
          <Skeleton className="h-32 w-full"/>
        </div>
      </div>);
    }
    // ---------------------------------------------------------------------------
    // Render: Error
    // ---------------------------------------------------------------------------
    if (error) {
        return (<div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="mx-auto h-14 w-14 text-destructive"/>
          <h1 className="text-xl font-semibold">{t("sepayCheckout.errorTitle")}</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link href="/payment">{t("sepayCheckout.backToPayment")}</Link>
          </Button>
        </div>
      </div>);
    }
    // ---------------------------------------------------------------------------
    // Render: Completed
    // ---------------------------------------------------------------------------
    if (status === "completed") {
        return (<div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-500"/>
          <h1 className="text-xl font-semibold">{t("sepayCheckout.successTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("sepayCheckout.successDesc", { amount: transaction?.scoin_amount?.toLocaleString() ?? "" })}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/payment">{t("sepayCheckout.backToPayment")}</Link>
            </Button>
            {txId && (<Button asChild>
                <Link href={`/payment?tab=transactions&subtab=buy&txid=${txId}`}>
                  {t("sepayCheckout.viewTransaction")}
                </Link>
              </Button>)}
          </div>
        </div>
      </div>);
    }
    // ---------------------------------------------------------------------------
    // Render: Failed / Expired
    // ---------------------------------------------------------------------------
    if (status === "failed" || status === "expired") {
        return (<div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="mx-auto h-14 w-14 text-destructive"/>
          <h1 className="text-xl font-semibold">
            {status === "expired" ? t("sepayCheckout.expiredTitle") : t("sepayCheckout.failedTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {status === "expired" ? t("sepayCheckout.expiredDesc") : t("sepayCheckout.failedDesc")}
          </p>
          <Button asChild variant="outline">
            <Link href="/payment">{t("sepayCheckout.backToPayment")}</Link>
          </Button>
        </div>
      </div>);
    }
    // ---------------------------------------------------------------------------
    // Render: Credit Failed
    // ---------------------------------------------------------------------------
    if (status === "credit_failed") {
        return (<div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="mx-auto h-14 w-14 text-yellow-500"/>
          <h1 className="text-xl font-semibold">{t("sepayCheckout.creditFailedTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("sepayCheckout.creditFailedDesc")}</p>
          <Button asChild variant="outline">
            <Link href="/payment">{t("sepayCheckout.backToPayment")}</Link>
          </Button>
        </div>
      </div>);
    }
    // ---------------------------------------------------------------------------
    // Render: Pending (QR + bank details)
    // ---------------------------------------------------------------------------
    return (<div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/payment">
              <ArrowLeft className="h-4 w-4"/>
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{t("sepayCheckout.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("sepayCheckout.subtitle")}</p>
          </div>
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground"/>
          <span className="text-muted-foreground">{t("sepayCheckout.expiresIn")}</span>
          <Badge variant={countdown.remaining < 300 ? "destructive" : "secondary"} className="font-mono text-sm px-3">
            {countdown.display}
          </Badge>
        </div>

        {/* Redirect for Payment Gateway (9Pay / MoMo / Paddle) */}
        {intent?.pay_url ? (
          <Card id="redirect-gateway-card">
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-base">{t("sepayCheckout.redirectToGateway")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pb-6 space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t("sepayCheckout.redirectDesc")}
              </p>
              <Button asChild className="w-full sm:w-auto" id="ninepay-redirect-btn">
                <a href={intent.pay_url} target="_self" className="flex items-center justify-center gap-1">
                  {t("sepayCheckout.payNow")}
                  <ArrowLeft className="h-4 w-4 rotate-180"/>
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* QR Code */}
            {intent?.qr_code_data && (<Card id="qr-code-card">
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-base">{t("sepayCheckout.scanQr")}</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center pb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={intent.qr_code_data} alt="VietQR" className="w-64 h-64 rounded-lg border"/>
                </CardContent>
              </Card>)}

            {/* Transfer note */}
            {intent && (<Card id="transfer-note-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("sepayCheckout.transferNote")}</p>
                      <p className="font-semibold font-mono text-primary">{intent.transfer_note}</p>
                    </div>
                    <CopyBtn text={intent.transfer_note}/>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("sepayCheckout.amount")}</p>
                      <p className="font-semibold text-primary text-lg">
                        {formatPrice(intent.transfer_amount, transaction?.currency ?? "VND")}
                      </p>
                    </div>
                    <CopyBtn text={String(intent.transfer_amount)}/>
                  </div>
                </CardContent>
              </Card>)}

            {/* Warning */}
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3" id="warning-box">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5"/>
              <p className="text-xs text-muted-foreground">{t("sepayCheckout.warning")}</p>
            </div>
          </>
        )}

        {/* Polling indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin"/>
          {t("sepayCheckout.waitingForPayment")}
        </div>

        {/* sCoin info */}
        {transaction && (<div className="text-center text-sm text-muted-foreground">
            {t("sepayCheckout.youWillReceive")}{" "}
            <span className="font-semibold text-primary">{transaction.scoin_amount.toLocaleString()} sCoin</span>
          </div>)}
      </div>
    </div>);
}
