"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  Gem,
  Loader2,
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
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SgemPackage {
  id: string
  package_key: string
  name: string
  description: string
  sgem_amount: number
  price_amount: number
  price_currency: string
  prices?: Record<string, number>
  is_active: boolean
  sort_order: number
}

interface PaymentMethod {
  id: string
  provider_key: string
  display_name: string
  description: string
  supports_subscription: boolean
  is_active: boolean
  supported_currencies?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const LOCALE_CURRENCY: Record<string, string> = {
  vi: "VND",
  ja: "JPY",
  en: "USD",
}

function getLocalizedSgemPrice(
  pkg: SgemPackage,
  locale: string,
  method?: PaymentMethod | null,
): { amount: number; currency: string } {
  if (method?.supported_currencies && pkg.prices) {
    const supported = method.supported_currencies
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
    for (const cur of supported) {
      if (pkg.prices[cur] != null) {
        return { amount: pkg.prices[cur], currency: cur }
      }
    }
  }
  const preferredCurrency = LOCALE_CURRENCY[locale]
  if (preferredCurrency && pkg.prices?.[preferredCurrency] != null) {
    return { amount: pkg.prices[preferredCurrency], currency: preferredCurrency }
  }
  return { amount: pkg.price_amount, currency: pkg.price_currency }
}

function formatSgemPrice(amount: number, currency: string): string {
  const value = amount / 100
  if (currency === "VND") return value.toLocaleString("vi-VN") + " ₫"
  if (currency === "JPY") return "¥" + value.toLocaleString("ja-JP")
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
    default:
      return <CreditCard className="h-6 w-6" />
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const STORAGE_KEY_PACKAGE = "sgem:lastPackageId"
const STORAGE_KEY_METHOD = "sgem:lastMethodId"

export function BuySGemTab() {
  const { toast } = useToast()
  const { t, locale } = useTranslation()
  const router = useRouter()

  // --- packages ---
  const [packages, setPackages] = useState<SgemPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [packagesError, setPackagesError] = useState(false)

  // --- methods ---
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [methodsLoading, setMethodsLoading] = useState(false)
  const [methodsError, setMethodsError] = useState(false)

  // --- selection ---
  const [selectedPackage, setSelectedPackage] = useState<SgemPackage | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true)
    setPackagesError(false)
    try {
      const data = await api.get("/api/v1/payments/sgem-packages")
      setPackages((data.packages ?? []).filter((p: SgemPackage) => p.is_active))
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

  // Restore last selections from localStorage after data loads
  useEffect(() => {
    if (packages.length === 0) return
    const savedId = localStorage.getItem(STORAGE_KEY_PACKAGE)
    if (savedId) {
      const found = packages.find((p) => p.id === savedId)
      if (found) setSelectedPackage(found)
    }
  }, [packages])

  useEffect(() => {
    if (methods.length === 0) return
    const savedId = localStorage.getItem(STORAGE_KEY_METHOD)
    if (savedId) {
      const found = methods.find((m) => m.id === savedId)
      if (found) setSelectedMethod(found)
    }
  }, [methods])

  async function handleCheckout() {
    if (!selectedPackage || !selectedMethod) return
    if (selectedMethod.provider_key === "direct_transfer") {
      router.push(`/payment/direct-transfer?package_id=${selectedPackage.id}&type=sgem`)
      return
    }
    setCheckingOut(true)
    try {
      const idempotencyKey =
        typeof crypto?.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`

      const price = getLocalizedSgemPrice(selectedPackage, locale, selectedMethod)

      const res = await api.post("/api/v1/payments/initiate", {
        package_key: selectedPackage.package_key,
        provider_key: selectedMethod.provider_key,
        idempotency_key: idempotencyKey,
        currency: price.currency,
        amount: price.amount / 100,
      })

      const root = res?.data ?? res
      const txId = root?.transaction?.id
      if (!txId) throw new Error("No transaction returned")

      sessionStorage.setItem(`sepay:${txId}`, JSON.stringify(res))
      router.push(`/payment/sepay-checkout?tx_id=${txId}`)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("payment.sgemCheckoutFailed"),
        description: err?.data?.error ?? err?.message ?? t("payment.sgemCheckoutFailedDesc"),
      })
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div id="buy-sgem-tab-root" className="mt-6 space-y-8">

      {/* ---- Packages ---- */}
      <section id="sgem-packages-section" className="space-y-3">
        <div id="sgem-packages-header" className="flex items-center gap-2">
          <Gem className="h-5 w-5 text-primary" />
          <h2 id="sgem-packages-title" className="text-lg font-semibold">
            {t("payment.sgemPackages")}
          </h2>
        </div>

        {packagesLoading ? (
          <div id="sgem-packages-loading" className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : packagesError ? (
          <Card id="sgem-packages-error-card">
            <CardContent
              id="sgem-packages-error-content"
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              <p className="text-sm text-destructive">{t("payment.sgemPackagesError")}</p>
              <Button
                id="sgem-packages-retry-btn"
                variant="outline"
                size="sm"
                onClick={fetchPackages}
              >
                {t("payment.tryAgain")}
              </Button>
            </CardContent>
          </Card>
        ) : packages.length === 0 ? (
          <Card id="sgem-packages-empty-card">
            <CardContent
              id="sgem-packages-empty-content"
              className="py-8 text-center text-sm text-muted-foreground"
            >
              {t("payment.noSgemPackages")}
            </CardContent>
          </Card>
        ) : (
          <div id="sgem-packages-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id
              const price = getLocalizedSgemPrice(pkg, locale, selectedMethod)
              return (
                <Card
                  key={pkg.id}
                  id={`sgem-package-card-${pkg.id}`}
                  className={`relative cursor-pointer transition-all hover:border-primary/60 ${
                    isSelected ? "border-primary ring-2 ring-primary/30" : ""
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedPackage(null)
                      localStorage.removeItem(STORAGE_KEY_PACKAGE)
                    } else {
                      setSelectedPackage(pkg)
                      localStorage.setItem(STORAGE_KEY_PACKAGE, pkg.id)
                    }
                  }}
                >
                  {isSelected && (
                    <div
                      id={`sgem-package-selected-icon-${pkg.id}`}
                      className="absolute right-3 top-3 rounded-full bg-primary p-0.5 text-primary-foreground shadow-md"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                  <CardHeader id={`sgem-package-header-${pkg.id}`} className="pb-2 pt-5">
                    <CardTitle id={`sgem-package-name-${pkg.id}`} className="text-base">
                      {pkg.name}
                    </CardTitle>
                    <CardDescription
                      id={`sgem-package-desc-${pkg.id}`}
                      className="text-xs line-clamp-2 h-[2.5rem]"
                    >
                      {pkg.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent id={`sgem-package-content-${pkg.id}`} className="pt-0 space-y-1">
                    <div
                      id={`sgem-package-price-row-${pkg.id}`}
                      className="flex items-end justify-between gap-2"
                    >
                      <p id={`sgem-package-amount-${pkg.id}`} className="text-2xl font-bold tabular-nums">
                        {pkg.sgem_amount.toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground ml-1">💎</span>
                      </p>
                      <p
                        id={`sgem-package-price-${pkg.id}`}
                        className="text-base font-semibold text-primary whitespace-nowrap pb-0.5"
                      >
                        {formatSgemPrice(price.amount, price.currency)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* ---- Payment methods + Order summary (2 columns) ---- */}
      <div id="sgem-checkout-grid" className="grid gap-6 lg:grid-cols-2 lg:items-start">

        {/* Column 1 – Payment Methods */}
        <section id="sgem-methods-section" className="space-y-3">
          <div id="sgem-methods-header" className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <h2 id="sgem-methods-title" className="text-lg font-semibold">
              {t("payment.paymentMethods")}
            </h2>
          </div>

          {methodsLoading ? (
            <div id="sgem-methods-loading" className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : methodsError ? (
            <Card id="sgem-methods-error-card">
              <CardContent
                id="sgem-methods-error-content"
                className="flex flex-col items-center gap-3 py-8 text-center"
              >
                <p className="text-sm text-destructive">{t("payment.methodsError")}</p>
                <Button
                  id="sgem-methods-retry-btn"
                  variant="outline"
                  size="sm"
                  onClick={fetchMethods}
                >
                  {t("payment.tryAgain")}
                </Button>
              </CardContent>
            </Card>
          ) : methods.length === 0 ? (
            <Card id="sgem-methods-empty-card">
              <CardContent
                id="sgem-methods-empty-content"
                className="py-8 text-center text-sm text-muted-foreground"
              >
                {t("payment.noMethods")}
              </CardContent>
            </Card>
          ) : (
            <div id="sgem-methods-list" className="grid gap-3">
              {methods.map((method) => {
                const isSelected = selectedMethod?.id === method.id
                return (
                  <Card
                    key={method.id}
                    id={`sgem-method-card-${method.id}`}
                    className={`cursor-pointer transition-all hover:border-primary/60 ${
                      isSelected ? "border-primary ring-2 ring-primary/30" : ""
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMethod(null)
                        localStorage.removeItem(STORAGE_KEY_METHOD)
                      } else {
                        setSelectedMethod(method)
                        localStorage.setItem(STORAGE_KEY_METHOD, method.id)
                      }
                    }}
                  >
                    <CardContent
                      id={`sgem-method-content-${method.id}`}
                      className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4"
                    >
                      <div
                        id={`sgem-method-icon-wrap-${method.id}`}
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm text-foreground"
                      >
                        {getMethodIcon(method.provider_key)}
                      </div>
                      <div id={`sgem-method-info-${method.id}`} className="flex-1 min-w-0">
                        <p id={`sgem-method-name-${method.id}`} className="font-semibold text-sm">
                          {method.display_name}
                        </p>
                        {method.description && (
                          <p
                            id={`sgem-method-desc-${method.id}`}
                            className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
                          >
                            {method.description}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div
                          id={`sgem-method-selected-${method.id}`}
                          className="rounded-full bg-primary p-0.5 text-primary-foreground shadow-md shrink-0"
                        >
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
        <section id="sgem-order-section" className="space-y-3">
          <div id="sgem-order-header" className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-primary" />
            <h2 id="sgem-order-title" className="text-lg font-semibold">
              {t("payment.orderSummary")}
            </h2>
          </div>
          <Card id="sgem-order-card">
            <CardContent id="sgem-order-content" className="p-4 space-y-4 sm:p-5">
              {/* Package row */}
              <div id="sgem-order-package-row" className="space-y-1">
                <p
                  id="sgem-order-package-label"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  {t("payment.sgemPackages")}
                </p>
                {selectedPackage ? (
                  <div id="sgem-order-package-selected" className="flex items-start justify-between gap-2">
                    <div id="sgem-order-package-info">
                      <p id="sgem-order-package-name" className="text-sm font-semibold">
                        {selectedPackage.name}
                      </p>
                      <p id="sgem-order-package-amount" className="text-xs text-muted-foreground">
                        {selectedPackage.sgem_amount.toLocaleString()} 💎 sGem
                      </p>
                    </div>
                    <p id="sgem-order-package-price" className="text-sm font-semibold text-primary shrink-0">
                      {(() => {
                        const p = getLocalizedSgemPrice(selectedPackage, locale, selectedMethod)
                        return formatSgemPrice(p.amount, p.currency)
                      })()}
                    </p>
                  </div>
                ) : (
                  <p id="sgem-order-package-empty" className="text-sm text-muted-foreground italic">
                    {t("payment.noPackageSelected")}
                  </p>
                )}
              </div>

              <Separator id="sgem-order-sep1" />

              {/* Method row */}
              <div id="sgem-order-method-row" className="space-y-1">
                <p
                  id="sgem-order-method-label"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  {t("payment.paymentMethods")}
                </p>
                {selectedMethod ? (
                  <div id="sgem-order-method-selected" className="flex items-center gap-3">
                    <div
                      id="sgem-order-method-icon"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-muted text-foreground"
                    >
                      {getMethodIcon(selectedMethod.provider_key)}
                    </div>
                    <div id="sgem-order-method-info" className="min-w-0">
                      <p id="sgem-order-method-name" className="text-sm font-semibold">
                        {selectedMethod.display_name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p id="sgem-order-method-empty" className="text-sm text-muted-foreground italic">
                    {t("payment.noMethodSelected")}
                  </p>
                )}
              </div>

              <Separator id="sgem-order-sep2" />

              <Button
                id="sgem-checkout-btn"
                className="w-full"
                disabled={!selectedPackage || !selectedMethod || checkingOut}
                onClick={handleCheckout}
              >
                {checkingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("payment.proceedToPayment")}
              </Button>
            </CardContent>
          </Card>

          <p id="sgem-discount-tip" className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <MessageCircle className="h-3 w-3 shrink-0" />
            {t("payment.discountTip")}
          </p>
        </section>

      </div>
    </div>
  )
}
