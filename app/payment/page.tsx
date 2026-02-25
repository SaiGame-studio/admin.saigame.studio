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
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"

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

// ---------------------------------------------------------------------------
// Payment method card
// ---------------------------------------------------------------------------
interface PaymentMethodProps {
  logo: React.ReactNode
  name: string
  description: string
  comingSoon: string
}

function PaymentMethodCard({ logo, name, description, comingSoon }: PaymentMethodProps) {
  return (
    <Card className="relative overflow-hidden opacity-70">
      <div className="absolute right-0 top-0">
        <Badge variant="secondary" className="rounded-none rounded-bl-md text-xs">
          {comingSoon}
        </Badge>
      </div>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border bg-background text-3xl shadow-sm">
          {logo}
        </div>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
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
  const activeTab = (searchParams.get("tab") === "transactions" ? "transactions" : "payment")

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payment">{t('payment.tabPaymentMethod')}</TabsTrigger>
              <TabsTrigger value="transactions">{t('payment.tabTransactions')}</TabsTrigger>
            </TabsList>

            {/* ============================================================
                TAB 1 – Payment Method
            ============================================================ */}
            <TabsContent value="payment" className="mt-6 space-y-8">
              {/* Payment methods */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t('payment.paymentMethods')}</h2>
                </div>
                <div className="grid gap-3">
                  <PaymentMethodCard
                    logo="🏦"
                    name={t('payment.bankTransfer')}
                    description={t('payment.bankTransferDesc')}
                    comingSoon={t('payment.comingSoon')}
                  />
                  <PaymentMethodCard
                    logo="🅿️"
                    name={t('payment.paypal')}
                    description={t('payment.paypalDesc')}
                    comingSoon={t('payment.comingSoon')}
                  />
                  <PaymentMethodCard
                    logo="🟣"
                    name={t('payment.momo')}
                    description={t('payment.momoDesc')}
                    comingSoon={t('payment.comingSoon')}
                  />
                </div>
              </section>

              {/* Gift code */}
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
                TAB 2 – Transactions
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
                          {/* Direction icon */}
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

                          {/* Description & date */}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium">
                              {tx.description ?? TYPE_LABELS[tx.type] ?? tx.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.created_at)}
                            </p>
                          </div>

                          {/* Type badge */}
                          <Badge variant="outline" className="hidden sm:inline-flex text-xs shrink-0">
                            {getTypeLabel(tx.type)}
                          </Badge>

                          {/* Status badge */}
                          <Badge
                            variant={STATUS_VARIANT[tx.status] ?? "secondary"}
                            className="text-xs shrink-0"
                          >
                            {tx.status}
                          </Badge>

                          {/* Amount */}
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

