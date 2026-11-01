"use client";

import { TwoFactorProofInput } from "@/components/two-factor-proof-input";
import { factorProof, validFactorProof, twoFactorErrorKey } from "@/lib/two-factor-api";
import { GameAPIKeyAuditList } from "./GameAPIKeyAuditList";
import { useRef, useState } from "react";
import { AlertTriangle, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-client";
import { createGameAPIKey, renameGameAPIKey, revokeGameAPIKey, type GameAPIKey } from "@/lib/game-api-keys";
import type { GameAPIKeysState } from "@/hooks/use-game-api-keys";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useToast } from "@/hooks/use-toast";

type Action = { kind: "create" } | { kind: "rename" | "revoke"; key: GameAPIKey };

export function GameAPIKeysTab({ gameId, state }: { gameId: string; state: GameAPIKeysState }) {
    const { t, locale } = useTranslation();
    const { toast } = useToast();
    const [action, setAction] = useState<Action | null>(null);
    const [name, setName] = useState("");
    const [proof, setProof] = useState("");
    const [recovery, setRecovery] = useState(false);
    const [revokeConfirmed, setRevokeConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [stored, setStored] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copyAttempted, setCopyAttempted] = useState(false);
    const secretInputRef = useRef<HTMLInputElement>(null);
    const tr = (key: string) => t(`game.apiKeys.${key}`);
    const date = (value: string | number | null) => value === null ? tr("never") : new Date(typeof value === "number" ? value * 1000 : value).toLocaleString(locale);
    const explainError = (err: unknown) => {
        const code = err instanceof ApiError ? err.data?.message_code : undefined;
        if (typeof code === "string" && code.startsWith("TWO_FACTOR_")) return t(twoFactorErrorKey(err));
        if (code === "API_KEY_LIMIT_REACHED") return tr("limitReached");
        if (code === "API_KEY_NAME_TAKEN") return tr("nameTaken");
        if (code === "API_KEY_NOT_FOUND") return tr("notFound");
        if (code === "INVALID_REQUEST") return tr("invalidName");
        if (err instanceof ApiError && err.status === 403) return tr("forbidden");
        return tr("failed");
    };
    const open = (next: Action) => {
        setError(null);
        setProof("");
        setRecovery(false);
        setRevokeConfirmed(false);
        setName(next.kind === "create" ? "" : next.key.key_name);
        setAction(next);
    };
    const submitting = useRef(false);
    const submit = async (value = proof) => {
        if (!action || submitting.current || busy || ((action.kind === "create" || action.kind === "rename") && !name.trim()) || (action.kind === "revoke" && !revokeConfirmed) || (action.kind !== "rename" && !validFactorProof(value, recovery)) || (action.kind === "create" && !!state.meta && state.meta.used >= state.meta.limit)) return;
        submitting.current = true;
        setBusy(true);
        setError(null);
        try {
            const result = action.kind === "create" ? await createGameAPIKey(gameId, name.trim(), factorProof(value, recovery))
                : action.kind === "rename" ? await renameGameAPIKey(gameId, action.key.id, name.trim())
                : await revokeGameAPIKey(gameId, action.key.id, factorProof(value, recovery));
            if (result.data.api_key) {
                setStored(false);
                setCopied(false);
                setCopyAttempted(false);
                setSecret(result.data.api_key);
            }
            setAction(null);
            setProof("");
            toast({ title: tr("saved") });
            await state.reload();
        } catch (err) {
            setError(explainError(err));
            // Refresh limits and permissions after a concurrent change.
            await state.reload();
        } finally {
            submitting.current = false;
            setBusy(false);
        }
    };
    const copy = async () => {
        if (!secret) return;
        setCopyAttempted(true);
        let success = false;
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(secret);
                success = true;
            } catch {
                // Fall back to selecting the existing input inside the modal focus trap.
            }
        }
        if (!success) {
            const input = secretInputRef.current;
            if (input) {
                input.focus();
                input.select();
                input.setSelectionRange(0, secret.length);
                try {
                    success = document.execCommand("copy");
                } catch {
                    success = false;
                }
            }
        }
        setCopied(success);
        if (!success) {
            toast({ title: tr("copyFailed"), variant: "destructive" });
        }
    };
    const needsName = action?.kind === "create" || action?.kind === "rename";
    const limitReached = !!state.meta && state.meta.used >= state.meta.limit;
    return (
        <section id="game-api-keys-section" className="space-y-4">
            <div id="game-api-keys-header" className="flex flex-wrap items-start justify-between gap-3">
                <div id="game-api-keys-heading" className="min-w-0 flex-1 basis-80">
                    <div id="game-api-keys-description" className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertTriangle id="game-api-keys-warning-icon" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                        <ul id="game-api-keys-guidelines" className="list-disc space-y-1 pl-4">
                            <li id="game-api-keys-guideline-backend">{tr("backendOnly")}</li>
                            <li id="game-api-keys-guideline-build">{tr("neverInBuild")}</li>
                            <li id="game-api-keys-guideline-revoke">{tr("noExpiration")}</li>
                        </ul>
                    </div>
                </div>
                <div id="game-api-keys-toolbar" className="ml-auto flex shrink-0 items-center justify-end gap-2">
                    {state.meta && <span id="game-api-keys-count" className="text-sm text-muted-foreground">{state.meta.used} / {state.meta.limit}</span>}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger id="game-api-keys-refresh-trigger" asChild>
                                <Button id="game-api-keys-refresh" variant="outline" size="icon" aria-label={tr("refresh")} disabled={state.loading || busy} onClick={() => void state.reload()}>
                                    <RefreshCw id="game-api-keys-refresh-icon" className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent id="game-api-keys-refresh-tooltip-content" side="top">{tr("refresh")}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {state.meta?.can_generate && <Button id="game-api-keys-create" disabled={limitReached || busy || state.loading} onClick={() => open({ kind: "create" })}>{tr("create")}</Button>}
                </div>
            </div>
            {limitReached && <p id="game-api-keys-limit" className="text-sm text-muted-foreground">{tr("limitReached")}</p>}
            {state.error != null && <p id="game-api-keys-load-error" role="alert" className="text-sm text-destructive">{state.forbidden ? tr("forbidden") : tr("failed")}</p>}
            {state.loading && state.keys.length === 0 && <p id="game-api-keys-loading" className="text-sm text-muted-foreground">{tr("loading")}</p>}
            {!state.loading && !state.error && state.keys.length === 0 && <p id="game-api-keys-empty" className="py-8 text-center text-sm text-muted-foreground">{tr("empty")}</p>}
            {state.keys.length > 0 && <div id="game-api-keys-table-wrapper" className="overflow-x-auto rounded-md border">
                <table id="game-api-keys-table" className="w-full text-sm">
                    <thead id="game-api-keys-table-head" className="bg-muted/50 text-left">
                        <tr id="game-api-keys-table-head-row">
                            {["name", "prefix", "status", "created", "lastUsed", "revokedAt", "actions"].map(column => <th id={`game-api-keys-column-${column.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`} key={column} className="whitespace-nowrap px-3 py-3 font-medium">{tr(column)}</th>)}
                        </tr>
                    </thead>
                    <tbody id="game-api-keys-table-body">
                        {state.keys.map(key => <tr id={`game-api-keys-row-${key.id}`} key={key.id} className="border-t">
                            <td id={`game-api-keys-name-${key.id}`} className="px-3 py-3">{key.key_name}</td>
                            <td id={`game-api-keys-prefix-${key.id}`} className="px-3 py-3 font-mono">{key.key_prefix}...</td>
                            <td id={`game-api-keys-status-${key.id}`} className="px-3 py-3"><Badge id={`game-api-keys-badge-${key.id}`} variant={key.status === "active" ? "default" : "secondary"}>{tr(key.status)}</Badge></td>
                            <td id={`game-api-keys-created-${key.id}`} className="whitespace-nowrap px-3 py-3">{date(key.created_at)}</td>
                            <td id={`game-api-keys-used-${key.id}`} className="whitespace-nowrap px-3 py-3">{date(key.last_used_at)}</td>
                            <td id={`game-api-keys-revoked-${key.id}`} className="whitespace-nowrap px-3 py-3">{key.revoked_at ? date(key.revoked_at) : "-"}</td>
                            <td id={`game-api-keys-actions-${key.id}`} className="px-3 py-3">
                                {key.status === "active" ? <div id={`game-api-keys-buttons-${key.id}`} className="flex gap-1">
                                    {state.meta?.can_generate && <Button id={`game-api-keys-rename-${key.id}`} variant="ghost" size="sm" disabled={busy || state.loading} onClick={() => open({ kind: "rename", key })}>{tr("rename")}</Button>}
                                    {state.meta?.can_revoke && <Button id={`game-api-keys-revoke-${key.id}`} variant="ghost" size="sm" className="text-destructive" disabled={busy || state.loading} onClick={() => open({ kind: "revoke", key })}>{tr("revoke")}</Button>}
                                </div> : <span id={`game-api-keys-read-only-${key.id}`} className="text-muted-foreground">{tr("readOnly")}</span>}
                            </td>
                        </tr>)}
                    </tbody>
                </table>
            </div>}
            {state.meta?.next_cursor && <Button id="game-api-keys-load-more" variant="outline" disabled={state.loading || busy} onClick={() => void state.loadMore()}>{tr("loadMore")}</Button>}
            {state.canRead && <GameAPIKeyAuditList gameId={gameId} revision={state.keys} />}
            <Dialog open={action !== null} onOpenChange={value => { if (!value && !busy) setAction(null); }}>
                <DialogContent id="game-api-keys-action-dialog" onInteractOutside={event => { if (busy) event.preventDefault(); }} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
                    <DialogHeader id="game-api-keys-action-header">
                        <DialogTitle id="game-api-keys-action-title">{action ? tr(action.kind) : tr("title")}</DialogTitle>
                        <DialogDescription id="game-api-keys-action-description" className="whitespace-pre-line">{action?.kind === "revoke" ? t("game.apiKeys.revokeConfirm", { name: action.key.key_name }) : tr("nameHelp")}</DialogDescription>
                    </DialogHeader>
                    {needsName && <div id="game-api-keys-name-field" className="space-y-2">
                        <Label id="game-api-keys-name-label" htmlFor="game-api-keys-name-input">{tr("name")}</Label>
                        <Input id="game-api-keys-name-input" value={name} maxLength={64} disabled={busy} autoComplete="off" onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && name.trim()) { event.preventDefault(); void submit(); } }} />
                    </div>}
                    {action && (action.kind === "create" || (action.kind === "revoke" && revokeConfirmed)) && <div id="game-api-keys-factor-section" className="space-y-2">
                        <p id="game-api-keys-factor-help" className="text-sm text-muted-foreground">{tr("twoFactorRequired")}</p>
                        <TwoFactorProofInput id="game-api-keys-factor" value={proof} onChange={setProof} onComplete={value => void submit(value)} recovery={recovery} onRecoveryChange={setRecovery} disabled={busy} />
                    </div>}
                    {action?.kind === "revoke" && state.meta?.used === 1 && <p id="game-api-keys-last-key" className="text-sm text-muted-foreground">{tr("lastKey")}</p>}
                    {error && <p id="game-api-keys-action-error" role="alert" className="text-sm text-destructive">{error}</p>}
                    <DialogFooter id="game-api-keys-action-footer">
                        <Button id="game-api-keys-cancel" variant="outline" disabled={busy} onClick={() => setAction(null)}>{tr("cancel")}</Button>
                        {action?.kind === "revoke" && !revokeConfirmed
                            ? <Button id="game-api-keys-confirm-revoke" variant="destructive" onClick={() => setRevokeConfirmed(true)}>{tr("confirmRevoke")}</Button>
                            : <Button id="game-api-keys-confirm" variant={action?.kind === "revoke" ? "destructive" : "default"} disabled={busy || (action?.kind !== "rename" && !validFactorProof(proof, recovery)) || (needsName && !name.trim()) || (action?.kind === "create" && limitReached)} onClick={() => void submit()}>{busy ? tr("saving") : action ? tr(action.kind) : tr("save")}</Button>}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={secret !== null} onOpenChange={value => { if (!value && stored) setSecret(null); }}>
                <DialogContent id="game-api-keys-secret-dialog" className="[&>button]:hidden" onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (!stored) event.preventDefault(); }}>
                    <DialogHeader id="game-api-keys-secret-header">
                        <DialogTitle id="game-api-keys-secret-title">{tr("copyNow")}</DialogTitle>
                        <DialogDescription id="game-api-keys-secret-description">
                            <span id="game-api-keys-secret-warning" className="block text-amber-600 dark:text-amber-400">{tr("secretWarning")}</span>
                            <span id="game-api-keys-secret-storage-help" className="block">{tr("secretStorageHelp")}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <Label id="game-api-keys-secret-label" htmlFor="game-api-keys-secret-value">{tr("title")}</Label>
                    <div id="game-api-keys-secret-input-row" className="flex items-center gap-2">
                        <Input ref={secretInputRef} id="game-api-keys-secret-value" value={secret ?? ""} readOnly autoComplete="off" className="min-w-0 flex-1 font-mono" />
                        <Button id="game-api-keys-copy" className="w-36 shrink-0" variant="outline" onClick={() => void copy()}><Copy id="game-api-keys-copy-icon" className="mr-2 h-4 w-4" />{tr(copied ? "copied" : "copy")}</Button>
                    </div>
                    <DialogFooter id="game-api-keys-secret-footer" className="flex-row items-center gap-3 sm:space-x-0">
                        {copyAttempted && <Label id="game-api-keys-stored-label" className="mr-auto flex items-center gap-2" htmlFor="game-api-keys-stored">
                            <input id="game-api-keys-stored" type="checkbox" checked={stored} onChange={event => setStored(event.target.checked)} />{tr("stored")}
                        </Label>}
                        <Button id="game-api-keys-close-secret" className="ml-auto shrink-0" disabled={!stored} onClick={() => setSecret(null)}>{tr("close")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
