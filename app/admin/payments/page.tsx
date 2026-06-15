"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gift, GripVertical, Loader2, BadgeDollarSign, Pencil, Plus, ReceiptText, RefreshCw, Search, ShieldAlert, Trash2, CreditCard, Building2, ToggleLeft, ToggleRight, Package, Star, ChevronDown, ChevronRight, X, } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCapabilities } from "@/hooks/use-capabilities";
import { CopyButton } from "@/components/CopyButton";
import { GiftCode, listGiftCodes, deleteGiftCode, adminCoinTopUp, type CoinTransaction, type PaymentMethodConfig, listPaymentMethods, updatePaymentMethod, type SPackage, type SGemPackage, type LLMTokenPackage, listSPackages, getSPackage, getSGemPackage, listLLMTokenPackages, getLLMTokenPackage, createLLMTokenPackage, updateLLMTokenPackage, createSPackage, updateSPackage, deleteSPackage, createSGemPackage, updateSGemPackage, deleteSGemPackage, listSGemPackagesAdmin, listAdminTransactions, manuallyCreditTransaction, manuallyRejectTransaction, type AdminTransaction, type AdminTransactionStatus, } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { formatISODate, fromUserDatetime, getUserTimezone, toUserDatetime } from "@/lib/utils/date-utils";
const LIMIT = 20;
// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------
type StatusFilter = AdminTransactionStatus | "";
const TX_STATUS_COLORS: Record<AdminTransactionStatus, string> = {
    pending: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    credit_failed: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    awaiting_payment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};
