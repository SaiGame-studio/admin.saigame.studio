"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  Gift,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  CreditCard,
  Coins,
  CheckCircle2,
  MessageCircle,
} from "lucide-react"

import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"
import { getUserTimezone } from "@/lib/utils/date-utils"
import { CopyButton } from "@/components/CopyButton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Transaction {
  id: string
  user_id: string
  amount: number
  type: string
  status: string
  balance_before: number
  balance_after: number
  description?: string
  reference_id?: string
  reference_type?: string
  created_by?: string
  created_at: string
  processed_at?: string
}

interface TransactionsResponse {
  limit: number
  offset: number
  total: number
  transactions: Transaction[]
}

interface PaymentTransaction {
  id: string
  user_id: string
  scoin_package_id?: string
  payment_method_config_id?: string
  provider_key: string
  amount: number
  currency: string
  scoin_amount: number
  status: string
  provider_data?: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface PaymentTransactionsResponse {
  limit: number
  offset: number
  total: number
  transactions: PaymentTransaction[]
}

interface PaymentMethod {
  id: string
  provider_key: string
  display_name: string
  description: string
  supports_subscription: boolean
  is_active: boolean
}

interface CoinPackage {
  id: string
  key: string
  name: string
  description: string
  price_amount: number
  price_currency: string
  bonus_scoin: number
  total_scoin: number
  base_scoin: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPrice(amount: number, currency: string): string {
  const value = amount / 100
  if (currency === "VND") {
    return value.toLocaleString("vi-VN") + " ₫"
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
  } catch {
    return `${value.toLocaleString()} ${currency}`
  }
}

function getMethodIcon(providerKey: string) {
  switch (providerKey) {
    case "bank_transfer_vn":
      return <Building2 className="h-6 w-6" />
    case "paddle":
      return <CreditCard className="h-6 w-6" />
    default:
      return <CreditCard className="h-6 w-6" />
  }
}

// ---------------------------------------------------------------------------
// Transaction type badge label
// ---------------------------------------------------------------------------
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  pending: "secondary",
  failed: "destructive",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    timeZone: getUserTimezone(),
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PaymentPage() {
  const { toast } = useToast()
  const { t, locale } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get("txid")
    ? "transactions"
    : (["transactions", "redeem"].includes(searchParams.get("tab") ?? "") ? searchParams.get("tab")! : "payment"))

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    if (value !== "transactions") {
      params.delete("txid")
      params.delete("subtab")
    }
    router.replace(`/payment?${params.toString()}`, { scroll: false })
  }

  const getTypeLabel = (type: string) =>
    ({
      admin_topup: t('payment.typeAdminTopup'),
      gift_code: t('payment.typeGiftCode'),
      purchase: t('payment.typePurchase'),
      refund: t('payment.typeRefund'),
    } as Record<string, string>)[type] ?? type

  // ---------- gift code state ----------
  const [code, setCode] = useState("")
  const [redeeming, setRedeeming] = useState(false)

  // ---------- sub-tab inside transactions tab (URL-persisted) ----------
  const txSubTab = (["buy", "use"].includes(searchParams.get("subtab") ?? "") ? searchParams.get("subtab")! : "buy") as "buy" | "use"

