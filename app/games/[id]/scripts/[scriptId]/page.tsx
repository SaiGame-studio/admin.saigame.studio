"use client";
import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Code2, RefreshCw, Clock, Layers, FileCode, Undo2, Redo2, Minus, Plus, Pencil, X, Check, ChevronRight, ChevronLeft, Play, Braces, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList, } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/CopyButton";
import { GameNavButtons } from "@/components/GameNavButtons";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getGame } from "@/lib/game-api";
import { getScript, updateScript, listSampleScripts, listTurnBaseSampleScripts, listEntitiesPoolSamples, runScript } from "@/lib/script-api";
import type { Game } from "@/types/game";
import type { GameScript, SampleScript } from "@/types/script";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { EditorView, keymap } from "@codemirror/view";
import { undo, redo } from "@codemirror/commands";
import { linter, lintGutter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import { json } from "@codemirror/lang-json";
import luaparse from "luaparse";
// ---------------------------------------------------------------------------
// JSON linter
// ---------------------------------------------------------------------------
function jsonLinter(view: EditorView): Diagnostic[] {
    const code = view.state.doc.toString();
    if (!code.trim())
        return [];
    try {
        JSON.parse(code);
        return [];
    }
    catch (err: unknown) {
        if (err instanceof SyntaxError) {
            const match = err.message.match(/position\s+(\d+)/i);
            const pos = match ? Math.min(Number(match[1]), view.state.doc.length) : 0;
            const line = view.state.doc.lineAt(pos);
            return [{ from: pos, to: Math.max(pos + 1, line.to), severity: "error", message: err.message }];
        }
        return [];
    }
}
// ---------------------------------------------------------------------------
// Lua linter
// ---------------------------------------------------------------------------
function luaLinter(view: EditorView): Diagnostic[] {
    const code = view.state.doc.toString();
    if (!code.trim())
        return [];
    try {
        luaparse.parse(code, { luaVersion: "5.3" });
        return [];
    }
    catch (err: unknown) {
        if (err && typeof err === "object" && "line" in err && "column" in err) {
            const e = err as {
                line: number;
                column: number;
                message: string;
            };
            const line = Math.max(0, e.line - 1);
            const lineStart = view.state.doc.line(Math.min(line + 1, view.state.doc.lines)).from;
            const lineEnd = view.state.doc.line(Math.min(line + 1, view.state.doc.lines)).to;
            const from = Math.min(lineStart + e.column, lineEnd);
            return [{ from, to: Math.max(from + 1, lineEnd), severity: "error", message: e.message }];
        }
        return [];
    }
}
// ---------------------------------------------------------------------------
// Lua Editor
// ---------------------------------------------------------------------------
interface LuaEditorProps {
    value: string;
    onChange: (v: string) => void;
    fontSize?: number;
}
export interface LuaEditorHandle {
    undo: () => void;
    redo: () => void;
}
const LuaEditor = forwardRef<LuaEditorHandle, LuaEditorProps>(function LuaEditor({ value, onChange, fontSize = 13 }, ref) {
    const viewRef = useRef<EditorView | null>(null);
    useImperativeHandle(ref, () => ({
        undo() {
            if (viewRef.current)
                undo(viewRef.current);
        },
        redo() {
            if (viewRef.current)
                redo(viewRef.current);
        },
    }));
    return (<CodeMirror value={value} onChange={onChange} theme={vscodeDark} extensions={[StreamLanguage.define(lua), lintGutter(), linter(luaLinter, { delay: 600 })]} onCreateEditor={view => { viewRef.current = view; }} basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            tabSize: 2,
        }} style={{ height: "100%", fontSize: `${fontSize}px` }} className="h-full overflow-hidden rounded-lg border border-zinc-700 [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto"/>);
});
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ScriptEditPage() {
    const params = useParams() as {
        id: string;
        scriptId: string;
    };
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const gameId = params.id;
    const scriptId = params.scriptId;
    const [game, setGame] = useState<Game | null>(null);
    const [script, setScript] = useState<GameScript | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Editable fields
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [scriptBody, setScriptBody] = useState("");
    const [savingInfo, setSavingInfo] = useState(false);
    const [savingBody, setSavingBody] = useState(false);
    const [savedBody, setSavedBody] = useState(false);
    const savedBodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const editorRef = useRef<LuaEditorHandle>(null);
    const [fontSize, setFontSize] = useState(13);
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [savingName, setSavingName] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [descInput, setDescInput] = useState("");
    const [samplesCollapsed, setSamplesCollapsed] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("scripts_samples_collapsed") === "true";
        }
        return false;
    });
    useEffect(() => {
        localStorage.setItem("scripts_samples_collapsed", samplesCollapsed.toString());
    }, [samplesCollapsed]);
    async function handleSaveName() {
        if (!nameInput.trim() || nameInput === script?.name) {
            setEditingName(false);
            return;
        }
        setSavingName(true);
        try {
            const updated = await updateScript(gameId, scriptId, { name: nameInput.trim() });
            setScript(updated);
            toast({ title: t('scripts.toastNameUpdated') });
            setEditingName(false);
        }
        catch (err: unknown) {
            toast({ variant: "destructive", title: t('scripts.toastFailedRename'), description: err instanceof Error ? err.message : undefined });
        }
        finally {
            setSavingName(false);
        }
    }
    const [togglingActive, setTogglingActive] = useState(false);
    async function handleToggleActive(value: boolean) {
        setIsActive(value);
        setTogglingActive(true);
        try {
            const updated = await updateScript(gameId, scriptId, { is_active: value });
            setScript(updated);
            toast({ title: value ? t('scripts.toastScriptActivated') : t('scripts.toastScriptDeactivated') });
        }
        catch (err: unknown) {
            setIsActive(!value);
            toast({ variant: "destructive", title: t('scripts.toastFailedUpdate'), description: err instanceof Error ? err.message : undefined });
        }
        finally {
            setTogglingActive(false);
        }
    }
    const [samples, setSamples] = useState<SampleScript[]>([]);
    const [entitiesPoolSamples, setEntitiesPoolSamples] = useState<SampleScript[]>([]);
    const [turnBaseSamples, setTurnBaseSamples] = useState<SampleScript[]>([]);
    const [samplesLoading, setSamplesLoading] = useState(true);
    const [sampleTab, setSampleTab] = useState<string>(() => {
        const tab = searchParams.get("sampleTab");
        if (tab === "pool" || tab === "turn-base")
            return tab;
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`sample_tab_${scriptId}`);
            if (saved === "pool" || saved === "turn-base")
                return saved;
        }
        return "core";
    });
    const [appendMode, setAppendMode] = useState(false);
    // Run script state
    const defaultPayload = '{\n  "payload": {\n\n  }\n}';
    const [runPayload, setRunPayload] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`run_payload_${scriptId}`);
            return saved ?? defaultPayload;
        }
        return defaultPayload;
    });
    const [runResult, setRunResult] = useState<string>("");
    const [runDuration, setRunDuration] = useState<number | null>(null);
    const [runningScript, setRunningScript] = useState(false);
    const [payloadKey, setPayloadKey] = useState(0);
    const [savedPayloadFlag, setSavedPayloadFlag] = useState(false);
    const savedPayloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const payloadDirty = useRef(false);
    function savePayloadToStorage() {
        if (script?.name) {
            localStorage.setItem(`run_payload_${script.name}`, runPayload);
            payloadDirty.current = false;
            if (savedPayloadTimer.current)
                clearTimeout(savedPayloadTimer.current);
            setSavedPayloadFlag(true);
            savedPayloadTimer.current = setTimeout(() => setSavedPayloadFlag(false), 2000);
        }
    }
    // Mark dirty when payload changes
    const handlePayloadChange = useCallback((v: string) => {
        setRunPayload(v);
        payloadDirty.current = true;
    }, []);
    const savePayloadRef = useRef(savePayloadToStorage);
    useEffect(() => { savePayloadRef.current = savePayloadToStorage; });
    const payloadKeymapExt = useMemo(() => keymap.of([{
            key: "Mod-s",
            run: () => { savePayloadRef.current(); return true; },
        }]), []);
    // Auto-save every 10s if dirty
    useEffect(() => {
        const interval = setInterval(() => {
            if (payloadDirty.current && script?.name) {
                savePayloadToStorage();
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [script?.name, runPayload]);
    async function handleRunScript() {
        setRunningScript(true);
        setRunResult("");
        setRunDuration(null);
        try {
            let payload: any = {};
            try {
                payload = JSON.parse(runPayload);
            }
            catch {
                setRunResult("❌ Invalid JSON payload");
                setRunningScript(false);
                return;
            }
            const result = await runScript(gameId, script?.name ?? scriptId, payload);
            if (result && typeof result === "object" && "duration_ms" in result) {
                setRunDuration(result.duration_ms as number);
            }
            setRunResult(JSON.stringify(result, null, 2));
        }
        catch (err: unknown) {
            setRunResult(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            setRunningScript(false);
        }
    }
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [g, s] = await Promise.all([
                getGame(gameId).catch(() => null),
                getScript(gameId, scriptId),
            ]);
            if (g)
                setGame(g);
            setScript(s);
            setDescription(s.description);
            setIsActive(s.is_active);
            setScriptBody(s.script_body);
            // Load saved payload by script name
            const savedPayload = localStorage.getItem(`run_payload_${s.name}`);
            if (savedPayload)
                setRunPayload(savedPayload);
        }
        catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('scripts.toastFailedLoadScript'));
        }
        finally {
            setLoading(false);
        }
    }, [gameId, scriptId]);
    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => {
        setSamplesLoading(true);
        Promise.all([
            listSampleScripts().catch(() => [] as SampleScript[]),
            listEntitiesPoolSamples().catch(() => ({ samples: [] as SampleScript[] })),
            listTurnBaseSampleScripts().catch(() => [] as SampleScript[]),
        ])
            .then(([core, entities, turnBase]) => {
            setSamples(core);
            setEntitiesPoolSamples(entities.samples.map((s, idx) => ({ ...s, no: s.no ?? (idx + 1) })));
            setTurnBaseSamples(turnBase);
        })
            .finally(() => setSamplesLoading(false));
    }, []);
    async function handleSaveInfo() {
        const next = descInput.trim();
        if (next === description) {
            setEditingDescription(false);
            return;
        }
        setSavingInfo(true);
        try {
            const updated = await updateScript(gameId, scriptId, {
                description: next,
                is_active: isActive,
            });
            setScript(updated);
            setDescription(next);
            setEditingDescription(false);
            toast({ title: t('scripts.toastInfoSaved') });
        }
        catch (err: unknown) {
            toast({ variant: "destructive", title: t('scripts.toastFailedSaveInfo'), description: err instanceof Error ? err.message : undefined });
        }
        finally {
            setSavingInfo(false);
        }
    }
    const handleSaveBodyRef = useRef<() => Promise<void>>(null!);
    async function handleSaveBody() {
        if (savingBody)
            return;
        setSavingBody(true);
        try {
            const updated = await updateScript(gameId, scriptId, { script_body: scriptBody });
            setScript(updated);
            if (savedBodyTimer.current)
                clearTimeout(savedBodyTimer.current);
            setSavedBody(true);
            savedBodyTimer.current = setTimeout(() => setSavedBody(false), 2000);
        }
        catch (err: unknown) {
            toast({ variant: "destructive", title: t('scripts.toastFailedSaveScript'), description: err instanceof Error ? err.message : undefined });
        }
        finally {
            setSavingBody(false);
        }
    }
    useEffect(() => { handleSaveBodyRef.current = handleSaveBody; });
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSaveBodyRef.current();
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (<TooltipProvider delayDuration={300}>
    <div className="flex flex-col">
      {/* ── Top header ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-3 shrink-0">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-2">
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">{t('scripts.breadcrumbGames')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{game?.name ?? gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}/scripts`}>{t('scripts.breadcrumbScripts')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="font-mono">{script?.name ?? scriptId}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.push(`/games/${gameId}/scripts`)}>
              <ArrowLeft className="h-4 w-4"/>
            </Button>
            <div className="group">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Code2 className="h-6 w-6 text-muted-foreground"/>
                {loading ? (<span className="text-muted-foreground">{t('scripts.loading')}</span>) : editingName ? (<span className="flex items-center gap-1.5">
                    <Input value={nameInput} onChange={e => setNameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} onKeyDown={e => {
                if (e.key === "Enter")
                    handleSaveName();
                if (e.key === "Escape")
                    setEditingName(false);
            }} className="h-8 w-48 font-mono text-base px-2" disabled={savingName} autoFocus/>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName} disabled={savingName}>
                      {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Save className="h-3.5 w-3.5"/>}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingName(false); }} disabled={savingName}>
                      <X className="h-3.5 w-3.5"/>
                    </Button>
                  </span>) : (<span className="flex items-center gap-1.5 font-mono">
                    {script?.name}
                    {script && <CopyButton text={script.name}/>}
                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setNameInput(script?.name ?? ""); setEditingName(true); }}>
                      <Pencil className="h-3 w-3"/>
                    </Button>
                    <Switch checked={isActive} onCheckedChange={handleToggleActive} disabled={togglingActive} className="ml-1"/>
                  </span>)}
              </h1>
              {script && (<div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3"/>
                    v{script.version}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3"/>
                    {new Date(script.updated_at).toLocaleString()}
                  </span>
                </div>)}
            </div>
          </div>
          <GameNavButtons gameId={gameId} active="scripts"/>
        </div>
      </div>

      <Separator />

      {/* ── Info bar ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-3 shrink-0 bg-muted/20 border-b flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] space-y-1 group">
          <Label htmlFor="edit-desc" className="text-xs text-muted-foreground">{t('scripts.labelDescription')}</Label>
          {editingDescription ? (<div className="flex items-center gap-1.5">
              <Input id="edit-desc" value={descInput} onChange={e => setDescInput(e.target.value)} onKeyDown={e => {
                if (e.key === "Enter")
                    handleSaveInfo();
                if (e.key === "Escape")
                    setEditingDescription(false);
            }} placeholder={t('scripts.placeholderDescription')} className="h-8 text-sm" disabled={savingInfo} autoFocus/>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSaveInfo} disabled={savingInfo}>
                {savingInfo ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Save className="h-3.5 w-3.5"/>}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingDescription(false)} disabled={savingInfo}>
                <X className="h-3.5 w-3.5"/>
              </Button>
            </div>) : (<div className="flex items-center gap-1.5 h-8">
              <span className={`text-sm truncate ${description ? "" : "italic text-muted-foreground/60"}`}>
                {description || t('scripts.placeholderDescription')}
              </span>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setDescInput(description); setEditingDescription(true); }} disabled={loading}>
                <Pencil className="h-3 w-3"/>
              </Button>
            </div>)}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title={t('scripts.tooltipRefresh')} onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>
        </Button>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (<Alert variant="destructive" className="mx-6 mt-4 shrink-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>)}

      {/* ── Main: editor + sample scripts + run ─────────────────────────── */}
      {loading ? (<div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin"/>
          <span className="text-sm">{t('scripts.loadingScript')}</span>
        </div>) : !script ? null : (<div className="flex flex-col">
          {/* ── Top: editor + samples ─────────────────────────────────────── */}
          <div className="flex px-6 py-4 overflow-hidden" style={{ height: "90vh" }}>
            {/* Script body editor */}
            <div id="section-save-script" className="flex flex-1 min-w-0 flex-col gap-2 scroll-mt-[60px]">
              <div className="flex items-center justify-between shrink-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('scripts.scriptBody')}
                  <span className="ml-2 font-normal normal-case text-muted-foreground/60">(Lua)</span>
                </p>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editorRef.current?.undo()}>
                        <Undo2 className="h-3.5 w-3.5"/>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('scripts.tooltipUndo')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editorRef.current?.redo()}>
                        <Redo2 className="h-3.5 w-3.5"/>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('scripts.tooltipRedo')}</TooltipContent>
                  </Tooltip>
                  <Separator orientation="vertical" className="h-4 mx-0.5"/>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFontSize(s => Math.max(10, s - 1))} disabled={fontSize <= 10}>
                        <Minus className="h-3 w-3"/>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('scripts.tooltipDecreaseFontSize')}</TooltipContent>
                  </Tooltip>
                  <span className="text-[11px] text-muted-foreground tabular-nums w-6 text-center select-none">{fontSize}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFontSize(s => Math.min(24, s + 1))} disabled={fontSize >= 24}>
                        <Plus className="h-3 w-3"/>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('scripts.tooltipIncreaseFontSize')}</TooltipContent>
                  </Tooltip>
                  <Separator orientation="vertical" className="h-4 mx-0.5"/>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" className="h-7 w-7" onClick={handleSaveBody} disabled={savingBody}>
                        {savingBody ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Save className="h-3.5 w-3.5"/>}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('scripts.tooltipSaveScript')}</TooltipContent>
                  </Tooltip>
                  <Check className={`h-3.5 w-3.5 text-emerald-500 transition-opacity duration-500 ${savedBody ? "opacity-100" : "opacity-0"}`}/>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <LuaEditor ref={editorRef} value={scriptBody} onChange={setScriptBody} fontSize={fontSize}/>
              </div>
            </div>

            {/* Vertical Divider with Toggle */}
            <div className="relative flex items-center shrink-0 h-full px-2">
              <Separator orientation="vertical" className="h-full"/>
              <Button variant="ghost" size="icon" className="absolute left-1/2 -translate-x-1/2 h-7 w-7 rounded-full border bg-background shadow-sm z-10 hover:bg-muted" onClick={() => setSamplesCollapsed(!samplesCollapsed)}>
                {samplesCollapsed ? <ChevronLeft className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
              </Button>
            </div>

            {/* Sample scripts panel */}
            <div className={`transition-all duration-300 ease-in-out flex flex-col gap-2 shrink-0 ${samplesCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-80 ml-2"}`}>
              <div className="flex items-center justify-between shrink-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('scripts.sampleScripts')}
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] cursor-pointer select-none ${appendMode ? "text-primary" : "text-muted-foreground/60"}`} onClick={() => setAppendMode(v => !v)}>
                        {appendMode ? t('scripts.sampleAppend') : t('scripts.sampleReplace')}
                      </span>
                      <Switch checked={appendMode} onCheckedChange={setAppendMode} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"/>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[180px] text-center">
                    {appendMode ? t('scripts.sampleAppendTooltip') : t('scripts.sampleReplaceTooltip')}
                  </TooltipContent>
                </Tooltip>
              </div>
              {samplesLoading ? (<div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
                </div>) : (() => {
                const activeSamples = sampleTab === "core" ? samples :
                    sampleTab === "pool" ? entitiesPoolSamples :
                        turnBaseSamples;
                return (<>
                    <Tabs value={sampleTab} onValueChange={(v) => {
                        setSampleTab(v);
                        if (v === "core")
                            localStorage.removeItem(`sample_tab_${scriptId}`);
                        else
                            localStorage.setItem(`sample_tab_${scriptId}`, v);
                        const sp = new URLSearchParams(searchParams.toString());
                        if (v === "core")
                            sp.delete("sampleTab");
                        else
                            sp.set("sampleTab", v);
                        router.replace(`?${sp.toString()}`, { scroll: false });
                    }} className="shrink-0">
                      <TabsList className="h-7 w-full px-0.5">
                        <TabsTrigger value="core" className="text-[10px] flex-1 h-5 px-1">
                          Core ({samples.length})
                        </TabsTrigger>
                        {/* <TabsTrigger value="pool" className="text-[10px] flex-1 h-5 px-1">
              Pool ({entitiesPoolSamples.length})
            </TabsTrigger> */}
                        <TabsTrigger value="turn-base" className="text-[10px] flex-1 h-5 px-1">
                          Battle ({turnBaseSamples.length})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {activeSamples.length === 0 ? (<div className="flex-1 rounded-lg border border-dashed bg-muted/20 flex flex-col items-center justify-center gap-2 text-center p-4">
                        <Code2 className="h-8 w-8 text-muted-foreground/30"/>
                        <p className="text-xs text-muted-foreground/60">{t('scripts.noSamplesAvailable')}</p>
                      </div>) : (<div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {activeSamples.map(s => (<button key={s.name} type="button" className="w-full text-left rounded-md border bg-card px-3 py-2.5 hover:border-primary hover:bg-primary/5 transition-colors group" onClick={() => {
                                const block = `-- ${s.name}: ${s.description}\n${s.script_body}`;
                                if (appendMode) {
                                    setScriptBody(prev => prev ? prev + "\n\n" + block : block);
                                }
                                else {
                                    setScriptBody(block);
                                }
                            }}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <FileCode className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0"/>
                              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">#{s.no}</span>
                              <span className="text-xs font-semibold font-mono truncate group-hover:text-primary">{s.name}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{s.description}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                              {s.game_type && <Badge variant="secondary" className="text-[10px] font-normal px-1 py-0 capitalize">{s.game_type}</Badge>}
                            </div>
                          </button>))}
                      </div>)}
                  </>);
            })()}
            </div>
          </div>

          {/* ── Bottom: Run Script ────────────────────────────────────────── */}
          <Separator />
          <div id="section-run-payload" className="px-6 py-3 flex flex-col gap-2 scroll-mt-[60px]" style={{ height: "90vh" }}>
            <div className="flex items-center justify-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => {
                try {
                    const trimmed = runPayload.replace(/^\uFEFF/, "").trim();
                    const parsed = JSON.parse(trimmed);
                    const beautified = JSON.stringify(parsed, null, 2);
                    setRunPayload(beautified);
                    setPayloadKey(k => k + 1);
                }
                catch (e) {
                    toast({ variant: "destructive", title: "Invalid JSON", description: e instanceof Error ? e.message : "Cannot beautify invalid JSON" });
                }
            }}>
                    <Braces className="h-3.5 w-3.5"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Beautify JSON</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={savePayloadToStorage}>
                    <Save className="h-3.5 w-3.5"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t('scripts.savePayload')}</TooltipContent>
              </Tooltip>
              <Check className={`h-3.5 w-3.5 text-emerald-500 transition-opacity duration-500 ${savedPayloadFlag ? "opacity-100" : "opacity-0"}`}/>
              <Button size="sm" className="h-7 gap-1.5" onClick={handleRunScript} disabled={runningScript}>
                {runningScript ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Play className="h-3.5 w-3.5"/>}
                {t('scripts.runButton')}
              </Button>
            </div>
            <div className="flex flex-1 min-h-0 gap-3">
              {/* JSON Payload editor */}
              <div className="flex flex-col flex-1 min-w-0 gap-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5"/>
                    {t('scripts.runScript')}
                  </p>
                  <span className="font-normal normal-case text-muted-foreground/60 text-[10px]">
                    POST /api/v1/games/{gameId}/scripts/{script?.name ?? scriptId}/run
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <CodeMirror key={payloadKey} value={runPayload} onChange={handlePayloadChange} theme={vscodeDark} extensions={[json(), lintGutter(), linter(jsonLinter, { delay: 400 }), payloadKeymapExt]} basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: false,
                tabSize: 2,
            }} style={{ height: "100%", fontSize: "12px" }} className="h-full overflow-hidden rounded-lg border border-zinc-700 [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto"/>
                </div>
              </div>
              {/* Result */}
              <div className="flex flex-col flex-1 min-w-0 gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('scripts.runResult')}</p>
                  {runDuration != null && (<span className="text-[10px] text-emerald-500 font-mono tabular-nums">{runDuration}ms</span>)}
                </div>
                <div className="flex-1 min-h-0 rounded-lg border border-zinc-700 bg-[#1e1e1e] overflow-auto">
                  {runningScript ? (<div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin"/>
                      <span className="text-xs">{t('scripts.running')}</span>
                    </div>) : runResult ? (<pre className="p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all">{runResult}</pre>) : (<div className="flex items-center justify-center h-full text-muted-foreground/40">
                      <span className="text-xs">{t('scripts.runResultPlaceholder')}</span>
                    </div>)}
                </div>
              </div>
            </div>
          </div>
        </div>)}
      {/* ── Footer note ──────────────────────────────────────────────── */}
      <div className="px-6 py-4 text-center text-xs text-muted-foreground/50">
        {t('scripts.footerNote')}
      </div>

      {/* ── Floating scroll buttons ──────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="h-9 w-9 rounded-full shadow-lg bg-background/90 backdrop-blur-sm border-border/50 hover:bg-primary hover:text-primary-foreground" onClick={() => document.getElementById("section-save-script")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <Pencil className="h-4 w-4"/>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Save Scripts Body</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="h-9 w-9 rounded-full shadow-lg bg-background/90 backdrop-blur-sm border-border/50 hover:bg-primary hover:text-primary-foreground" onClick={() => document.getElementById("section-run-payload")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <Play className="h-4 w-4"/>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Run Payload</TooltipContent>
        </Tooltip>
      </div>
    </div>
    </TooltipProvider>);
}
