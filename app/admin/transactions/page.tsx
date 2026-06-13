"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, ReceiptText, ShieldAlert, } from "lucide-react";
import Link from "next/link";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useTranslation } from "@/lib/i18n/use-translation";
import { listAdminTransactions, type AdminTransaction, type AdminTransactionStatus, } from "@/lib/admin-api";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getUserTimezone } from "@/lib/utils/date-utils";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const LIMIT = 50;
function formatDt(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
        timeZone: getUserTimezone(),
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function formatAmount(amount: number, currency: string) {
    if (currency === "VND")
        return amount.toLocaleString("vi-VN") + " ₫";
    try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
    }
    catch {
        return `${(amount / 100).toFixed(2)} ${currency}`;
    }
}
type StatusFilter = AdminTransactionStatus | "";
const STATUS_COLORS: Record<AdminTransactionStatus, string> = {
    completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    credit_failed: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    awaiting_payment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};
function StatusBadge({ status }: {
    status: AdminTransactionStatus;
}) {
    const { t } = useTranslation();
    const labelKey = `adminTransactions.status${status.split("_").map((s) => s[0].toUpperCase() + s.slice(1)).join("")}` as string;
    return (<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ""}`}>
      {t(labelKey)}
    </span>);
}
// ---------------------------------------------------------------------------
// Buy Coin Tab
// ---------------------------------------------------------------------------
function BuyCoinTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
    const load = useCallback(async (status: StatusFilter) => {
        setLoading(true);
        try {
            const res = await listAdminTransactions({ limit: LIMIT, status: status || undefined });
            setTransactions(res.transactions ?? []);
        }
        catch {
            toast({ variant: "destructive", title: t("adminTransactions.loadFailed") });
        }
        finally {
            setLoading(false);
        }
    }, [toast, t]);
    useEffect(() => { load(statusFilter); }, [load, statusFilter]);
    function handleStatusChange(val: string) {
        setStatusFilter(val === "_all" ? "" : val as StatusFilter);
    }
    const STATUS_OPTIONS: {
        value: StatusFilter;
        label: string;
    }[] = [
        { value: "", label: t("adminTransactions.filterAll") },
        { value: "awaiting_payment", label: t("adminTransactions.filterAwaitingPayment") },
        { value: "processing", label: t("adminTransactions.filterProcessing") },
        { value: "completed", label: t("adminTransactions.filterCompleted") },
        { value: "failed", label: t("adminTransactions.filterFailed") },
        { value: "credit_failed", label: t("adminTransactions.filterCreditFailed") },
        { value: "expired", label: t("adminTransactions.filterExpired") },
    ];
    return (<div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {transactions.length} / {LIMIT}
        </p>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("adminTransactions.filterAll")}/>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value === "" ? "_all" : opt.value}>
                  {opt.label}
                </SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => load(statusFilter)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminTransactions.colId")}</TableHead>
                <TableHead>{t("adminTransactions.colUser")}</TableHead>
                <TableHead>{t("adminTransactions.colProvider")}</TableHead>
                <TableHead>{t("adminTransactions.colAmount")}</TableHead>
                <TableHead>{t("adminTransactions.colSCoin")}</TableHead>
                <TableHead>{t("adminTransactions.colStatus")}</TableHead>
                <TableHead>{t("adminTransactions.colCreatedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (Array.from({ length: 8 }).map((_, i) => (<TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full"/></TableCell>))}
                  </TableRow>))) : transactions.length === 0 ? (<TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    {t("adminTransactions.noTransactions")}
                  </TableCell>
                </TableRow>) : (transactions.map((tx) => (<TableRow key={tx.id}>
                    {/* ID */}
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono text-xs max-w-[160px]">
                        <span className="truncate">{tx.id}</span>
                        <CopyButton text={tx.id}/>
                      </div>
                      {tx.provider_data?.transfer_info && (<p className="mt-0.5 text-xs text-muted-foreground">
                          {t("adminTransactions.transferInfo")}: {String(tx.provider_data.transfer_info)}
                        </p>)}
                    </TableCell>
                    {/* User */}
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono text-xs max-w-[140px]">
                        <span className="truncate">{tx.user_id}</span>
                        <CopyButton text={tx.user_id}/>
                      </div>
                    </TableCell>
                    {/* Provider */}
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {tx.provider_key}
                      </Badge>
                    </TableCell>
                    {/* Amount */}
                    <TableCell className="text-sm font-medium">
                      {formatAmount(tx.amount, tx.currency)}
                    </TableCell>
                    {/* sCoin */}
                    <TableCell className="text-sm">
                      🪙 {tx.scoin_amount.toLocaleString()}
                    </TableCell>
                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={tx.status}/>
                    </TableCell>
                    {/* Created At */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDt(tx.created_at)}
                    </TableCell>
                  </TableRow>)))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);
}
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminTransactionsPage() {
    const router = useRouter();
    const capabilities = useCapabilities();
    const { t } = useTranslation();
    useEffect(() => {
        if (!capabilities.is_super_admin)
            router.push("/");
    }, [capabilities, router]);
    if (!capabilities.is_super_admin) {
        return (<div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5"/>
          <span>Admin access required</span>
        </div>
      </div>);
    }
    return (<div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/payments">
              <ArrowLeft className="h-4 w-4"/>
            </Link>
          </Button>
          <ReceiptText className="h-6 w-6 text-primary"/>
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">{t("adminTransactions.pageTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("adminTransactions.pageSubtitle")}</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <Tabs defaultValue="buy-coin">
          <TabsList>
            <TabsTrigger value="buy-coin" className="gap-2">
              🪙 {t("adminTransactions.tabBuyCoin")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="buy-coin" className="mt-4">
            <BuyCoinTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>);
}