  function handleTxSubTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("subtab", value)
    router.replace(`/payment?${params.toString()}`, { scroll: false })
  }

  const expandedPayTxId = searchParams.get("txid") ?? null
  function setExpandedPayTxId(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set("txid", id)
    else params.delete("txid")
    router.replace(`/payment?${params.toString()}`, { scroll: false })
  }
  // Cache for package names fetched individually (id -> name | null=loading | undefined=not fetched)
  const [pkgNameCache, setPkgNameCache] = useState<Record<string, string | null>>({})

  async function resolvePackageName(id: string) {
    // Already in cache
    if (id in pkgNameCache) return
    // Already in loaded packages list
    if (packages.find((p) => p.id === id)) return
    // Fetch individually
    setPkgNameCache((prev) => ({ ...prev, [id]: null }))
    try {
      const data = await api.get(`/api/v1/payments/packages/${id}`)
      setPkgNameCache((prev) => ({ ...prev, [id]: data?.name ?? id }))
    } catch {
      setPkgNameCache((prev) => ({ ...prev, [id]: id }))
    }
  }

  // ---------- payment transactions (Buy Coin) ----------
  const [payTxFetched, setPayTxFetched] = useState(false)
  const [payTxData, setPayTxData] = useState<PaymentTransactionsResponse | null>(null)
  const [payTxLoading, setPayTxLoading] = useState(false)
  const [payTxError, setPayTxError] = useState(false)

  const fetchPaymentTransactions = useCallback(async () => {
    setPayTxLoading(true)
    setPayTxError(false)
    try {
      const data = await api.get("/api/v1/payments/transactions?limit=20&offset=0")
      setPayTxData(data)
    } catch {
      setPayTxError(true)
    } finally {
      setPayTxLoading(false)
    }
  }, [])

  // ---------- coin transactions (Use Coin) ----------
  const [txData, setTxData] = useState<TransactionsResponse | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState(false)

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true)
    setTxError(false)
    try {
      const data = await api.get("/api/v1/coins/transactions?limit=20&offset=0")
      setTxData(data)
    } catch {
      setTxError(true)
    } finally {
      setTxLoading(false)
    }
  }, [])

  useEffect(() => {
    if (txSubTab === "buy" && !payTxFetched) {
      setPayTxFetched(true)
      fetchPaymentTransactions()
    }
  }, [txSubTab, payTxFetched, fetchPaymentTransactions])

  // Auto-resolve package name when txid is in URL on load
  useEffect(() => {
    if (expandedPayTxId && payTxData) {
      const tx = payTxData.transactions.find(t => t.id === expandedPayTxId)
      if (tx?.scoin_package_id) resolvePackageName(tx.scoin_package_id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payTxData, expandedPayTxId])

  // Lazy-load coin transactions only when "Use Coin" sub-tab is first opened
  const [txFetched, setTxFetched] = useState(false)
  useEffect(() => {
    if (txSubTab === "use" && !txFetched) {
      setTxFetched(true)
      fetchTransactions()
    }
  }, [txSubTab, txFetched, fetchTransactions])

  // ---------- packages & methods state ----------
  const [packages, setPackages] = useState<CoinPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [packagesError, setPackagesError] = useState(false)

  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [methodsLoading, setMethodsLoading] = useState(false)
  const [methodsError, setMethodsError] = useState(false)

  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [stampingId, setStampingId] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)

  const STORAGE_KEY_PACKAGE = "payment:lastPackageId"

  // Restore last selected package after packages are loaded
  useEffect(() => {
    if (packages.length === 0) return
    const savedId = localStorage.getItem(STORAGE_KEY_PACKAGE)
    if (savedId) {
      const found = packages.find((p) => p.id === savedId)
      if (found) setSelectedPackage(found)
    }
  }, [packages])

  function handleSelectPackage(pkg: CoinPackage, isSelected: boolean) {
    if (isSelected) {
      setSelectedPackage(null)
      localStorage.removeItem(STORAGE_KEY_PACKAGE)
    } else {
      setSelectedPackage(pkg)
      localStorage.setItem(STORAGE_KEY_PACKAGE, pkg.id)
      if (pkg.bonus_scoin > 0) {
        setStampingId(pkg.id)
        setTimeout(() => setStampingId(null), 800)
      }
    }
  }

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true)
    setPackagesError(false)
    try {
      const data = await api.get(`/api/v1/payments/packages?lang=${locale}`)
      setPackages(data.packages ?? [])
    } catch {
      setPackagesError(true)
    } finally {
      setPackagesLoading(false)
    }
  }, [locale])

  const fetchMethods = useCallback(async () => {
    setMethodsLoading(true)
    setMethodsError(false)
    try {
      const data = await api.get(`/api/v1/payments/methods?lang=${locale}`)
      setMethods((data.methods ?? []).filter((m: PaymentMethod) => m.is_active))
    } catch {
      setMethodsError(true)
    } finally {
      setMethodsLoading(false)
    }
  }, [locale])

  useEffect(() => {
    fetchPackages()
    fetchMethods()
  }, [fetchPackages, fetchMethods])

  async function handleCheckout() {
    if (!selectedPackage || !selectedMethod) return
    if (selectedMethod.provider_key === "direct_transfer") {
      router.push(`/payment/direct-transfer?package_id=${selectedPackage.id}`)
      return
    }
    setCheckingOut(true)
    try {
      // Placeholder: checkout endpoint to be connected
      toast({
        title: t('payment.checkoutInitiated'),
        description: `${selectedPackage.name} · ${selectedMethod.display_name}`,
      })
    } finally {
      setCheckingOut(false)
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setRedeeming(true)
    try {
      const data = await api.post("/api/v1/coins/redeem", { code: code.trim() })

      toast({
        title: t('payment.redeemSuccess'),
        description:
          typeof data?.message === "string"
            ? data.message
            : t('payment.redeemSuccessDesc'),
      })
      setCode("")
      window.dispatchEvent(new CustomEvent("wallet:refresh"))
      fetchTransactions()
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t('payment.redeemFailed'),
        description:
          err?.data?.message ?? err?.message ?? t('payment.redeemFailedDesc'),
      })
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{t('payment.back')}</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{t('payment.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('payment.subtitle')}
          </p>
        </div>
      </div>

      <div className="w-full">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-auto inline-flex">
            <TabsTrigger value="payment">{t('payment.tabPaymentMethod')}</TabsTrigger>
            <TabsTrigger value="redeem">{t('payment.tabRedeemGiftCode')}</TabsTrigger>
            <TabsTrigger value="transactions">{t('payment.tabTransactions')}</TabsTrigger>
          </TabsList>

          {/* ============================================================
              TAB 1 – Buy sCoin
          ============================================================ */}
          <TabsContent value="payment" className="mt-6 space-y-8">

            {/* ---- Packages section ---- */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{t('payment.coinPackages')}</h2>
              </div>

              {packagesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : packagesError ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                    <p className="text-sm text-destructive">{t('payment.packagesError')}</p>
                    <Button variant="outline" size="sm" onClick={fetchPackages}>
                      {t('payment.tryAgain')}
                    </Button>
                  </CardContent>
                </Card>
              ) : packages.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    {t('payment.noPackages')}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <style>{`
                    @keyframes stamp-in {
                      0%   { transform: rotate(-15deg) scale(3); opacity: 0; }
                      60%  { transform: rotate(-15deg) scale(0.85); opacity: 1; }
                      80%  { transform: rotate(-15deg) scale(1.08); }
                      100% { transform: rotate(-15deg) scale(1); opacity: 1; }
                    }
                    @keyframes card-shake {
                      0%,100% { transform: translateX(0); }
                      20%     { transform: translateX(-4px) rotate(-0.5deg); }
                      40%     { transform: translateX(4px) rotate(0.5deg); }
                      60%     { transform: translateX(-3px); }
                      80%     { transform: translateX(3px); }
                    }
                    .stamp-animate { animation: stamp-in 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
                    .card-shake    { animation: card-shake 0.45s ease 0.1s; }
                  `}</style>
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id
                    return (
                      <Card
                        key={pkg.id}
                        className={`relative cursor-pointer transition-all hover:border-primary/60 ${isSelected ? "border-primary ring-2 ring-primary/30" : ""} ${stampingId === pkg.id ? "card-shake" : ""}`}
                        onClick={() => handleSelectPackage(pkg, isSelected)}
                      >
                        {isSelected && (
                          <div className="absolute right-3 top-3 rounded-full bg-primary p-0.5 text-primary-foreground shadow-md">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        )}
                        {pkg.bonus_scoin > 0 && (
                          <div className="absolute left-0 top-0">
                            <Badge className="rounded-none rounded-br-md text-sm font-bold px-2.5 py-1 shadow-sm">
                              +{pkg.bonus_scoin.toLocaleString()} {t('payment.bonus')}
                            </Badge>
                          </div>
                        )}
                        <CardHeader className="pb-2 pt-8">
                          <CardTitle className="text-base">{pkg.name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2 h-[2.5rem]">
                            {pkg.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-2xl font-bold tabular-nums">
                                {pkg.total_scoin.toLocaleString()}
                                <span className="text-sm font-normal text-muted-foreground ml-1">sCoin</span>
                              </p>
                              <div className="min-h-[1.25rem]">
                                {pkg.bonus_scoin > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {pkg.base_scoin.toLocaleString()} <span className="font-bold text-primary">+{pkg.bonus_scoin.toLocaleString()} {t('payment.bonusLabel')}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-primary">
                                {formatPrice(pkg.price_amount, pkg.price_currency)}
                              </p>
                              {pkg.bonus_scoin > 0 && (
                                <div className={`flex items-center justify-center w-14 h-14 rounded-full border-2 border-dashed border-primary/70 bg-primary/10 rotate-[-15deg] select-none shrink-0 ${isSelected ? "stamp-animate" : ""}`}>
                                  <span className="text-[11px] font-bold text-primary leading-tight text-center rotate-0">
                                    {t('payment.save')}<br/>{Math.round(pkg.bonus_scoin / pkg.base_scoin * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ---- Payment methods + Order summary (2 columns) ---- */}
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">

              {/* Column 1 – Payment Methods */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t('payment.paymentMethods')}</h2>
                </div>

                {methodsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : methodsError ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                      <p className="text-sm text-destructive">{t('payment.methodsError')}</p>
                      <Button variant="outline" size="sm" onClick={fetchMethods}>
                        {t('payment.tryAgain')}
                      </Button>
                    </CardContent>
                  </Card>
                ) : methods.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      {t('payment.noMethods')}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {methods.map((method) => {
                      const isSelected = selectedMethod?.id === method.id
                      return (
                        <Card
                          key={method.id}
                          className={`cursor-pointer transition-all hover:border-primary/60 ${
                            isSelected ? "border-primary ring-2 ring-primary/30" : ""
                          }`}
                          onClick={() => setSelectedMethod(isSelected ? null : method)}
                        >
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm text-foreground">
                              {getMethodIcon(method.provider_key)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{method.display_name}</p>
                              {method.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{method.description}</p>
                              )}
                              {method.supports_subscription && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {t('payment.supportsSubscription')}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <div className="rounded-full bg-primary p-0.5 text-primary-foreground shadow-md shrink-0">
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Column 2 – Order Summary */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t('payment.orderSummary')}</h2>
                </div>
                <Card>
                  <CardContent className="p-5 space-y-4">
                    {/* Package row */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('payment.coinPackages')}</p>
                      {selectedPackage ? (
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{selectedPackage.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedPackage.total_scoin.toLocaleString()} sCoin
                              {selectedPackage.bonus_scoin > 0 && (
                                <span className="ml-1 text-primary">+{selectedPackage.bonus_scoin.toLocaleString()} {t('payment.bonusLabel')}</span>
                              )}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-primary shrink-0">
                            {formatPrice(selectedPackage.price_amount, selectedPackage.price_currency)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">{t('payment.noPackageSelected')}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Method row */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('payment.paymentMethods')}</p>
                      {selectedMethod ? (
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-muted text-foreground">
                            {getMethodIcon(selectedMethod.provider_key)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{selectedMethod.display_name}</p>
                            {selectedMethod.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{selectedMethod.description}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">{t('payment.noMethodSelected')}</p>
                      )}
                    </div>

                    <Separator />

                    <Button
                      className="w-full"
                      disabled={!selectedPackage || !selectedMethod || checkingOut}
                      onClick={handleCheckout}
                    >
                      {checkingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('payment.proceedToPayment')}
                    </Button>
                  </CardContent>
                </Card>

                {/* discount tip */}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                  <MessageCircle className="h-3 w-3 shrink-0" />
                  {t('payment.discountTip')}
                </p>
              </section>

            </div>
          </TabsContent>

          {/* ============================================================
              TAB 2 – Redeem Gift Code
          ============================================================ */}
          <TabsContent value="redeem" className="mt-6">
            <section className="space-y-3 max-w-[50%]">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{t('payment.redeemGiftCode')}</h2>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('payment.enterGiftCode')}</CardTitle>
                  <CardDescription>
                    {t('payment.redeemGiftCodeDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleRedeem}
                    className="flex flex-col gap-4 sm:flex-row sm:items-end"
                  >
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="gift-code">{t('payment.giftCodeLabel')}</Label>
                      <Input
                        id="gift-code"
                        placeholder={t('payment.giftCodePlaceholder')}
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        disabled={redeeming}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={redeeming || !code.trim()}
                      className="shrink-0"
                    >
                      {redeeming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('payment.redeeming')}
                        </>
                      ) : (
                        <>
                          <Gift className="mr-2 h-4 w-4" />
                          {t('payment.redeem')}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* ============================================================
              TAB 3 – Transactions
          ============================================================ */}
          <TabsContent value="transactions" className="mt-6">
            <Tabs value={txSubTab} onValueChange={handleTxSubTabChange}>
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <TabsList>
                  <TabsTrigger value="buy">{t('payment.subTabBuyCoin')}</TabsTrigger>
                  <TabsTrigger value="use">{t('payment.subTabUseCoin')}</TabsTrigger>
                </TabsList>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={txSubTab === "buy" ? fetchPaymentTransactions : fetchTransactions}
                  disabled={txSubTab === "buy" ? payTxLoading : txLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${(txSubTab === "buy" ? payTxLoading : txLoading) ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {/* ---- Sub-tab: Buy Coin ---- */}
              <TabsContent value="buy" className="mt-0">
                {payTxLoading && !payTxData ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : payTxError ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                      <p className="text-sm text-destructive">{t('payment.loadError')}</p>
                      <Button variant="outline" size="sm" onClick={fetchPaymentTransactions}>
                        {t('payment.tryAgain')}
                      </Button>
                    </CardContent>
                  </Card>
                ) : !payTxData?.transactions?.length ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      {t('payment.noTransactions')}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {payTxData.transactions.map((tx) => {
                      const isExpanded = expandedPayTxId === tx.id
                      return (
                        <Card
                          key={tx.id}
                          className="cursor-pointer transition-colors hover:border-primary/40"
                          onClick={() => {
                            const next = isExpanded ? null : tx.id
                            setExpandedPayTxId(next)
                            if (next && tx.scoin_package_id) resolvePackageName(tx.scoin_package_id)
                          }}
                          id={tx.id}
                        >
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Coins className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium">
                                {tx.provider_key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 truncate">
                                {tx.id}
                                <CopyButton text={tx.id} />
                              </p>
                            </div>

                            <Badge
                              variant={STATUS_VARIANT[tx.status] ?? "secondary"}
                              className="text-xs shrink-0 capitalize"
                            >
                              {tx.status.replace(/_/g, " ")}
                            </Badge>

                            <div className="text-right shrink-0">
                              <p className="font-semibold tabular-nums text-primary">
                                +{tx.scoin_amount.toLocaleString()} sCoin
                              </p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {tx.amount.toLocaleString()} {tx.currency}
                              </p>
                            </div>
                          </CardContent>

                          {isExpanded && (
                            <CardContent
                              className="border-t px-4 pb-4 pt-3 space-y-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t('payment.detailTransactionId')}</p>
                                  <p className="font-mono text-xs break-all select-all flex items-center gap-1">{tx.id}<CopyButton text={tx.id} /></p>
                                </div>
                                {tx.scoin_package_id && (() => {
                                  const fromList = packages.find((p) => p.id === tx.scoin_package_id)
                                  const cachedName = pkgNameCache[tx.scoin_package_id]
                                  const name = fromList?.name ?? (cachedName === null ? null : cachedName)
                                  return (
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t('payment.detailPackage')}</p>
                                      {name === null ? (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Loader2 className="h-3 w-3 animate-spin" /> {t('payment.detailLoading')}
                                        </span>
                                      ) : (
                                        <div>
                                          <p className="font-medium">{name ?? tx.scoin_package_id}</p>
                                          <p className="font-mono text-xs text-muted-foreground break-all">{tx.scoin_package_id}</p>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t('payment.detailProvider')}</p>
                                  <p>{tx.provider_key}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t('payment.detailAmount')}</p>
                                  <p className="font-semibold">{tx.amount.toLocaleString()} {tx.currency}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t('payment.detailsCoin')}</p>
                                  <p className="font-semibold text-primary">+{tx.scoin_amount.toLocaleString()} sCoin</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t('payment.detailStatus')}</p>
                                  <Badge variant={STATUS_VARIANT[tx.status] ?? "secondary"} className="capitalize text-xs">
                                    {tx.status.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t('payment.detailCreated')}</p>
                                  <p>{formatDate(tx.created_at)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t('payment.detailUpdated')}</p>
                                  <p>{formatDate(tx.updated_at)}</p>
                                </div>
                                {tx.provider_data && Object.keys(tx.provider_data).length > 0 && (
                                  <div className="sm:col-span-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t('payment.detailProviderData')}</p>
                                    <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(tx.provider_data, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ---- Sub-tab: Use Coin ---- */}
              <TabsContent value="use" className="mt-0">
                {txLoading && !txData ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : txError ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                      <p className="text-sm text-destructive">{t('payment.loadError')}</p>
                      <Button variant="outline" size="sm" onClick={fetchTransactions}>
                        {t('payment.tryAgain')}
                      </Button>
                    </CardContent>
                  </Card>
                ) : txData?.transactions?.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      {t('payment.noTransactions')}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {txData?.transactions?.map((tx) => {
                      const isCredit = tx.amount > 0
                      return (
                        <Card key={tx.id}>
                          <CardContent className="flex items-center gap-4 p-4">
                            <div
                              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                                isCredit
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium">
                                {tx.description ?? getTypeLabel(tx.type)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(tx.created_at)}
                              </p>
                            </div>

                            <Badge variant="outline" className="hidden sm:inline-flex text-xs shrink-0">
                              {getTypeLabel(tx.type)}
                            </Badge>

                            <Badge
                              variant={STATUS_VARIANT[tx.status] ?? "secondary"}
                              className="text-xs shrink-0"
                            >
                              {tx.status}
                            </Badge>

                            <div className="text-right shrink-0">
                              <p
                                className={`font-semibold tabular-nums ${
                                  isCredit ? "text-green-500" : "text-destructive"
                                }`}
                              >
                                {isCredit ? "+" : ""}
                                {tx.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                → {tx.balance_after.toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}
