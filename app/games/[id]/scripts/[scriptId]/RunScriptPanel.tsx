"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Braces, Check, Loader2, Play, Save } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { EditorView, keymap } from "@codemirror/view";
import { linter, lintGutter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { createGamerProgress, getMyGamerProgress, runScript } from "@/lib/script-api";

type ProfileStatus = "checking" | "ready" | "missing" | "error";

const profileStatusPresentation: Record<ProfileStatus, { labelKey: string; className: string; dotClassName: string }> = {
    checking: {
        labelKey: "scripts.profileStatusChecking",
        className: "border-muted-foreground/30 text-muted-foreground",
        dotClassName: "bg-muted-foreground animate-pulse",
    },
    ready: {
        labelKey: "scripts.profileStatusReady",
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        dotClassName: "bg-emerald-500",
    },
    missing: {
        labelKey: "scripts.profileStatusMissing",
        className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        dotClassName: "bg-amber-500",
    },
    error: {
        labelKey: "scripts.profileStatusError",
        className: "border-destructive/40 bg-destructive/10 text-destructive",
        dotClassName: "bg-destructive",
    },
};

interface RunScriptPanelProps {
    gameId: string;
    scriptId: string;
    scriptName?: string;
}

const defaultPayload = '{\n  "payload": {\n\n  }\n}';

function jsonLinter(view: EditorView): Diagnostic[] {
    const code = view.state.doc.toString();
    if (!code.trim()) return [];

    try {
        JSON.parse(code);
        return [];
    } catch (error: unknown) {
        if (!(error instanceof SyntaxError)) return [];
        const match = error.message.match(/position\s+(\d+)/i);
        const position = match ? Math.min(Number(match[1]), view.state.doc.length) : 0;
        const line = view.state.doc.lineAt(position);
        return [{
            from: position,
            to: Math.max(position + 1, line.to),
            severity: "error",
            message: error.message,
        }];
    }
}

export function RunScriptPanel({ gameId, scriptId, scriptName }: RunScriptPanelProps) {
    const { toast } = useToast();
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const storageKey = `run_payload_${scriptName ?? scriptId}`;
    const [runPayload, setRunPayload] = useState(defaultPayload);
    const [runResult, setRunResult] = useState("");
    const [runDuration, setRunDuration] = useState<number | null>(null);
    const [runningScript, setRunningScript] = useState(false);
    const [profileStatus, setProfileStatus] = useState<ProfileStatus>("checking");
    const [profileError, setProfileError] = useState("");
    const [creatingProfile, setCreatingProfile] = useState(false);
    const [payloadKey, setPayloadKey] = useState(0);
    const [savedPayload, setSavedPayload] = useState(false);
    const profileStatusView = profileStatusPresentation[profileStatus];
    const payloadDirty = useRef(false);
    const savedPayloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        setRunPayload(saved ?? defaultPayload);
        payloadDirty.current = false;
    }, [storageKey]);

    const checkProfile = useCallback(async () => {
        setProfileStatus("checking");
        setProfileError("");
        try {
            await getMyGamerProgress(gameId);
            setProfileStatus("ready");
            return true;
        } catch (error: unknown) {
            if (error instanceof ApiError && error.status === 404) {
                setProfileStatus("missing");
                return false;
            }
            setProfileStatus("error");
            setProfileError(error instanceof Error ? error.message : String(error));
            return false;
        }
    }, [gameId]);

    useEffect(() => {
        void checkProfile();
    }, [checkProfile]);

    const savePayloadToStorage = useCallback(() => {
        localStorage.setItem(storageKey, runPayload);
        payloadDirty.current = false;
        if (savedPayloadTimer.current) clearTimeout(savedPayloadTimer.current);
        setSavedPayload(true);
        savedPayloadTimer.current = setTimeout(() => setSavedPayload(false), 2000);
    }, [runPayload, storageKey]);

    const savePayloadRef = useRef(savePayloadToStorage);
    useEffect(() => {
        savePayloadRef.current = savePayloadToStorage;
    }, [savePayloadToStorage]);

    const payloadKeymap = useMemo(() => keymap.of([{
        key: "Mod-s",
        run: () => {
            savePayloadRef.current();
            return true;
        },
    }]), []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (payloadDirty.current) savePayloadRef.current();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => () => {
        if (savedPayloadTimer.current) clearTimeout(savedPayloadTimer.current);
    }, []);

    async function handleCreateProfile() {
        setCreatingProfile(true);
        setProfileError("");
        try {
            await createGamerProgress(gameId);
            setProfileStatus("ready");
            toast({ title: t("scripts.profileCreated") });
        } catch (error: unknown) {
            if (error instanceof ApiError && error.status === 409) {
                setProfileStatus("ready");
                return;
            }
            setProfileStatus("error");
            setProfileError(error instanceof Error ? error.message : String(error));
        } finally {
            setCreatingProfile(false);
        }
    }

    async function handleRunScript() {
        let payload: unknown;
        try {
            payload = JSON.parse(runPayload);
        } catch (error: unknown) {
            toast({
                variant: "destructive",
                title: t("scripts.invalidJson"),
                description: error instanceof Error ? error.message : t("scripts.invalidJsonDescription"),
            });
            return;
        }

        setRunningScript(true);
        setRunResult("");
        setRunDuration(null);
        try {
            if (!(await checkProfile())) return;
            const result = await runScript(gameId, scriptName ?? scriptId, payload);
            if (result && typeof result === "object" && "duration_ms" in result) {
                setRunDuration(result.duration_ms as number);
            }
            setRunResult(JSON.stringify(result, null, 2));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setRunResult(`${t("scripts.runErrorPrefix")}: ${message}`);
        } finally {
            setRunningScript(false);
        }
    }

    function beautifyPayload() {
        try {
            const parsed = JSON.parse(runPayload.replace(/^\uFEFF/, "").trim());
            setRunPayload(JSON.stringify(parsed, null, 2));
            setPayloadKey((value) => value + 1);
            payloadDirty.current = true;
        } catch (error: unknown) {
            toast({
                variant: "destructive",
                title: t("scripts.invalidJson"),
                description: error instanceof Error ? error.message : t("scripts.invalidJsonDescription"),
            });
        }
    }

    return (
        <>
            <Separator id="script-run-separator" />
            <section id="script-run-panel" className="px-6 py-3 flex flex-col gap-2 scroll-mt-[60px]" style={{ height: "90vh" }}>
                {profileStatus === "error" && (
                    <Alert id="script-run-profile-error" variant="destructive">
                        <AlertCircle id="script-run-profile-error-icon" className="h-4 w-4" />
                        <AlertTitle id="script-run-profile-error-title">{t("scripts.profileCheckFailed")}</AlertTitle>
                        <AlertDescription id="script-run-profile-error-description" className="flex items-center justify-between gap-4">
                            <span id="script-run-profile-error-message">{profileError}</span>
                            <Button id="script-run-profile-retry-button" type="button" size="sm" variant="outline" onClick={() => void checkProfile()}>
                                {t("scripts.retryProfileCheck")}
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <div id="script-run-toolbar" className="flex items-center justify-center gap-2 shrink-0">
                    <Tooltip>
                        <TooltipTrigger id="script-run-beautify-tooltip-trigger" asChild>
                            <Button id="script-run-beautify-button" type="button" variant="outline" size="icon" className="h-7 w-7" onClick={beautifyPayload}>
                                <Braces id="script-run-beautify-icon" className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent id="script-run-beautify-tooltip-content" side="top">{t("scripts.beautifyJson")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger id="script-run-save-tooltip-trigger" asChild>
                            <Button id="script-run-save-payload-button" type="button" variant="outline" size="icon" className="h-7 w-7" onClick={savePayloadToStorage}>
                                <Save id="script-run-save-payload-icon" className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent id="script-run-save-tooltip-content" side="top">{t("scripts.savePayload")}</TooltipContent>
                    </Tooltip>
                    <Check id="script-run-payload-saved-icon" className={`h-3.5 w-3.5 text-emerald-500 transition-opacity duration-500 ${savedPayload ? "opacity-100" : "opacity-0"}`} />
                    <Button
                        id="script-run-button"
                        type="button"
                        size="sm"
                        className="h-7 gap-1.5"
                        onClick={handleRunScript}
                        disabled={runningScript || profileStatus !== "ready"}
                    >
                        {runningScript || profileStatus === "checking"
                            ? <Loader2 id="script-run-button-spinner" className="h-3.5 w-3.5 animate-spin" />
                            : <Play id="script-run-button-icon" className="h-3.5 w-3.5" />}
                        {t("scripts.runButton")}
                    </Button>
                    <Badge id="script-run-profile-status" variant="outline" className={`h-7 gap-1.5 px-2 ${profileStatusView.className}`}>
                        <span id={`script-run-profile-status-${profileStatus}-dot`} className={`h-2 w-2 rounded-full ${profileStatusView.dotClassName}`} />
                        <span id="script-run-profile-status-label">{t(profileStatusView.labelKey)}</span>
                    </Badge>
                    {profileStatus === "missing" && (
                        <Button
                            id="script-run-create-profile-button"
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 gap-1.5 px-2 text-xs"
                            onClick={handleCreateProfile}
                            disabled={creatingProfile}
                        >
                            {creatingProfile && <Loader2 id="script-run-create-profile-spinner" className="h-3.5 w-3.5 animate-spin" />}
                            {creatingProfile ? t("scripts.creatingProfile") : t("scripts.createProfile")}
                        </Button>
                    )}
                </div>

                <div id="script-run-content" className="flex flex-1 min-h-0 gap-3">
                    <div id="script-run-payload-column" className="flex flex-col flex-1 min-w-0 gap-1">
                        <div id="script-run-payload-heading" className="flex items-center gap-1.5">
                            <p id="script-run-payload-title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                <Play id="script-run-payload-title-icon" className="h-3.5 w-3.5" />
                                {t("scripts.runScript")}
                            </p>
                            <span id="script-run-endpoint" className="font-normal normal-case text-muted-foreground/60 text-[10px]">
                                POST /api/v1/games/{gameId}/scripts/{scriptName ?? scriptId}/run
                            </span>
                        </div>
                        <div id="script-run-payload-editor-container" className="flex-1 min-h-0">
                            <CodeMirror
                                id="script-run-payload-editor"
                                key={payloadKey}
                                value={runPayload}
                                onChange={(value) => {
                                    setRunPayload(value);
                                    payloadDirty.current = true;
                                }}
                                theme={vscodeDark}
                                extensions={[json(), lintGutter(), linter(jsonLinter, { delay: 400 }), payloadKeymap]}
                                basicSetup={{
                                    lineNumbers: true,
                                    foldGutter: false,
                                    bracketMatching: true,
                                    closeBrackets: true,
                                    autocompletion: false,
                                    tabSize: 2,
                                }}
                                style={{ height: "100%", fontSize: "12px" }}
                                className="h-full overflow-hidden rounded-lg border border-zinc-700 [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto"
                            />
                        </div>
                    </div>

                    <div id="script-run-result-column" className="flex flex-col flex-1 min-w-0 gap-1">
                        <div id="script-run-result-heading" className="flex items-center gap-2">
                            <p id="script-run-result-title" className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("scripts.runResult")}</p>
                            {runDuration != null && <span id="script-run-duration" className="text-[10px] text-emerald-500 font-mono tabular-nums">{runDuration}ms</span>}
                        </div>
                        <div id="script-run-result-container" className="flex-1 min-h-0 rounded-lg border border-zinc-700 bg-[#1e1e1e] overflow-auto">
                            {runningScript ? (
                                <div id="script-run-running-state" className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                                    <Loader2 id="script-run-running-spinner" className="h-4 w-4 animate-spin" />
                                    <span id="script-run-running-label" className="text-xs">{t("scripts.running")}</span>
                                </div>
                            ) : runResult ? (
                                <pre id="script-run-result-output" className="p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all">{runResult}</pre>
                            ) : (
                                <div id="script-run-result-empty" className="flex items-center justify-center h-full text-muted-foreground/40">
                                    <span id="script-run-result-placeholder" className="text-xs">{t("scripts.runResultPlaceholder")}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
