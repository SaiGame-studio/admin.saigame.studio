"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Loader2, } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getUserTimezone } from "@/lib/utils/date-utils";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CoinPackage {
    id: string;
    key: string;
    name: string;
    description: string;
    price_amount: number;
    price_currency: string;
    bonus_scoin: number;
    total_scoin: number;
    base_scoin: number;
}
interface SgemPackage {
    id: string;
    package_key: string;
    name: string;
    description: string;
    sgem_amount: number;
    price_amount: number;
    price_currency: string;
}
interface DirectTransferTransaction {
    id: string;
    status: string;
    amount: number;
    currency: string;
    scoin_amount: number;
    provider_key: string;
    expires_at: string;
    created_at: string;
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPrice(amount: number, currency: string): string {
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
function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
        timeZone: getUserTimezone(),
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DirectTransferPage() {
    return (<Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>}>
      <DirectTransferPageContent />
    </Suspense>);
}
function DirectTransferPageContent() {
    const searchParams = useSearchParams();
    const packageId = searchParams.get("package_id");
    const isSgem = searchParams.get("type") === "sgem";
    const { t } = useTranslation();
    const { toast } = useToast();
    const [submitted, setSubmitted] = useState(false);
    const [submittedTxId, setSubmittedTxId] = useState<string | null>(null);
    const [pkg, setPkg] = useState<CoinPackage | null>(null);
    const [sgemPkg, setSgemPkg] = useState<SgemPackage | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [note, setNote] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [transferred, setTransferred] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // ---------------------------------------------------------------------------
    // Load package
    // ---------------------------------------------------------------------------
    const fetchPackage = useCallback(async () => {
        if (!packageId) {
            setLoading(false);
            setLoadError(true);
            return;
        }
        setLoading(true);
        setLoadError(false);
        try {
            if (isSgem) {
                const data = await api.get(`/api/v1/payments/sgem-packages/${packageId}`);
                setSgemPkg(data.package ?? data);
            }
            else {
                const data = await api.get(`/api/v1/payments/packages/${packageId}`);
                setPkg(data);
            }
        }
        catch {
            try {
                if (isSgem) {
                    const list = await api.get("/api/v1/payments/sgem-packages");
                    const found = (list.packages ?? []).find((p: SgemPackage) => p.id === packageId);
                    if (found)
                        setSgemPkg(found);
                    else
                        setLoadError(true);
                }
                else {
                    const list = await api.get("/api/v1/payments/packages");
                    const found = (list.packages ?? []).find((p: CoinPackage) => p.id === packageId);
                    if (found)
                        setPkg(found);
                    else
                        setLoadError(true);
                }
            }
            catch {
                setLoadError(true);
            }
        }
        finally {
            setLoading(false);
        }
    }, [packageId, isSgem]);
    useEffect(() => { fetchPackage(); }, [fetchPackage]);
    // ---------------------------------------------------------------------------
    // Submit: initiate then confirm in one go
    // ---------------------------------------------------------------------------
    async function handleSubmit() {
        if (isSgem ? !sgemPkg : !pkg)
            return;
        if (!confirmed)
            return;
        if (!note.trim()) {
            toast({
                variant: "destructive",
                title: "Note to Admin is required",
                description: "Please include your transfer reference number or bank name to help us verify faster.",
            });
            return;
        }
        setSubmitting(true);
        try {
            const uuid = typeof crypto?.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
            const packageKey = isSgem ? sgemPkg!.package_key : pkg!.key;
            const res = await api.post("/api/v1/payments/direct-transfer/initiate", {
                package_key: packageKey,
                idempotency_key: uuid,
            });
            const tx: DirectTransferTransaction = res?.transaction;
            if (!tx?.id)
                throw new Error("No transaction returned");
            await api.post(`/api/v1/payments/direct-transfer/${tx.id}/confirm`, {
                transfer_info: note.trim(),
            });
            setSubmitted(true);
            setSubmittedTxId(tx.id);
        }
        catch (err: any) {
            toast({
                variant: "destructive",
                title: t("directTransfer.submitFailed"),
                description: err?.data?.error ?? err?.message,
            });
        }
        finally {
            setSubmitting(false);
        }
    }
    // ---------------------------------------------------------------------------
    // Render: success
    // ---------------------------------------------------------------------------
    if (submitted) {
        return (<div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary"/>
          <h1 className="text-xl font-semibold">{t("directTransfer.submitSuccess")}</h1>
          <div className="flex items-center justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/payment">{t("directTransfer.backToPayment")}</Link>
            </Button>
            {submittedTxId && (<Button asChild>
                <Link href={`/payment?tab=transactions&subtab=buy&txid=${submittedTxId}`}>View Transaction</Link>
              </Button>)}
          </div>
        </div>
      </div>);
    }
    // ---------------------------------------------------------------------------
    // Render: form
    // ---------------------------------------------------------------------------
    return (<div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl items-start">
      <div className="w-full lg:flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/payment">
            <ArrowLeft className="h-4 w-4"/>
            <span className="sr-only">{t("directTransfer.backToPayment")}</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{t("directTransfer.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("directTransfer.subtitle")}</p>
        </div>
      </div>

      {/* Package info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary"/>
            {t("directTransfer.packageInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (<div className="space-y-3">
              <Skeleton className="h-5 w-48"/>
              <Skeleton className="h-4 w-72"/>
              <Skeleton className="h-8 w-32"/>
            </div>) : loadError || (isSgem ? !sgemPkg : !pkg) ? (<p className="text-sm text-destructive">{t("directTransfer.packageNotFound")}</p>) : isSgem && sgemPkg ? (<div className="space-y-4">
              <div className="space-y-0.5">
                <p className="font-semibold">{sgemPkg.name}</p>
                <p className="text-sm text-muted-foreground">{sgemPkg.description}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("directTransfer.totalAmount")}</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(sgemPkg.price_amount / 100, sgemPkg.price_currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("directTransfer.totalScoin")}</p>
                  <p className="text-2xl font-bold">
                    {sgemPkg.sgem_amount.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">💎</span>
                  </p>
                </div>
              </div>
            </div>) : pkg ? (<div className="space-y-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{pkg.name}</p>
                  {pkg.bonus_scoin > 0 && (<Badge className="text-xs">+{pkg.bonus_scoin.toLocaleString()} bonus</Badge>)}
                </div>
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("directTransfer.totalAmount")}</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(pkg.price_amount / 100, pkg.price_currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("directTransfer.totalScoin")}</p>
                  <p className="text-2xl font-bold">
                    {pkg.total_scoin.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">🪙</span>
                  </p>
                  {pkg.bonus_scoin > 0 && (<p className="text-xs text-muted-foreground">
                      {pkg.base_scoin.toLocaleString()} + {pkg.bonus_scoin.toLocaleString()} bonus
                    </p>)}
                </div>
              </div>
            </div>) : null}
        </CardContent>
      </Card>

      {/* Form */}
      {!loading && !loadError && (isSgem ? !!sgemPkg : !!pkg) && (<Card>
          <CardContent className="pt-5 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="note">{t("directTransfer.noteLabel")} <span className="text-destructive">*</span></Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("directTransfer.notePlaceholder")} rows={3} disabled={submitting} className={`resize-none ${!note.trim() ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}`}/>
              {!note.trim() && (<p className="text-xs text-destructive">This field is required.</p>)}
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Checkbox id="confirm" checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} disabled={submitting} className="mt-0.5"/>
              <Label htmlFor="confirm" className="text-sm leading-relaxed cursor-pointer">
                {t("directTransfer.confirmLabel")}
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="transferred" checked={transferred} onCheckedChange={(v) => setTransferred(!!v)} disabled={submitting} className="mt-0.5"/>
              <Label htmlFor="transferred" className="text-sm leading-relaxed cursor-pointer">
                {t("directTransfer.transferredLabel")}
              </Label>
            </div>

            <Button className="w-full" disabled={!confirmed || !transferred || submitting} onClick={handleSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {submitting ? t("directTransfer.submitting") : t("directTransfer.createTransfer")}
            </Button>
          </CardContent>
        </Card>)}
      </div>

      {/* QR Payment */}
      <div className="w-full lg:w-auto lg:sticky lg:top-8 space-y-3">
        <Card className="p-3">
          <p className="text-sm font-semibold text-center mb-2">MoMo</p>
          <Image src="/momo-qr.jpg" alt="MoMo QR Code" width={220} height={220} className="rounded-lg mx-auto"/>
        </Card>
        <Card className="p-3">
          <p className="text-sm font-semibold text-center mb-2">Techcombank</p>
          <Image src="/tech-qa.jpg" alt="Techcombank QR Code" width={220} height={220} className="rounded-lg mx-auto"/>
        </Card>
        <p className="text-xs text-muted-foreground text-center">
          Quét mã QR bằng MoMo hoặc ứng dụng ngân hàng hỗ trợ VietQR
        </p>
      </div>
      </div>
    </div>);
}
