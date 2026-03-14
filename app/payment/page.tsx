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

interface PaymentMethod {
  id: string
  provider_key: string
  display_name: string
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
  if (currency === "VND") {
    return amount.toLocaleString("vi-VN") + " ₫"
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
  } catch {
    return `${amount.toLocaleString()} ${currency}`
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

const TYPE_LABELS: Record<string, string> = {
  admin_topup: "Admin Top-up",
  gift_code: "Gift Code",
  purchase: "Purchase",
  refund: "Refund",
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
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (["transactions", "redeem"].includes(searchParams.get("tab") ?? "") ? searchParams.get("tab")! : "payment")

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
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

  // ---------- transaction state ----------
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
    fetchTransactions()
  }, [fetchTransactions])

  // ---------- packages & methods state ----------
  const [packages, setPackages] = useState<CoinPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [packagesError, setPackagesError] = useState(false)

  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [methodsLoading, setMethodsLoading] = useState(false)
  const [methodsError, setMethodsError] = useState(false)

  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true)
    setPackagesError(false)
    try {
      const data = await api.get("/api/v1/payments/packages")
      setPackages(data.packages ?? [])
    } catch {
      setPackagesError(true)
    } finally {
      setPackagesLoading(false)
    }
  }, [])

  const fetchMethods = useCallback(async () => {
    setMethodsLoading(true)
    setMethodsError(false)
    try {
      const data = await api.get("/api/v1/payments/methods")
      setMethods((data.methods ?? []).filter((m: PaymentMethod) => m.is_active))
    } catch {
      setMethodsError(true)
    } finally {
      setMethodsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPackages()
    fetchMethods()
  }, [fetchPackages, fetchMethods])

  async function handleCheckout() {
    if (!selectedPackage || !selectedMethod) return
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
        title: "Gift code redeemed!",
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
            <span className="sr-only">Back</span>
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
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id
                    return (
                      <Card
                        key={pkg.id}
                        className={`relative cursor-pointer transition-all hover:border-primary/60 ${
                          isSelected ? "border-primary ring-2 ring-primary/30" : ""
                        }`}
                        onClick={() => setSelectedPackage(isSelected ? null : pkg)}
                      >
                        {isSelected && (
                          <div className="absolute right-3 top-3 text-primary">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        )}
                        {pkg.bonus_scoin > 0 && (
                          <div className="absolute left-0 top-0">
                            <Badge className="rounded-none rounded-br-md text-xs">
                              +{pkg.bonus_scoin} {t('payment.bonus')}
                            </Badge>
                          </div>
                        )}
                        <CardHeader className="pb-2 pt-8">
                          <CardTitle className="text-base">{pkg.name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2">
                            {pkg.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-2xl font-bold tabular-nums">
                                {pkg.total_scoin.toLocaleString()}
                                <span className="text-sm font-normal text-muted-foreground ml-1">sCoin</span>
                              </p>
                              {pkg.bonus_scoin > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {pkg.base_scoin.toLocaleString()} + {pkg.bonus_scoin.toLocaleString()} {t('payment.bonusLabel')}
                                </p>
                              )}
                            </div>
                            <p className="text-base font-semibold text-primary">
                              {formatPrice(pkg.price_amount, pkg.price_currency)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ---- Payment methods section ---- */}
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
                            {method.supports_subscription && (
                              <p className="text-xs text-muted-foreground">
                                {t('payment.supportsSubscription')}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ---- Checkout button ---- */}
            {(selectedPackage || selectedMethod) && (
              <>
                <Separator />
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {selectedPackage && (
                      <p>
                        <span className="font-medium text-foreground">{selectedPackage.name}</span>
                        {" · "}
                        {formatPrice(selectedPackage.price_amount, selectedPackage.price_currency)}
                        {" · "}
                        {selectedPackage.total_scoin.toLocaleString()} sCoin
                      </p>
                    )}
                    {selectedMethod && (
                      <p>{selectedMethod.display_name}</p>
                    )}
                  </div>
                  <Button
                    disabled={!selectedPackage || !selectedMethod || checkingOut}
                    onClick={handleCheckout}
                    className="shrink-0"
                  >
                    {checkingOut ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {t('payment.proceedToPayment')}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ============================================================
              TAB 2 – Redeem Gift Code
          ============================================================ */}
          <TabsContent value="redeem" className="mt-6">
            <section className="space-y-3">
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{t('payment.transactionHistory')}</h2>
                {txData && (
                  <p className="text-sm text-muted-foreground">
                    {txData.total} {txData.total !== 1 ? t('payment.transactionsTotal') : t('payment.transactionTotal')}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTransactions}
                disabled={txLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${txLoading ? "animate-spin" : ""}`} />
                {t('payment.refresh')}
              </Button>
            </div>

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
                            {tx.description ?? TYPE_LABELS[tx.type] ?? tx.type}
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
      </div>
    </div>
  )
}