function TxStatusBadge({ status }: {
    status: AdminTransactionStatus;
}) {
    const { t } = useTranslation();
    const labelKey = `adminTransactions.status${status.split("_").map((s) => s[0].toUpperCase() + s.slice(1)).join("")}` as string;
    return (<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TX_STATUS_COLORS[status] ?? ""}`}>
      {t(labelKey)}
    </span>);
}
function formatTxAmount(amount: number, currency: string) {
    if (currency === "VND")
        return amount.toLocaleString("vi-VN") + " ₫";
    try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
    }
    catch {
        return `${(amount / 100).toFixed(2)} ${currency}`;
    }
}
const TX_LIMIT = 50;
// ---------------------------------------------------------------------------
// Package info fetcher (with module-level cache)
// ---------------------------------------------------------------------------
const pkgCache = new Map<string, SPackage>();
const sgemPkgCache = new Map<string, SGemPackage>();
function PackageInfoRow({ packageId, currencyType }: {
    packageId: string | null | undefined;
    currencyType: "sgem" | "scoin";
}) {
    const isSGem = currencyType === "sgem";
    const [scoinPkg, setScoinPkg] = useState<SPackage | null>(() => (!isSGem && packageId ? pkgCache.get(packageId) : undefined) ?? null);
    const [sgemPkg, setSGemPkg] = useState<SGemPackage | null>(() => (isSGem && packageId ? sgemPkgCache.get(packageId) : undefined) ?? null);
    const [loading, setLoading] = useState(!!packageId && (isSGem ? !sgemPkgCache.has(packageId) : !pkgCache.has(packageId)));
    useEffect(() => {
        if (!packageId)
            return;
        if (isSGem) {
            if (sgemPkgCache.has(packageId))
                return;
            getSGemPackage(packageId)
                .then((p) => { sgemPkgCache.set(packageId, p); setSGemPkg(p); })
                .catch(() => { })
                .finally(() => setLoading(false));
        }
        else {
            if (pkgCache.has(packageId))
                return;
            getSPackage(packageId)
                .then((p) => { pkgCache.set(packageId, p); setScoinPkg(p); })
                .catch(() => { })
                .finally(() => setLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const pkg = isSGem ? sgemPkg : scoinPkg;
    return (<div id="tx-package-info-row" className="space-y-0.5 sm:col-span-2 lg:col-span-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Package</p>
      {loading ? (<Skeleton className="h-4 w-48"/>) : pkg ? (<div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="font-medium">{pkg.name}</span>
          <span className="text-muted-foreground font-mono">{pkg.package_key}</span>
          {isSGem
                ? <span>💎 {(sgemPkg as SGemPackage).sgem_amount.toLocaleString()}</span>
                : <span>🪙 {(scoinPkg as SPackage).scoin_amount.toLocaleString()}{(scoinPkg as SPackage).bonus_scoin > 0 ? <span className="text-green-500 ml-1">+{(scoinPkg as SPackage).bonus_scoin.toLocaleString()} bonus</span> : null}</span>}
          <span className="font-semibold">{formatTxAmount(pkg.price_amount, pkg.price_currency)}</span>
        </div>) : (<p className="font-mono text-xs text-muted-foreground break-all">{packageId}</p>)}
    </div>);
}
// ---------------------------------------------------------------------------
// Manually Credit Button (inline in expanded row)
// ---------------------------------------------------------------------------
function ManuallyCreditButton({ txId, onSuccess }: {
    txId: string;
    onSuccess: () => void;
}) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("Thank you for your payment. We have manually credited your sCoin balance.");
    const [submitting, setSubmitting] = useState(false);
    async function handleConfirm() {
        if (!reason.trim())
            return;
        setSubmitting(true);
        try {
            await manuallyCreditTransaction(txId, reason.trim());
            toast({ title: "Manually credited successfully." });
            setOpen(false);
            setReason("");
            onSuccess();
        }
        catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to manually credit.";
            toast({ variant: "destructive", title: msg });
        }
        finally {
            setSubmitting(false);
        }
    }
    return (<>
      <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        Manually Credit
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Manually Credit Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              This will force-credit sCoin for transaction <span className="font-mono text-xs break-all">{txId}</span>. Provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea className="mt-2 min-h-[80px]" placeholder="e.g. coin service timeout, confirmed payment with provider…" value={reason} onChange={(e) => setReason(e.target.value)}/>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!reason.trim() || submitting} onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
</AlertDialog>
    </>);
}
function ManuallyRejectButton({ txId, onSuccess }: {
    txId: string;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(t("adminTransactions.rejectInitialReason"));
    const [submitting, setSubmitting] = useState(false);
    async function handleConfirm() {
        if (!reason.trim())
            return;
        setSubmitting(true);
        try {
            await manuallyRejectTransaction(txId, reason.trim());
            toast({ title: t("adminTransactions.rejectSuccess") });
            setOpen(false);
            setReason(t("adminTransactions.rejectInitialReason"));
            onSuccess();
        }
        catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t("adminTransactions.rejectFailed");
            toast({ variant: "destructive", title: msg });
        }
        finally {
            setSubmitting(false);
        }
    }
    return (<>
      <Button id={`tx-manually-reject-button-${txId}`} size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        {t("adminTransactions.reject")}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent id={`tx-manually-reject-dialog-content-${txId}`} onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader id={`tx-manually-reject-dialog-header-${txId}`}>
            <AlertDialogTitle id={`tx-manually-reject-dialog-title-${txId}`}>{t("adminTransactions.rejectTitle")}</AlertDialogTitle>
            <AlertDialogDescription id={`tx-manually-reject-dialog-description-${txId}`}>
              {t("adminTransactions.rejectDesc").replace("{id}", txId)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea id={`tx-manually-reject-dialog-reason-${txId}`} className="mt-2 min-h-[80px]" placeholder={t("adminTransactions.rejectPlaceholder")} value={reason} onChange={(e) => setReason(e.target.value)}/>
          <AlertDialogFooter id={`tx-manually-reject-dialog-footer-${txId}`} className="mt-2">
            <AlertDialogCancel id={`tx-manually-reject-dialog-cancel-${txId}`} disabled={submitting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction id={`tx-manually-reject-dialog-confirm-${txId}`} disabled={!reason.trim() || submitting} onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>);
}
// ---------------------------------------------------------------------------
// Status logic
// ---------------------------------------------------------------------------
type GiftCodeStatus = "Draft" | "Scheduled" | "Expired" | "Exhausted" | "Active";
function getStatus(gc: GiftCode): GiftCodeStatus {
    const now = new Date();
    if (!gc.active_at)
        return "Draft";
    if (new Date(gc.active_at) > now)
        return "Scheduled";
    if (gc.expires_at && new Date(gc.expires_at) < now)
        return "Expired";
    if (gc.max_uses !== -1 && gc.used_count >= gc.max_uses)
        return "Exhausted";
    return "Active";
}
const STATUS_CLASSES: Record<GiftCodeStatus, string> = {
    Draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    Scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    Expired: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    Exhausted: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    Active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};
function StatusBadge({ gc }: {
    gc: GiftCode;
}) {
    const { t } = useTranslation();
    const status = getStatus(gc);
    const STATUS_LABELS: Record<GiftCodeStatus, string> = {
        Draft: t('adminGiftCodes.statusDraft'),
        Scheduled: t('adminGiftCodes.statusScheduled'),
        Expired: t('adminGiftCodes.statusExpired'),
        Exhausted: t('adminGiftCodes.statusExhausted'),
        Active: t('adminGiftCodes.statusActive'),
    };
    return (<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>);
}
function formatDt(iso: string | null, neverLabel = "Never") {
    if (!iso)
        return neverLabel;
    return new Date(iso).toLocaleString(undefined, {
        timeZone: getUserTimezone(),
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function usesLabel(max_uses: number, unlimitedLabel = "\u221e Unlimited", singleLabel = "1 (single)") {
    if (max_uses === -1)
        return unlimitedLabel;
    if (max_uses === 1)
        return singleLabel;
    return String(max_uses);
}
// ---------------------------------------------------------------------------
// Payment method icon helper
// ---------------------------------------------------------------------------
function MethodIcon({ providerKey, iconUrl }: {
    providerKey: string;
    iconUrl?: string;
}) {
    if (iconUrl) {
        return <img src={iconUrl} alt={providerKey} className="h-7 w-7 object-contain"/>;
    }
    if (providerKey === "bank_transfer_vn")
        return <Building2 className="h-5 w-5"/>;
    return <CreditCard className="h-5 w-5"/>;
}
// ---------------------------------------------------------------------------
// Edit Payment Method Dialog
// ---------------------------------------------------------------------------
interface EditMethodDialogProps {
    method: PaymentMethodConfig | null;
    open: boolean;
    onClose: () => void;
    onSaved: (updated: PaymentMethodConfig) => void;
}
function EditMethodDialog({ method, open, onClose, onSaved }: EditMethodDialogProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [displayName, setDisplayName] = useState("");
    const [description, setDescription] = useState("");
    const [iconUrl, setIconUrl] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [supportsSubscription, setSupportsSubscription] = useState(false);
    const [webhookSuffix, setWebhookSuffix] = useState("");
    const [configJson, setConfigJson] = useState("{}");
    const [configError, setConfigError] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (method) {
            setDisplayName(method.display_name);
            setDescription(method.description);
            setIconUrl(method.icon_url ?? "");
            setIsActive(method.is_active);
            setSupportsSubscription(method.supports_subscription);
            setWebhookSuffix(method.webhook_endpoint_suffix ?? "");
            setConfigJson(JSON.stringify(method.config ?? {}, null, 2));
            setConfigError("");
            setSortOrder(String(method.sort_order));
        }
    }, [method]);
    function validateConfig(val: string) {
        try {
            JSON.parse(val);
            setConfigError("");
        }
        catch {
            setConfigError(t('adminPayments.configInvalid'));
        }
    }
    async function handleSave() {
        if (!method)
            return;
        let parsedConfig: Record<string, unknown> = {};
        try {
            parsedConfig = JSON.parse(configJson);
        }
        catch {
            setConfigError(t('adminPayments.configInvalid'));
            return;
        }
        setSaving(true);
        try {
            const updated = await updatePaymentMethod(method.id, {
                display_name: displayName.trim(),
                description: description.trim(),
                icon_url: iconUrl.trim(),
                is_active: isActive,
                supports_subscription: supportsSubscription,
                webhook_endpoint_suffix: webhookSuffix.trim(),
                config: parsedConfig,
                sort_order: parseInt(sortOrder, 10) || 0,
            });
            toast({ title: t('adminPayments.saveSuccess') });
            onSaved(updated);
            onClose();
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('adminPayments.saveFailed'), description: err?.data?.error ?? err?.message });
        }
        finally {
            setSaving(false);
        }
    }
    return (<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{t('adminPayments.editTitle')}</SheetTitle>
          <SheetDescription className="font-mono text-xs">{method?.provider_key}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-display-name">{t('adminPayments.fieldDisplayName')}</Label>
            <Input id="edit-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={saving}/>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">{t('adminPayments.fieldDescription')}</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} rows={3} className="resize-none"/>
          </div>

          {/* Icon URL */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-icon-url">{t('adminPayments.fieldIconUrl')}</Label>
            <div className="flex gap-2">
              <Input id="edit-icon-url" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} disabled={saving} placeholder="https://cdn.example.com/icons/method.png"/>
              {iconUrl && (<img src={iconUrl} alt="icon preview" className="h-9 w-9 flex-shrink-0 rounded border object-contain p-1"/>)}
            </div>
          </div>

          {/* Webhook Suffix */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-webhook">{t('adminPayments.fieldWebhookSuffix')}</Label>
            <Input id="edit-webhook" value={webhookSuffix} onChange={(e) => setWebhookSuffix(e.target.value)} disabled={saving} placeholder="/webhooks/payment/method_key" className="font-mono text-sm"/>
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-sort-order">{t('adminPayments.fieldSortOrder')}</Label>
            <Input id="edit-sort-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={saving}/>
          </div>

          {/* Toggles */}
          <div className="rounded-lg border bg-muted/40 divide-y">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t('adminPayments.fieldIsActive')}</p>
                <p className="text-xs text-muted-foreground">{t('adminPayments.fieldIsActiveDesc')}</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={saving}/>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t('adminPayments.fieldSupportsSubscription')}</p>
                <p className="text-xs text-muted-foreground">{t('adminPayments.fieldSupportsSubscriptionDesc')}</p>
              </div>
              <Switch checked={supportsSubscription} onCheckedChange={setSupportsSubscription} disabled={saving}/>
            </div>
          </div>

          {/* Config JSON */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-config">{t('adminPayments.fieldConfig')}</Label>
            <Textarea id="edit-config" value={configJson} onChange={(e) => { setConfigJson(e.target.value); validateConfig(e.target.value); }} disabled={saving} rows={5} spellCheck={false} className="font-mono text-xs resize-none"/>
            {configError && <p className="text-xs text-destructive">{configError}</p>}
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !displayName.trim() || !!configError}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {t('common.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>);
}
// ---------------------------------------------------------------------------
// Sortable payment method card
// ---------------------------------------------------------------------------
interface SortableMethodCardProps {
    method: PaymentMethodConfig;
    toggling: string | null;
    onToggle: (method: PaymentMethodConfig) => void;
    onEdit: (method: PaymentMethodConfig) => void;
}
function SortableMethodCard({ method, toggling, onToggle, onEdit }: SortableMethodCardProps) {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: method.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 10 : undefined,
    };
    return (<div ref={setNodeRef} style={style}>
      <Card className={method.is_active ? "" : "opacity-60"}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0" aria-label="Drag to reorder" tabIndex={0}>
              <GripVertical className="h-5 w-5"/>
            </button>

            {/* Icon */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm">
              <MethodIcon providerKey={method.provider_key} iconUrl={method.icon_url}/>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{method.display_name}</p>
                <Badge variant="outline" className="text-xs font-mono">{method.provider_key}</Badge>
                {method.supports_subscription && (<Badge variant="secondary" className="text-xs">{t('payment.supportsSubscription')}</Badge>)}
                <Badge variant={method.is_active ? "default" : "secondary"} className="text-xs">
                  {method.is_active ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{method.description}</p>
              <p className="text-xs text-muted-foreground">
                {t('adminPayments.sortOrder')}: {method.sort_order}
                {method.webhook_endpoint_suffix && (<span className="ml-3 font-mono">{method.webhook_endpoint_suffix}</span>)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                {toggling === method.id ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<Switch checked={method.is_active} onCheckedChange={() => onToggle(method)} aria-label="Toggle active"/>)}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(method)}>
                <Pencil className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);
}
// ---------------------------------------------------------------------------
// Payment Methods tab
// ---------------------------------------------------------------------------
function PaymentMethodsTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<PaymentMethodConfig | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const [reordering, setReordering] = useState(false);
    const canReorder = true;
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listPaymentMethods();
            setMethods((res.methods ?? []).sort((a, b) => a.sort_order - b.sort_order));
        }
        catch {
            toast({ variant: "destructive", title: t('adminPayments.loadFailed') });
        }
        finally {
            setLoading(false);
        }
    }, [toast]);
    useEffect(() => { load(); }, [load]);
    async function handleToggle(method: PaymentMethodConfig) {
        setToggling(method.id);
        try {
            const updated = await updatePaymentMethod(method.id, { is_active: !method.is_active });
            setMethods((prev) => prev.map((m) => m.id === updated.id ? updated : m));
            toast({ title: updated.is_active ? t('adminPayments.enabledSuccess') : t('adminPayments.disabledSuccess') });
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('adminPayments.toggleFailed'), description: err?.data?.error ?? err?.message });
        }
        finally {
            setToggling(null);
        }
    }
    function handleSaved(updated: PaymentMethodConfig) {
        setMethods((prev) => prev.map((m) => m.id === updated.id ? updated : m).sort((a, b) => a.sort_order - b.sort_order));
    }
    async function handleDragEnd(event: DragEndEvent) {
        if (!canReorder)
            return;
        const { active, over } = event;
        if (!over || active.id === over.id)
            return;
        const oldIndex = methods.findIndex((m) => m.id === active.id);
        const newIndex = methods.findIndex((m) => m.id === over.id);
        if (oldIndex === -1 || newIndex === -1)
            return;
        const reordered = arrayMove(methods, oldIndex, newIndex);
        // Assign new sort_order values based on new positions
        const updated = reordered.map((m, i) => ({ ...m, sort_order: i + 1 }));
        setMethods(updated);
        // Persist only the methods whose sort_order changed
        setReordering(true);
        try {
            const changed = updated.filter((m, i) => methods[i]?.id !== m.id || methods.find((o) => o.id === m.id)?.sort_order !== m.sort_order);
            await Promise.all(changed.map((m) => updatePaymentMethod(m.id, { sort_order: m.sort_order })));
            toast({ title: t('adminPayments.sortOrderUpdated') });
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('adminPayments.sortOrderFailed'), description: err?.data?.error ?? err?.message });
            load(); // reload to get server state
        }
        finally {
            setReordering(false);
        }
    }
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {methods.length} {t('adminPayments.methodsTotal')}
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading || reordering}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
          {t('adminGiftCodes.refresh')}
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (Array.from({ length: 2 }).map((_, i) => (<Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl"/>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48"/>
                    <Skeleton className="h-3 w-72"/>
                  </div>
                  <Skeleton className="h-8 w-20"/>
                </div>
              </CardContent>
            </Card>))) : methods.length === 0 ? (<Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t('adminPayments.noMethods')}
            </CardContent>
          </Card>) : (<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={methods.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              {methods.map((method) => (<SortableMethodCard key={method.id} method={method} toggling={toggling} onToggle={handleToggle} onEdit={setEditTarget}/>))}
            </SortableContext>
          </DndContext>)}
      </div>
      {reordering && (<p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin"/>
          {t('adminPayments.savingOrder')}
        </p>)}

      <EditMethodDialog method={editTarget} open={!!editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved}/>
    </div>);
}
// ---------------------------------------------------------------------------
// Package Form Sheet (Create / Edit)
// ---------------------------------------------------------------------------
interface PackageSheetProps {
    pkg: SPackage | null; // null = create mode
    open: boolean;
    onClose: () => void;
    onSaved: (pkg: SPackage) => void;
}
function PackageSheet({ pkg, open, onClose, onSaved }: PackageSheetProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const isEdit = !!pkg;
    const [packageKey, setPackageKey] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [scoinAmount, setScoinAmount] = useState("");
    const [bonusScoin, setBonusScoin] = useState("0");
    const [priceAmount, setPriceAmount] = useState("");
    const [priceCurrency, setPriceCurrency] = useState("USD");
    const [sortOrder, setSortOrder] = useState("1");
    const [isActive, setIsActive] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);
    const [metadataJson, setMetadataJson] = useState("{}");
    const [metadataError, setMetadataError] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (open) {
            if (pkg) {
                setPackageKey(pkg.package_key);
                setName(pkg.name);
                setDescription(pkg.description);
                setScoinAmount(String(pkg.scoin_amount));
                setBonusScoin(String(pkg.bonus_scoin));
                setPriceAmount(String(pkg.price_amount));
                setPriceCurrency(pkg.price_currency);
                setSortOrder(String(pkg.sort_order));
                setIsActive(pkg.is_active);
                setIsFeatured(pkg.is_featured);
                setMetadataJson(JSON.stringify(pkg.metadata ?? {}, null, 2));
                setMetadataError("");
            }
            else {
                setPackageKey("");
                setName("");
                setDescription("");
                setScoinAmount("");
                setBonusScoin("0");
                setPriceAmount("");
                setPriceCurrency("USD");
                setSortOrder("1");
                setIsActive(true);
                setIsFeatured(false);
                setMetadataJson("{}");
                setMetadataError("");
            }
        }
    }, [open, pkg]);
    function validateMeta(val: string) {
        try {
            JSON.parse(val);
            setMetadataError("");
        }
        catch {
            setMetadataError(t('adminPackages.metadataInvalid'));
        }
    }
    async function handleSave() {
        let parsedMeta: Record<string, unknown> = {};
        try {
            parsedMeta = JSON.parse(metadataJson);
        }
        catch {
            setMetadataError(t('adminPackages.metadataInvalid'));
            return;
        }
        setSaving(true);
        try {
            let saved: SPackage;
            if (isEdit && pkg) {
                saved = await updateSPackage(pkg.id, {
                    name: name.trim(),
                    description: description.trim(),
                    scoin_amount: parseInt(scoinAmount, 10) || 0,
                    bonus_scoin: parseInt(bonusScoin, 10) || 0,
                    price_amount: parseInt(priceAmount, 10) || 0,
                    price_currency: priceCurrency.trim(),
                    is_active: isActive,
                    is_featured: isFeatured,
                    sort_order: parseInt(sortOrder, 10) || 0,
                    metadata: parsedMeta,
                });
            }
            else {
                saved = await createSPackage({
                    package_key: packageKey.trim(),
                    name: name.trim(),
                    description: description.trim(),
                    scoin_amount: parseInt(scoinAmount, 10) || 0,
                    bonus_scoin: parseInt(bonusScoin, 10) || 0,
                    price_amount: parseInt(priceAmount, 10) || 0,
                    price_currency: priceCurrency.trim(),
                    is_active: isActive,
                    is_featured: isFeatured,
                    sort_order: parseInt(sortOrder, 10) || 0,
                    metadata: parsedMeta,
                });
            }
            toast({ title: t('adminPackages.saveSuccess') });
            onSaved(saved);
            onClose();
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('adminPackages.saveFailed'), description: err?.data?.error ?? err?.message });
        }
        finally {
            setSaving(false);
        }
    }
    const isFormValid = !!(name.trim() && (isEdit || packageKey.trim()) && scoinAmount && priceAmount && !metadataError);
    return (<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{isEdit ? t('adminPackages.editTitle') : t('adminPackages.createTitle')}</SheetTitle>
          {isEdit && <SheetDescription className="font-mono text-xs">{pkg?.package_key}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Package Key – only on create */}
          {!isEdit && (<div className="space-y-1.5">
              <Label htmlFor="pkg-key">{t('adminPackages.fieldPackageKey')}</Label>
              <Input id="pkg-key" value={packageKey} onChange={(e) => setPackageKey(e.target.value)} disabled={saving} placeholder={t('adminPackages.fieldPackageKeyHint')} className="font-mono"/>
            </div>)}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-name">{t('adminPackages.fieldName')}</Label>
            <Input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving}/>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-desc">{t('adminPackages.fieldDescription')}</Label>
            <Textarea id="pkg-desc" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} rows={2} className="resize-none"/>
          </div>

          {/* sCoin + Bonus */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-scoin">{t('adminPackages.fieldSCoinAmount')}</Label>
              <Input id="pkg-scoin" type="number" min={0} value={scoinAmount} onChange={(e) => setScoinAmount(e.target.value)} disabled={saving}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-bonus">{t('adminPackages.fieldBonusSCoin')}</Label>
              <Input id="pkg-bonus" type="number" min={0} value={bonusScoin} onChange={(e) => setBonusScoin(e.target.value)} disabled={saving}/>
            </div>
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-price">{t('adminPackages.fieldPriceAmount')}</Label>
              <Input id="pkg-price" type="number" min={0} value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} disabled={saving}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-currency">{t('adminPackages.fieldPriceCurrency')}</Label>
              <Input id="pkg-currency" value={priceCurrency} onChange={(e) => setPriceCurrency(e.target.value.toUpperCase())} disabled={saving} placeholder="USD" className="font-mono"/>
            </div>
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-sort">{t('adminPackages.fieldSortOrder')}</Label>
            <Input id="pkg-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={saving}/>
          </div>

          {/* Toggles */}
          <div className="rounded-lg border bg-muted/40 divide-y">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t('adminPackages.fieldIsActive')}</p>
                <p className="text-xs text-muted-foreground">{t('adminPackages.fieldIsActiveDesc')}</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={saving}/>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t('adminPackages.fieldIsFeatured')}</p>
                <p className="text-xs text-muted-foreground">{t('adminPackages.fieldIsFeaturedDesc')}</p>
              </div>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} disabled={saving}/>
            </div>
          </div>

          {/* Metadata JSON */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-meta">{t('adminPackages.fieldMetadata')}</Label>
            <Textarea id="pkg-meta" value={metadataJson} onChange={(e) => { setMetadataJson(e.target.value); validateMeta(e.target.value); }} disabled={saving} rows={3} spellCheck={false} className="font-mono text-xs resize-none"/>
            {metadataError && <p className="text-xs text-destructive">{metadataError}</p>}
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !isFormValid}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {t('common.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>);
}
// ---------------------------------------------------------------------------
// Packages tab
// ---------------------------------------------------------------------------
function PackagesTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [packages, setPackages] = useState<SPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<SPackage | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SPackage | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toggling, setToggling] = useState<string | null>(null);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listSPackages();
            setPackages((res.packages ?? []).sort((a, b) => a.sort_order - b.sort_order));
        }
        catch {
            toast({ variant: "destructive", title: t('adminPackages.loadFailed') });
        }
        finally {
            setLoading(false);
        }
    }, [toast]);
    useEffect(() => { load(); }, [load]);
    function openCreate() {
        setEditTarget(null);
        setSheetOpen(true);
    }
    function openEdit(pkg: SPackage) {
        setEditTarget(pkg);
        setSheetOpen(true);
    }
    function handleSaved(saved: SPackage) {
        setPackages((prev) => {
            const idx = prev.findIndex((p) => p.id === saved.id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = saved;
                return next.sort((a, b) => a.sort_order - b.sort_order);
            }
            return [...prev, saved].sort((a, b) => a.sort_order - b.sort_order);
        });
    }
    async function handleDelete() {
        if (!deleteTarget)
            return;
        setDeleting(true);
        try {
            await deleteSPackage(deleteTarget.id);
            toast({ title: t('adminPackages.deleteSuccess') });
            setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
            setDeleteTarget(null);
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('adminPackages.deleteFailed'), description: err?.data?.error ?? err?.message });
        }
        finally {
            setDeleting(false);
        }
    }
    async function handleToggle(pkg: SPackage) {
        setToggling(pkg.id);
        try {
            const updated = await updateSPackage(pkg.id, { is_active: !pkg.is_active });
            setPackages((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('adminPackages.saveFailed'), description: err?.data?.error ?? err?.message });
        }
        finally {
            setToggling(null);
        }
    }
    return (<div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('adminPackages.totalPackages').replace('{n}', String(packages.length))}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4"/>
            {t('adminPackages.btnCreate')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminPackages.colName')}</TableHead>
                <TableHead>{t('adminPackages.colSCoin')}</TableHead>
                <TableHead>{t('adminPackages.colPrice')}</TableHead>
                <TableHead>{t('adminPackages.colFeatured')}</TableHead>
                <TableHead>{t('adminPackages.colStatus')}</TableHead>
                <TableHead className="text-right">{t('adminPackages.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full"/></TableCell>))}
                  </TableRow>))) : packages.length === 0 ? (<TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    {t('adminPackages.noPackages')}
                  </TableCell>
                </TableRow>) : (packages.map((pkg) => (<TableRow key={pkg.id} className={pkg.is_active ? "" : "opacity-60"}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{pkg.package_key}</p>
                        {pkg.description && (<p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pkg.description}</p>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-semibold">🪙 {pkg.scoin_amount.toLocaleString()}</span>
                        {pkg.bonus_scoin > 0 && (<span className="ml-1.5 text-xs text-green-600 dark:text-green-400">+{pkg.bonus_scoin.toLocaleString()}</span>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {(pkg.price_amount / 100).toFixed(2)} {pkg.price_currency}
                      </span>
                    </TableCell>
                    <TableCell>
                      {pkg.is_featured ? (<Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>) : (<Star className="h-4 w-4 text-muted-foreground/30"/>)}
                    </TableCell>
                    <TableCell>
                      {toggling === pkg.id ? (<Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>) : (<Switch checked={pkg.is_active} onCheckedChange={() => handleToggle(pkg)} aria-label="Toggle active"/>)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pkg)}>
                          <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(pkg)}>
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet */}
      <PackageSheet pkg={editTarget} open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={handleSaved}/>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminPackages.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('adminPackages.deleteDesc').replace('{key}', deleteTarget?.package_key ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);
}
// ---------------------------------------------------------------------------
// sGem Package Form Sheet (Create / Edit)
// ---------------------------------------------------------------------------
interface SGemPackageSheetProps {
    pkg: SGemPackage | null;
    open: boolean;
    onClose: () => void;
    onSaved: (pkg: SGemPackage) => void;
}
function SGemPackageSheet({ pkg, open, onClose, onSaved }: SGemPackageSheetProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const isEdit = !!pkg;
    const [packageKey, setPackageKey] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [sgemAmount, setSgemAmount] = useState("");
    const [priceAmount, setPriceAmount] = useState("");
    const [priceCurrency, setPriceCurrency] = useState("USD");
    const [pricesJson, setPricesJson] = useState("{}");
    const [pricesError, setPricesError] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [availableFrom, setAvailableFrom] = useState("");
    const [availableUntil, setAvailableUntil] = useState("");
    const [sortOrder, setSortOrder] = useState("0");
    const [metadataJson, setMetadataJson] = useState("{}");
    const [metadataError, setMetadataError] = useState("");
    const [saving, setSaving] = useState(false);
    function isPositiveInteger(value: string) {
        const parsed = Number.parseInt(value, 10);
        return Number.isInteger(parsed) && parsed > 0;
    }
    useEffect(() => {
        if (!open)
            return;
        if (pkg) {
            setPackageKey(pkg.package_key);
            setName(pkg.name);
            setDescription(pkg.description);
            setSgemAmount(String(pkg.sgem_amount));
            setPriceAmount(String(pkg.price_amount));
            setPriceCurrency(pkg.price_currency || "USD");
            setPricesJson(JSON.stringify(pkg.prices ?? {}, null, 2));
            setPricesError("");
            setIsActive(pkg.is_active);
            setAvailableFrom(toUserDatetime(pkg.available_from));
            setAvailableUntil(toUserDatetime(pkg.available_until));
            setSortOrder(String(pkg.sort_order));
            setMetadataJson(JSON.stringify(pkg.metadata ?? {}, null, 2));
            setMetadataError("");
        }
        else {
            setPackageKey("");
            setName("");
            setDescription("");
            setSgemAmount("");
            setPriceAmount("");
            setPriceCurrency("USD");
            setPricesJson("{}");
            setPricesError("");
            setIsActive(true);
            setAvailableFrom("");
            setAvailableUntil("");
            setSortOrder("0");
            setMetadataJson("{}");
            setMetadataError("");
        }
    }, [open, pkg]);
    function validateJson(value: string, mode: "prices" | "metadata") {
        try {
            const parsed = JSON.parse(value);
            if (mode === "prices") {
                if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
                    setPricesError(t("adminSGemPackages.pricesInvalid"));
                    return false;
                }
                for (const amount of Object.values(parsed as Record<string, unknown>)) {
                    const num = Number.parseInt(String(amount), 10);
                    if (!Number.isInteger(num) || num <= 0) {
                        setPricesError(t("adminSGemPackages.pricesInvalid"));
                        return false;
                    }
                }
                setPricesError("");
            }
            else {
                if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
                    setMetadataError(t("adminSGemPackages.metadataInvalid"));
                    return false;
                }
                setMetadataError("");
            }
            return true;
        }
        catch {
            if (mode === "prices")
                setPricesError(t("adminSGemPackages.pricesInvalid"));
            else
                setMetadataError(t("adminSGemPackages.metadataInvalid"));
            return false;
        }
    }
    async function handleSave() {
        if (!name.trim() || (!isEdit && !packageKey.trim()) || !isPositiveInteger(sgemAmount) || !isPositiveInteger(priceAmount) || !priceCurrency.trim()) {
            return;
        }
        let parsedPrices: Record<string, number> = {};
        let parsedMetadata: Record<string, unknown> = {};
        try {
            parsedPrices = JSON.parse(pricesJson);
            parsedMetadata = JSON.parse(metadataJson);
            if (parsedPrices == null || typeof parsedPrices !== "object" || Array.isArray(parsedPrices)) {
                setPricesError(t("adminSGemPackages.pricesInvalid"));
                return;
            }
            if (parsedMetadata == null || typeof parsedMetadata !== "object" || Array.isArray(parsedMetadata)) {
                setMetadataError(t("adminSGemPackages.metadataInvalid"));
                return;
            }
            for (const amount of Object.values(parsedPrices)) {
                const num = Number.parseInt(String(amount), 10);
                if (!Number.isInteger(num) || num <= 0) {
                    setPricesError(t("adminSGemPackages.pricesInvalid"));
                    return;
                }
            }
        }
        catch {
            setPricesError(t("adminSGemPackages.pricesInvalid"));
            setMetadataError(t("adminSGemPackages.metadataInvalid"));
            return;
        }
        setSaving(true);
        try {
            const body = {
                ...(isEdit ? {} : { package_key: packageKey.trim() }),
                name: name.trim(),
                description: description.trim(),
                sgem_amount: Number.parseInt(sgemAmount, 10) || 0,
                price_amount: Number.parseInt(priceAmount, 10) || 0,
                price_currency: priceCurrency.trim().toUpperCase(),
                prices: parsedPrices,
                is_active: isActive,
                available_from: availableFrom ? fromUserDatetime(availableFrom) : null,
                available_until: availableUntil ? fromUserDatetime(availableUntil) : null,
                sort_order: Number.parseInt(sortOrder, 10) || 0,
                metadata: parsedMetadata,
            };
            const saved = isEdit && pkg
                ? await updateSGemPackage(pkg.id, body)
                : await createSGemPackage(body as Parameters<typeof createSGemPackage>[0]);
            toast({ title: t("adminSGemPackages.saveSuccess") });
            onSaved(saved);
            onClose();
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t("adminSGemPackages.saveFailed"), description: err?.data?.error ?? err?.message });
        }
        finally {
            setSaving(false);
        }
    }
    const isFormValid = !!(name.trim() &&
        (isEdit || packageKey.trim()) &&
        isPositiveInteger(sgemAmount) &&
        isPositiveInteger(priceAmount) &&
        priceCurrency.trim() &&
        !pricesError &&
        !metadataError);
    return (<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{isEdit ? t("adminSGemPackages.editTitle") : t("adminSGemPackages.createTitle")}</SheetTitle>
          {isEdit && <SheetDescription className="font-mono text-xs">{pkg?.package_key}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!isEdit && (<div className="space-y-1.5">
              <Label htmlFor="sgem-pkg-key">
                {t("adminSGemPackages.fieldPackageKey")} <span className="text-destructive">{t("common.required")}</span>
              </Label>
              <Input id="sgem-pkg-key" value={packageKey} onChange={(e) => setPackageKey(e.target.value)} disabled={saving} placeholder={t("adminSGemPackages.fieldPackageKeyHint")} className="font-mono"/>
            </div>)}

          <div className="space-y-1.5">
            <Label htmlFor="sgem-pkg-name">
              {t("adminSGemPackages.fieldName")} <span className="text-destructive">{t("common.required")}</span>
            </Label>
            <Input id="sgem-pkg-name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving}/>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sgem-pkg-desc">{t("adminSGemPackages.fieldDescription")}</Label>
            <Textarea id="sgem-pkg-desc" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} rows={2} className="resize-none"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sgem-pkg-sgem">
                {t("adminSGemPackages.fieldSGemAmount")} <span className="text-destructive">{t("common.required")}</span>
              </Label>
              <Input id="sgem-pkg-sgem" type="number" min={1} value={sgemAmount} onChange={(e) => setSgemAmount(e.target.value)} disabled={saving}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sgem-pkg-price">
                {t("adminSGemPackages.fieldPriceAmount")} <span className="text-destructive">{t("common.required")}</span>
              </Label>
              <Input id="sgem-pkg-price" type="number" min={1} value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} disabled={saving}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sgem-pkg-currency">
                {t("adminSGemPackages.fieldPriceCurrency")} <span className="text-destructive">{t("common.required")}</span>
              </Label>
              <Input id="sgem-pkg-currency" value={priceCurrency} onChange={(e) => setPriceCurrency(e.target.value.toUpperCase())} disabled={saving} placeholder="USD" className="font-mono"/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sgem-pkg-sort">{t("adminSGemPackages.fieldSortOrder")}</Label>
              <Input id="sgem-pkg-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={saving}/>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sgem-pkg-prices">{t("adminSGemPackages.fieldPrices")}</Label>
            <Textarea id="sgem-pkg-prices" value={pricesJson} onChange={(e) => {
            setPricesJson(e.target.value);
            validateJson(e.target.value, "prices");
        }} disabled={saving} rows={4} spellCheck={false} className="font-mono text-xs resize-none"/>
            {pricesError && <p className="text-xs text-destructive">{pricesError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sgem-pkg-available-from">{t("adminSGemPackages.fieldAvailableFrom")}</Label>
              <Input id="sgem-pkg-available-from" type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} disabled={saving}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sgem-pkg-available-until">{t("adminSGemPackages.fieldAvailableUntil")}</Label>
              <Input id="sgem-pkg-available-until" type="datetime-local" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} disabled={saving}/>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t("adminSGemPackages.fieldIsActive")}</p>
                <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldIsActiveDesc")}</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={saving}/>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sgem-pkg-meta">{t("adminSGemPackages.fieldMetadata")}</Label>
            <Textarea id="sgem-pkg-meta" value={metadataJson} onChange={(e) => {
            setMetadataJson(e.target.value);
            validateJson(e.target.value, "metadata");
        }} disabled={saving} rows={4} spellCheck={false} className="font-mono text-xs resize-none"/>
            {metadataError && <p className="text-xs text-destructive">{metadataError}</p>}
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !isFormValid}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>);
}
// ---------------------------------------------------------------------------
// sGem Package Detail Sheet
// ---------------------------------------------------------------------------
interface SGemPackageDetailSheetProps {
    pkg: SGemPackage | null;
    open: boolean;
    onClose: () => void;
}
function SGemPackageDetailSheet({ pkg, open, onClose }: SGemPackageDetailSheetProps) {
    const { t } = useTranslation();
    return (<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{t("adminSGemPackages.viewTitle")}</SheetTitle>
          <SheetDescription className="font-mono text-xs">{pkg?.package_key}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {pkg ? (<>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldPackageKey")}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm break-all">{pkg.package_key}</p>
                    <CopyButton text={pkg.package_key}/>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">ID</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm break-all">{pkg.id}</p>
                    <CopyButton text={pkg.id}/>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldName")}</p>
                  <p className="text-sm font-medium">{pkg.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldDescription")}</p>
                  <p className="text-sm text-muted-foreground">{pkg.description || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldSGemAmount")}</p>
                  <p className="text-sm font-semibold">{pkg.sgem_amount.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldPriceAmount")}</p>
                  <p className="text-sm font-semibold font-mono">{pkg.price_amount.toLocaleString()} {pkg.price_currency}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldAvailableFrom")}</p>
                  <p className="text-sm">{formatISODate(pkg.available_from)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldAvailableUntil")}</p>
                  <p className="text-sm">{formatISODate(pkg.available_until)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldSortOrder")}</p>
                  <p className="text-sm">{pkg.sort_order}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("adminSGemPackages.fieldIsActive")}</p>
                  <p className="text-sm">{pkg.is_active ? t("common.active") : t("common.inactive")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("adminSGemPackages.fieldPrices")}</p>
                <Textarea readOnly value={JSON.stringify(pkg.prices ?? {}, null, 2)} rows={6} className="font-mono text-xs"/>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("adminSGemPackages.fieldMetadata")}</p>
                <Textarea readOnly value={JSON.stringify(pkg.metadata ?? {}, null, 2)} rows={6} className="font-mono text-xs"/>
              </div>
            </>) : (<p className="text-sm text-muted-foreground">{t("adminSGemPackages.noPackages")}</p>)}
        </div>
      </SheetContent>
    </Sheet>);
}
// ---------------------------------------------------------------------------
// Sortable sGem Package Row
// ---------------------------------------------------------------------------
interface SortableSGemPackageRowProps {
    pkg: SGemPackage;
    togglingId: string | null;
    canDrag: boolean;
    onToggle: (pkg: SGemPackage, nextChecked: boolean) => void;
    onEdit: (pkg: SGemPackage) => void;
    onView: (pkg: SGemPackage) => void;
    onDelete: (pkg: SGemPackage) => void;
}
function SortableSGemPackageRow({ pkg, togglingId, canDrag, onToggle, onEdit, onView, onDelete }: SortableSGemPackageRowProps) {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pkg.id, disabled: !canDrag });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 10 : undefined,
    };
    return (<TableRow ref={setNodeRef} style={style} className={!pkg.is_active ? "opacity-60" : ""}>
      <TableCell className="w-12">
        <button type="button" {...(canDrag ? attributes : {})} {...(canDrag ? listeners : {})} disabled={!canDrag} className={`touch-none transition-colors ${canDrag ? "cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground" : "cursor-not-allowed text-muted-foreground/30"}`} aria-label="Drag to reorder">
          <GripVertical className="h-4 w-4"/>
        </button>
      </TableCell>
      <TableCell className="font-mono text-xs">{pkg.package_key}</TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-sm">{pkg.name}</p>
          {pkg.description && (<p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pkg.description}</p>)}
        </div>
      </TableCell>
      <TableCell className="text-sm font-semibold">{pkg.sgem_amount.toLocaleString()}</TableCell>
      <TableCell className="text-sm font-mono">{pkg.price_amount.toLocaleString()} {pkg.price_currency}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {togglingId === pkg.id ? (<Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>) : (<Switch checked={pkg.is_active} onCheckedChange={(checked) => onToggle(pkg, checked)} aria-label={pkg.is_active ? t("common.active") : t("common.inactive")}/>)}
          <span className="text-xs text-muted-foreground">
            {pkg.is_active ? t("common.active") : t("common.inactive")}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatISODate(pkg.updated_at)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(pkg)}>
            <Search className="h-4 w-4"/>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(pkg)}>
            <Pencil className="h-4 w-4"/>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(pkg)}>
            <Trash2 className="h-4 w-4"/>
          </Button>
        </div>
      </TableCell>
    </TableRow>);
}
// ---------------------------------------------------------------------------
// sGem Packages tab
// ---------------------------------------------------------------------------
function SGemPackagesTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [packages, setPackages] = useState<SGemPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<SGemPackage | null>(null);
    const [viewTarget, setViewTarget] = useState<SGemPackage | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SGemPackage | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [reordering, setReordering] = useState(false);
    const canDrag = search.trim() === "";
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listSGemPackagesAdmin();
            setPackages((res.packages ?? [])
                .filter((pkg) => !pkg.deleted_at)
                .sort((a, b) => a.sort_order - b.sort_order));
        }
        catch {
            toast({ variant: "destructive", title: t("adminSGemPackages.loadFailed") });
        }
        finally {
            setLoading(false);
        }
    }, [toast, t]);
    useEffect(() => {
        load();
    }, [load]);
    const filtered = packages.filter((pkg) => {
        const q = search.trim().toLowerCase();
        if (!q)
            return true;
        return (pkg.package_key.toLowerCase().includes(q) ||
            pkg.name.toLowerCase().includes(q));
    });
    function openCreate() {
        setEditTarget(null);
        setSheetOpen(true);
    }
    function openEdit(pkg: SGemPackage) {
        setEditTarget(pkg);
        setSheetOpen(true);
    }
    function handleSaved(saved: SGemPackage) {
        setPackages((prev) => {
            const idx = prev.findIndex((p) => p.id === saved.id);
            const next = idx >= 0 ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved];
            return next
                .filter((pkg) => !pkg.deleted_at)
                .sort((a, b) => a.sort_order - b.sort_order);
        });
    }
    async function handleDelete() {
        if (!deleteTarget)
            return;
        setDeleting(true);
        try {
            await deleteSGemPackage(deleteTarget.id);
            toast({ title: t("adminSGemPackages.deleteSuccess") });
            setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
            setDeleteTarget(null);
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t("adminSGemPackages.deleteFailed"), description: err?.data?.error ?? err?.message });
        }
        finally {
            setDeleting(false);
        }
    }
    async function handleToggle(pkg: SGemPackage) {
        setTogglingId(pkg.id);
        try {
            const updated = await updateSGemPackage(pkg.id, { is_active: !pkg.is_active });
            setPackages((prev) => prev.map((item) => item.id === updated.id ? updated : item));
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t("adminSGemPackages.saveFailed"), description: err?.data?.error ?? err?.message });
        }
        finally {
            setTogglingId(null);
        }
    }
    async function handleDragEnd(event: DragEndEvent) {
        if (!canDrag)
            return;
        const { active, over } = event;
        if (!over || active.id === over.id)
            return;
        const oldIndex = packages.findIndex((pkg) => pkg.id === active.id);
        const newIndex = packages.findIndex((pkg) => pkg.id === over.id);
        if (oldIndex === -1 || newIndex === -1)
            return;
        const reordered = arrayMove(packages, oldIndex, newIndex);
        const updated = reordered.map((pkg, i) => ({ ...pkg, sort_order: i + 1 }));
        setPackages(updated);
        setReordering(true);
        try {
            const changed = updated.filter((pkg, i) => packages[i]?.id !== pkg.id || packages.find((o) => o.id === pkg.id)?.sort_order !== pkg.sort_order);
            await Promise.all(changed.map((pkg) => updateSGemPackage(pkg.id, { sort_order: pkg.sort_order })));
            toast({ title: t("adminSGemPackages.sortOrderUpdated") });
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t("adminSGemPackages.sortOrderFailed"), description: err?.data?.error ?? err?.message });
            load();
        }
        finally {
            setReordering(false);
        }
    }
    return (<div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("adminSGemPackages.totalPackages").replace("{n}", String(filtered.length))}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("adminSGemPackages.searchPlaceholder")} className="pl-8 w-[280px]"/>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
            {t("adminSGemPackages.refresh")}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4"/>
            {t("adminSGemPackages.btnCreate")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {reordering && (<p className="px-4 pt-3 text-xs text-muted-foreground">
              <Loader2 className="mr-2 inline h-3 w-3 animate-spin"/>
              {t("adminSGemPackages.sortOrderUpdating")}
            </p>)}
          {loading ? (<Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"/>
                  <TableHead>{t("adminSGemPackages.colPackageKey")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colName")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colSGem")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colPrice")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colStatus")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colUpdatedAt")}</TableHead>
                  <TableHead className="text-right">{t("adminSGemPackages.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full"/></TableCell>))}
                  </TableRow>))}
              </TableBody>
            </Table>) : filtered.length === 0 ? (<Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"/>
                  <TableHead>{t("adminSGemPackages.colPackageKey")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colName")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colSGem")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colPrice")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colStatus")}</TableHead>
                  <TableHead>{t("adminSGemPackages.colUpdatedAt")}</TableHead>
                  <TableHead className="text-right">{t("adminSGemPackages.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {t("adminSGemPackages.noPackages")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>) : (<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"/>
                    <TableHead>{t("adminSGemPackages.colPackageKey")}</TableHead>
                    <TableHead>{t("adminSGemPackages.colName")}</TableHead>
                    <TableHead>{t("adminSGemPackages.colSGem")}</TableHead>
                    <TableHead>{t("adminSGemPackages.colPrice")}</TableHead>
                    <TableHead>{t("adminSGemPackages.colStatus")}</TableHead>
                    <TableHead>{t("adminSGemPackages.colUpdatedAt")}</TableHead>
                    <TableHead className="text-right">{t("adminSGemPackages.colActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={filtered.map((pkg) => pkg.id)} strategy={verticalListSortingStrategy}>
                    {filtered.map((pkg) => (<SortableSGemPackageRow key={pkg.id} pkg={pkg} togglingId={togglingId} canDrag={canDrag} onToggle={handleToggle} onEdit={openEdit} onView={setViewTarget} onDelete={setDeleteTarget}/>))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>)}
        </CardContent>
      </Card>

      <SGemPackageSheet pkg={editTarget} open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={handleSaved}/>

      <SGemPackageDetailSheet pkg={viewTarget} open={!!viewTarget} onClose={() => setViewTarget(null)}/>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminSGemPackages.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminSGemPackages.deleteDesc").replace("{key}", deleteTarget?.package_key ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);
}
// ---------------------------------------------------------------------------
// LLM Token Packages Sheet
// ---------------------------------------------------------------------------
interface EditLLMTokenPackageSheetProps {
    pkg: LLMTokenPackage | null;
    mode: "create" | "edit";
    open: boolean;
    onClose: () => void;
    onSaved: (updated: LLMTokenPackage) => void;
}
function EditLLMTokenPackageSheet({ pkg, mode, open, onClose, onSaved }: EditLLMTokenPackageSheetProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [packageKey, setPackageKey] = useState("");
    const [tokens, setTokens] = useState("");
    const [sgemCost, setSgemCost] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [sortOrder, setSortOrder] = useState("");
    const [formError, setFormError] = useState("");
    const [costError, setCostError] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!pkg) {
            setPackageKey("");
            setTokens("");
            setSgemCost("");
            setIsActive(true);
            setSortOrder("");
            setFormError("");
            setCostError("");
            return;
        }
        setPackageKey(pkg.package_key);
        setTokens(String(pkg.tokens));
        setSgemCost(String(pkg.sgem_cost));
        setIsActive(pkg.is_active);
        setSortOrder(String(pkg.sort_order));
        setFormError("");
        setCostError("");
    }, [pkg, open]);
    function validateCost(value: string) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            setCostError(t("adminTokenPackages.invalidCost"));
            return false;
        }
        setCostError("");
        return true;
    }
    function validateForm() {
        if (!packageKey.trim()) {
            setFormError(t("adminTokenPackages.invalidPackageKey"));
            return false;
        }
        const parsedTokens = Number.parseInt(tokens, 10);
        if (!Number.isInteger(parsedTokens) || parsedTokens <= 0) {
            setFormError(t("adminTokenPackages.invalidTokens"));
            return false;
        }
        const parsedSort = Number.parseInt(sortOrder, 10);
        if (!Number.isInteger(parsedSort)) {
            setFormError(t("adminTokenPackages.invalidSortOrder"));
            return false;
        }
        if (!validateCost(sgemCost))
            return false;
        setFormError("");
        return true;
    }
    async function handleSave() {
        if (!validateForm())
            return;
        setSaving(true);
        try {
            const payload = {
                package_key: packageKey.trim(),
                tokens: Number.parseInt(tokens, 10),
                sgem_cost: Number.parseInt(sgemCost, 10),
                is_active: isActive,
                sort_order: Number.parseInt(sortOrder, 10),
            };
            const updated = mode === "create"
                ? await createLLMTokenPackage(payload)
                : await updateLLMTokenPackage(pkg!.id, payload);
            toast({ title: mode === "create" ? t("adminTokenPackages.createSuccess") : t("adminTokenPackages.saveSuccess") });
            onSaved(updated);
            onClose();
        }
        catch (err: any) {
            toast({
                variant: "destructive",
                title: mode === "create" ? t("adminTokenPackages.createFailed") : t("adminTokenPackages.saveFailed"),
                description: err?.data?.error ?? err?.message,
            });
        }
        finally {
            setSaving(false);
        }
    }
    return (<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{mode === "create" ? t("adminTokenPackages.createTitle") : t("adminTokenPackages.editTitle")}</SheetTitle>
          <SheetDescription className="font-mono text-xs">{pkg?.package_key ?? ""}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="token-pkg-key">{t("adminTokenPackages.fieldPackageKey")}</Label>
            <Input id="token-pkg-key" value={packageKey} onChange={(e) => setPackageKey(e.target.value)} disabled={saving} className="font-mono"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="token-pkg-tokens">{t("adminTokenPackages.fieldTokens")}</Label>
              <Input id="token-pkg-tokens" type="number" min={1} value={tokens} onChange={(e) => setTokens(e.target.value)} disabled={saving}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="token-pkg-active">{t("adminTokenPackages.fieldIsActive")}</Label>
              <div className="flex h-10 items-center rounded-md border px-3">
                <Switch checked={isActive} onCheckedChange={setIsActive} disabled={saving}/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="token-pkg-sort">{t("adminTokenPackages.fieldSortOrder")}</Label>
              <Input id="token-pkg-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={saving}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="token-pkg-updated">{t("adminTokenPackages.fieldUpdatedAt")}</Label>
              <Input id="token-pkg-updated" value={pkg ? formatDt(pkg.updated_at) : ""} disabled readOnly/>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="token-pkg-cost">{t("adminTokenPackages.fieldSGemCost")}</Label>
            <Input id="token-pkg-cost" type="number" min={1} value={sgemCost} onChange={(e) => {
            setSgemCost(e.target.value);
            validateCost(e.target.value);
        }} disabled={saving} placeholder="50"/>
            {costError && <p className="text-xs text-destructive">{costError}</p>}
            {formError && !costError && <p className="text-xs text-destructive">{formError}</p>}
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>);
}
// ---------------------------------------------------------------------------
// Sortable Token Package Row
// ---------------------------------------------------------------------------
interface SortableTokenPackageRowProps {
    pkg: LLMTokenPackage;
    togglingId: string | null;
    canDrag: boolean;
    onToggle: (pkg: LLMTokenPackage, nextChecked: boolean) => void;
    onEdit: (pkg: LLMTokenPackage) => void;
}
function SortableTokenPackageRow({ pkg, togglingId, canDrag, onToggle, onEdit }: SortableTokenPackageRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pkg.id, disabled: !canDrag });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 10 : undefined,
    };
    return (<TableRow ref={setNodeRef} style={style} className={pkg.is_active ? "" : "opacity-60"}>
      <TableCell className="w-12">
        <button type="button" {...(canDrag ? attributes : {})} {...(canDrag ? listeners : {})} disabled={!canDrag} className={`touch-none transition-colors ${canDrag ? "cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground" : "cursor-not-allowed text-muted-foreground/30"}`} aria-label="Drag to reorder">
          <GripVertical className="h-4 w-4"/>
        </button>
      </TableCell>
      <TableCell>
        <div className="space-y-0.5">
          <p className="font-medium text-sm">{pkg.package_key}</p>
          <p className="text-xs text-muted-foreground font-mono break-all">{pkg.id}</p>
        </div>
      </TableCell>
      <TableCell className="text-sm font-medium">{pkg.tokens.toLocaleString()}</TableCell>
      <TableCell className="text-sm font-semibold">{pkg.sgem_cost.toLocaleString()}</TableCell>
      <TableCell>
        <div className="flex items-center justify-start">
          <Switch checked={pkg.is_active} disabled={togglingId === pkg.id} onCheckedChange={(checked) => onToggle(pkg, checked)} aria-label={pkg.is_active ? "Active" : "Inactive"}/>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatDt(pkg.updated_at)}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(pkg)} disabled={togglingId === pkg.id}>
          <Pencil className="h-4 w-4"/>
        </Button>
      </TableCell>
    </TableRow>);
}
// ---------------------------------------------------------------------------
// LLM Token Packages tab
// ---------------------------------------------------------------------------
function TokenPackagesTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [packages, setPackages] = useState<LLMTokenPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<LLMTokenPackage | null>(null);
    const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [reordering, setReordering] = useState(false);
    const isCreateMode = sheetOpen && !editTarget;
    const canReorder = search.trim() === "";
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listLLMTokenPackages();
            setPackages((res.packages ?? []).sort((a, b) => a.sort_order - b.sort_order));
        }
        catch {
            toast({ variant: "destructive", title: t("adminTokenPackages.loadFailed") });
        }
        finally {
            setLoading(false);
        }
    }, [toast]);
    useEffect(() => { load(); }, [load]);
    const filtered = packages.filter((pkg) => {
        const q = search.trim().toLowerCase();
        if (!q)
            return true;
        return (pkg.package_key.toLowerCase().includes(q) ||
            String(pkg.tokens).includes(q) ||
            String(pkg.sgem_cost).includes(q) ||
            pkg.id.toLowerCase().includes(q));
    });
    async function openEdit(pkg: LLMTokenPackage) {
        setLoadingDetailId(pkg.id);
        try {
            const detail = await getLLMTokenPackage(pkg.id);
            setEditTarget(detail);
            setSheetOpen(true);
        }
        catch {
            toast({ variant: "destructive", title: t("adminTokenPackages.loadFailed") });
        }
        finally {
            setLoadingDetailId(null);
        }
    }
    function handleSaved(updated: LLMTokenPackage) {
        setPackages((prev) => {
            const idx = prev.findIndex((pkg) => pkg.id === updated.id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = updated;
                return next.sort((a, b) => a.sort_order - b.sort_order);
            }
            return [...prev, updated].sort((a, b) => a.sort_order - b.sort_order);
        });
    }
    async function handleToggle(pkg: LLMTokenPackage, nextChecked: boolean) {
        setTogglingId(pkg.id);
        try {
            const updated = await updateLLMTokenPackage(pkg.id, { is_active: nextChecked });
            setPackages((prev) => prev.map((item) => item.id === updated.id ? updated : item).sort((a, b) => a.sort_order - b.sort_order));
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t("adminTokenPackages.saveFailed"), description: err?.data?.error ?? err?.message });
        }
        finally {
            setTogglingId(null);
        }
    }
    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id)
            return;
        const oldIndex = packages.findIndex((pkg) => pkg.id === active.id);
        const newIndex = packages.findIndex((pkg) => pkg.id === over.id);
        if (oldIndex === -1 || newIndex === -1)
            return;
        const reordered = arrayMove(packages, oldIndex, newIndex);
        const updated = reordered.map((pkg, i) => ({ ...pkg, sort_order: i + 1 }));
        setPackages(updated);
        setReordering(true);
        try {
            const changed = updated.filter((pkg, i) => packages[i]?.id !== pkg.id || packages.find((o) => o.id === pkg.id)?.sort_order !== pkg.sort_order);
            await Promise.all(changed.map((pkg) => updateLLMTokenPackage(pkg.id, {
                sort_order: pkg.sort_order,
                package_key: pkg.package_key,
                tokens: pkg.tokens,
                sgem_cost: pkg.sgem_cost,
                is_active: pkg.is_active,
            })));
            toast({ title: t("adminTokenPackages.sortOrderUpdated") });
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t("adminTokenPackages.sortOrderFailed"), description: err?.data?.error ?? err?.message });
            load();
        }
        finally {
            setReordering(false);
        }
    }
    return (<div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("adminTokenPackages.totalPackages").replace("{n}", String(packages.length))}
        </p>
        <div className="flex w-full items-center gap-2 md:w-auto md:flex-1 md:justify-end">
          <div className="relative w-full max-w-sm md:flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input className="pl-8" placeholder={t("adminTokenPackages.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)}/>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading || reordering} aria-label={t("adminTokenPackages.refresh")} title={t("adminTokenPackages.refresh")} className="shrink-0">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
          </Button>
          <Button onClick={() => { setEditTarget(null); setSheetOpen(true); }} className="shrink-0" disabled={reordering}>
            <Plus className="mr-2 h-4 w-4"/>
            {t("adminTokenPackages.btnCreate")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"/>
                  <TableHead>{t("adminTokenPackages.colPackageKey")}</TableHead>
                  <TableHead>{t("adminTokenPackages.colTokens")}</TableHead>
                  <TableHead>{t("adminTokenPackages.colSGemCost")}</TableHead>
                  <TableHead>{t("adminTokenPackages.colStatus")}</TableHead>
                  <TableHead>{t("adminTokenPackages.colUpdatedAt")}</TableHead>
                  <TableHead className="text-right">{t("adminTokenPackages.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full"/></TableCell>))}
                    </TableRow>))) : filtered.length === 0 ? (<TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      {t("adminTokenPackages.noPackages")}
                    </TableCell>
                  </TableRow>) : (<SortableContext items={filtered.map((pkg) => pkg.id)} strategy={verticalListSortingStrategy}>
                    {filtered.map((pkg) => (<SortableTokenPackageRow key={pkg.id} pkg={pkg} togglingId={togglingId} canDrag={canReorder} onToggle={handleToggle} onEdit={openEdit}/>))}
                  </SortableContext>)}
              </TableBody>
            </Table>
          </DndContext>
        </CardContent>
      </Card>

      <EditLLMTokenPackageSheet pkg={editTarget} mode={isCreateMode ? "create" : "edit"} open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={handleSaved}/>
    </div>);
}
// ---------------------------------------------------------------------------
// Transactions Tab
// ---------------------------------------------------------------------------
function TransactionsTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => (searchParams.get("tx_status") as AdminTransactionStatus) ?? "");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchId, setSearchId] = useState(() => searchParams.get("tx_id") ?? "");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const load = useCallback(async (status: StatusFilter, id?: string) => {
        setLoading(true);
        try {
            const res = await listAdminTransactions({
                limit: TX_LIMIT,
                status: status || undefined,
                id: id?.trim() || undefined,
            });
            const txs = res.transactions ?? [];
            setTransactions(txs);
            if (id?.trim() && txs.length === 1)
                setExpandedId(txs[0].id);
        }
        catch {
            toast({ variant: "destructive", title: "Failed to load transactions." });
        }
        finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { load(statusFilter, searchId); }, [load, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps
    function handleSearchChange(value: string) {
        setSearchId(value);
        const params = new URLSearchParams(window.location.search);
        if (value) {
            params.set("tx_id", value);
        }
        else {
            params.delete("tx_id");
        }
        router.replace(`?${params.toString()}`, { scroll: false });
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { load(statusFilter, value); }, 400);
    }
    const STATUS_OPTIONS: {
        value: string;
        label: string;
    }[] = [
        { value: "_all", label: t("adminTransactions.filterAll") },
        { value: "pending", label: t("adminTransactions.filterPending") },
        { value: "awaiting_payment", label: t("adminTransactions.filterAwaitingPayment") },
        { value: "processing", label: t("adminTransactions.filterProcessing") },
        { value: "completed", label: t("adminTransactions.filterCompleted") },
        { value: "failed", label: t("adminTransactions.filterFailed") },
        { value: "rejected", label: t("adminTransactions.filterRejected") },
        { value: "credit_failed", label: t("adminTransactions.filterCreditFailed") },
        { value: "expired", label: t("adminTransactions.filterExpired") },
    ];
    return (<div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{transactions.length} / {TX_LIMIT}</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"/>
            <input type="text" className="flex h-9 w-80 rounded-md border border-input bg-background px-3 py-1 pl-8 pr-7 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono" placeholder="Search transaction ID…" value={searchId} onChange={(e) => handleSearchChange(e.target.value)}/>
            {searchId && (<button type="button" className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => handleSearchChange("")}>
                <X className="h-3.5 w-3.5"/>
              </button>)}
          </div>
          <Select value={statusFilter === "" ? "_all" : statusFilter} onValueChange={(v) => {
            const next = v === "_all" ? "" : v as AdminTransactionStatus;
            setStatusFilter(next);
            const params = new URLSearchParams(window.location.search);
            if (next) {
                params.set("tx_status", next);
            }
            else {
                params.delete("tx_status");
            }
            router.replace(`?${params.toString()}`, { scroll: false });
        }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("adminTransactions.filterAll")}/>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => load(statusFilter)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
          </Button>
        </div>
      </div>

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
                </TableRow>) : (transactions.map((tx) => {
            const isExpanded = expandedId === tx.id;
            return (<Fragment key={tx.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(isExpanded ? null : tx.id)}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>
                    : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>}
                            <div className="font-mono text-xs max-w-[150px]">
                              <span className="truncate block">{tx.id}</span>
                            </div>
                            <CopyButton text={tx.id}/>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-mono text-xs max-w-[140px]">
                            <span className="truncate">{tx.user_id}</span>
                            <CopyButton text={tx.user_id}/>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{tx.provider_key}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatTxAmount(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.currency_type === "sgem" ? "💎" : "🪙"} {tx.currency_amount?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell><TxStatusBadge status={tx.status}/></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString(undefined, {
                    timeZone: getUserTimezone(),
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                })}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (<TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Transaction ID</p>
                                <p className="font-mono text-xs break-all flex items-center gap-1">{tx.id}<CopyButton text={tx.id}/></p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Idempotency Key</p>
                                <p className="font-mono text-xs break-all">{tx.idempotency_key}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">User ID</p>
                                <p className="font-mono text-xs break-all flex items-center gap-1">{tx.user_id}<CopyButton text={tx.user_id}/></p>
                              </div>
                              {tx.currency_package_id && <PackageInfoRow packageId={tx.currency_package_id} currencyType={tx.currency_type}/>}
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Method ID</p>
                                <p className="font-mono text-xs break-all">{tx.payment_method_config_id}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Provider</p>
                                <Badge variant="outline" className="font-mono text-xs">{tx.provider_key}</Badge>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
                                <p className="font-semibold">{formatTxAmount(tx.amount, tx.currency)}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                  {tx.currency_type === "sgem" ? "sGem" : "sCoin"}
                                </p>
                                <p className="font-semibold">
                                  {tx.currency_type === "sgem" ? "💎" : "🪙"} {tx.currency_amount?.toLocaleString() ?? "—"}
                                </p>
                              </div>
                              {tx.currency_credited_at && (<div className="space-y-0.5">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Credited At</p>
                                  <p className="text-xs">{new Date(tx.currency_credited_at).toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                                </div>)}
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                                <TxStatusBadge status={tx.status}/>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Created At</p>
                                <p className="text-xs">{new Date(tx.created_at).toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Updated At</p>
                                <p className="text-xs">{new Date(tx.updated_at).toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                              </div>
                              {tx.provider_data?.transfer_info != null && (<div className="space-y-0.5 sm:col-span-2 lg:col-span-3">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Transfer Info</p>
                                  <p className="font-mono text-xs break-all">{String(tx.provider_data.transfer_info)}</p>
                                </div>)}
                              {tx.provider_data?.status_reason != null && (<div className="space-y-0.5 sm:col-span-2 lg:col-span-3">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status Reason</p>
                                  <p className="text-xs break-all">{String(tx.provider_data.status_reason)}</p>
                                </div>)}
                            </div>
                            {tx.status !== "completed" && tx.status !== "rejected" && (<div className="mt-3 flex justify-end gap-2">
                                <ManuallyRejectButton txId={tx.id} onSuccess={() => load(statusFilter, searchId)}/>
                                <ManuallyCreditButton txId={tx.id} onSuccess={() => load(statusFilter, searchId)}/>
                              </div>)}
                          </TableCell>
                        </TableRow>)}
                    </Fragment>);
        }))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);
}
// ---------------------------------------------------------------------------
// Gift Codes tab
// ---------------------------------------------------------------------------
function GiftCodesTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const capabilities = useCapabilities();
    const [codes, setCodes] = useState<GiftCode[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<GiftCode | null>(null);
    const [deleting, setDeleting] = useState(false);
    const load = useCallback(async (off = 0) => {
        if (!capabilities.is_super_admin)
            return;
        setLoading(true);
        try {
            const res = await listGiftCodes(LIMIT, off);
            setCodes(res.gift_codes ?? []);
            setTotal(res.total);
            setOffset(off);
        }
        catch {
            toast({ variant: "destructive", title: t('adminGiftCodes.loadFailed') });
        }
        finally {
            setLoading(false);
        }
    }, [capabilities.is_super_admin, toast]);
    useEffect(() => { load(0); }, [load]);
    const filtered = codes.filter((gc) => gc.code.toLowerCase().includes(search.toLowerCase()) ||
        gc.description.toLowerCase().includes(search.toLowerCase()));
    async function handleDelete() {
        if (!deleteTarget)
            return;
        setDeleting(true);
        try {
            await deleteGiftCode(deleteTarget.id);
            toast({ title: t('adminGiftCodes.deleteSuccess') });
            setDeleteTarget(null);
            load(offset);
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('adminGiftCodes.deleteFailed'), description: err?.data?.error ?? err?.message });
        }
        finally {
            setDeleting(false);
        }
    }
    return (<div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t('adminGiftCodes.codesTotal').replace('{n}', String(total))}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(offset)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
            {t('adminGiftCodes.refresh')}
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/payments/new">
              <Plus className="mr-2 h-4 w-4"/>
              {t('adminGiftCodes.create')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-8" placeholder={t('adminGiftCodes.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)}/>
      </div>

      {/* Table */}
      <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('adminGiftCodes.colCode')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colAmount')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colMaxUses')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colUsed')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colStatus')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colActiveAt')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colExpiresAt')}</TableHead>
                  <TableHead className="text-right">{t('adminGiftCodes.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full"/></TableCell>))}
                    </TableRow>))) : filtered.length === 0 ? (<TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      {t('adminGiftCodes.noCodes')}
                    </TableCell>
                  </TableRow>) : (filtered.map((gc) => (<TableRow key={gc.id}>
                      <TableCell>
                        <span className="flex items-center font-mono text-sm">
                          {gc.code}
                          <CopyButton text={gc.code}/>
                        </span>
                      </TableCell>
                      <TableCell>🪙 {gc.coins_amount.toLocaleString()} coins</TableCell>
                      <TableCell>{usesLabel(gc.max_uses, t('adminGiftCodes.unlimited'), t('adminGiftCodes.singleUse'))}</TableCell>
                      <TableCell>
                        {gc.used_count} / {gc.max_uses === -1 ? "∞" : gc.max_uses}
                      </TableCell>
                      <TableCell><StatusBadge gc={gc}/></TableCell>
                      <TableCell className="text-sm">{formatDt(gc.active_at, t('adminGiftCodes.never'))}</TableCell>
                      <TableCell className="text-sm">{formatDt(gc.expires_at, t('adminGiftCodes.never'))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/admin/payments/${gc.id}`}>
                              <Pencil className="h-4 w-4"/>
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(gc)}>
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>)))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      {/* Pagination */}
      {total > LIMIT && (<div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0 || loading} onClick={() => load(offset - LIMIT)}>
              {t('adminGiftCodes.previous') || t('common.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={offset + LIMIT >= total || loading} onClick={() => load(offset + LIMIT)}>
              {t('adminGiftCodes.next') || t('common.next')}
            </Button>
          </div>
        </div>)}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminGiftCodes.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('adminGiftCodes.deleteDesc').replace('{code}', deleteTarget?.code ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);
}
// ---------------------------------------------------------------------------
// Coin Top-Up tab
// ---------------------------------------------------------------------------
function CoinTopUpTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<CoinTransaction | null>(null);
    const [userId, setUserId] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setResult(null);
        try {
            const res = await adminCoinTopUp({
                user_id: userId.trim(),
                amount: parseInt(amount, 10),
                description: description.trim(),
            });
            setResult(res);
            toast({ title: `🪙 ${amount} coins added to ${userId}` });
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('adminGiftCodes.topupFailed'), description: err?.data?.error ?? err?.message });
        }
        finally {
            setSubmitting(false);
        }
    }
    function handleReset() {
        setUserId("");
        setAmount("");
        setDescription("");
        setResult(null);
    }
    return (<div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeDollarSign className="h-5 w-5 text-primary"/>
            {t('adminGiftCodes.topupCardTitle')}
          </CardTitle>
          <CardDescription>
            {t('adminGiftCodes.topupCardDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="topup-userId">
                {t('adminGiftCodes.fieldUserId')} <span className="text-destructive">*</span>
              </Label>
              <Input id="topup-userId" placeholder="e.g. user_abc123" value={userId} onChange={(e) => setUserId(e.target.value)} required spellCheck={false} autoComplete="off"/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topup-amount">
                {t('adminGiftCodes.fieldAmount')} <span className="text-destructive">*</span>
              </Label>
              <Input id="topup-amount" type="number" min={1} placeholder="e.g. 500" value={amount} onChange={(e) => setAmount(e.target.value)} required/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topup-desc">
                {t('adminGiftCodes.fieldTopupDescription')} <span className="text-destructive">*</span>
              </Label>
              <Textarea id="topup-desc" placeholder="Reason for top-up…" value={description} onChange={(e) => setDescription(e.target.value)} required rows={2}/>
            </div>
            <div className="flex justify-end gap-3">
              {result && (<Button type="button" variant="outline" onClick={handleReset}>
                  {t('adminGiftCodes.btnNewTopup')}
                </Button>)}
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BadgeDollarSign className="mr-2 h-4 w-4"/>}
                {t('adminGiftCodes.btnAddCoins')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (<Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-600 dark:text-green-400">{t('adminGiftCodes.resultTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">{t('adminGiftCodes.resultTxId')}</span>
              <span className="font-mono text-right break-all max-w-xs">{result.id}<CopyButton text={result.id}/></span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('adminGiftCodes.resultUser')}</span>
              <span className="font-mono">{result.user_id}<CopyButton text={result.user_id}/></span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('adminGiftCodes.resultAmount')}</span>
              <span className="font-semibold">🪙 {result.amount} coins</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('adminGiftCodes.resultStatus')}</span>
              <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                {result.status}
              </Badge>
            </div>
            {result.description && (<>
                <Separator />
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground">{t('adminGiftCodes.resultDesc')}</span>
                  <span className="text-right max-w-xs">{result.description}</span>
                </div>
              </>)}
          </CardContent>
        </Card>)}
    </div>);
}
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function GiftCodesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const capabilities = useCapabilities();
    const { t } = useTranslation();
    const VALID_TABS = ["payments", "packages", "sgem-packages", "token-packages", "gift-codes", "topup", "transactions"] as const;
    type TabValue = typeof VALID_TABS[number];
    const rawTab = searchParams.get("tab");
    const activeTab: TabValue = VALID_TABS.includes(rawTab as TabValue) ? (rawTab as TabValue) : "payments";
    function handleTabChange(value: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        router.replace(`?${params.toString()}`, { scroll: false });
    }
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
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary"/>
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">{t('adminGiftCodes.pageTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('adminGiftCodes.pageSubtitle')}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4"/>
              {t('adminPayments.tabPayments')}
            </TabsTrigger>
            <TabsTrigger value="packages" className="gap-2">
              <Package className="h-4 w-4"/>
              {t('adminPackages.tab')}
            </TabsTrigger>
            <TabsTrigger value="sgem-packages" className="gap-2">
              <BadgeDollarSign className="h-4 w-4"/>
              {t('adminSGemPackages.tab')}
            </TabsTrigger>
            <TabsTrigger value="token-packages" className="gap-2">
              <Package className="h-4 w-4"/>
              {t('adminTokenPackages.tab')}
            </TabsTrigger>
            <TabsTrigger value="gift-codes" className="gap-2">
              <Gift className="h-4 w-4"/>
              {t('adminGiftCodes.tabGiftCodes')}
            </TabsTrigger>
            <TabsTrigger value="topup" className="gap-2">
              <BadgeDollarSign className="h-4 w-4"/>
              {t('adminGiftCodes.tabTopUp')}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <ReceiptText className="h-4 w-4"/>
              {t('adminGiftCodes.tabTransactions')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="payments" className="mt-4">
            <PaymentMethodsTab />
          </TabsContent>
          <TabsContent value="packages" className="mt-4">
            <PackagesTab />
          </TabsContent>
          <TabsContent value="sgem-packages" className="mt-4">
            <SGemPackagesTab />
          </TabsContent>
          <TabsContent value="token-packages" className="mt-4">
            <TokenPackagesTab />
          </TabsContent>
          <TabsContent value="gift-codes" className="mt-4">
            <GiftCodesTab />
          </TabsContent>
          <TabsContent value="topup" className="mt-4">
            <CoinTopUpTab />
          </TabsContent>
          <TabsContent value="transactions" className="mt-4">
            <TransactionsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>);
}
