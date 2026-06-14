"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, Loader2, Code2, Pencil, Hammer, Trash2, ChevronDown, ChevronRight, BookMarked, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, } from "@/components/ui/sheet";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList, } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { CopyButton } from "@/components/CopyButton";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { GameNavButtons } from "@/components/GameNavButtons";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getGame } from "@/lib/game-api";
import { listScripts, createScript, updateScript, deleteScript } from "@/lib/script-api";
import type { Game } from "@/types/game";
import type { GameScript, CreateScriptRequest } from "@/types/script";
function VersionBadge({ version }: {
    version: number;
}) {
    return (<span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border font-mono">
      v{version}
    </span>);
}
interface ScriptRowProps {
    script: GameScript;
    expanded: boolean;
    onToggle: () => void;
    onUpdated: (s: GameScript) => void;
    onDeleteRequested: (s: GameScript) => void;
    libCount: number;
    maxLibs: number;
}
function ScriptRow({ script, expanded, onToggle, onUpdated, onDeleteRequested, libCount, maxLibs }: ScriptRowProps) {
    const { toast } = useToast();
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const router = useRouter();
    async function toggleActive() {
        try {
            const updated = await updateScript(script.game_id, script.id, { is_active: !script.is_active });
            onUpdated(updated);
        }
        catch (err: unknown) {
            toast({ variant: "destructive", title: t('scripts.toastFailedToggle'), description: err instanceof Error ? err.message : undefined });
        }
    }
    async function toggleLibrary() {
        if (!script.is_library && libCount >= maxLibs) {
            toast({ variant: "destructive", title: t('scripts.toastLibraryLimit', { max: maxLibs }) });
            return;
        }
        try {
            const updated = await updateScript(script.game_id, script.id, { is_library: !script.is_library });
            onUpdated(updated);
        }
        catch (err: unknown) {
            toast({ variant: "destructive", title: t('scripts.toastFailedToggleLibrary'), description: err instanceof Error ? err.message : undefined });
        }
    }
    return (<div className={`bg-card transition-opacity ${!script.is_active ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={onToggle}>
        {/* Expand toggle */}
        <div className="w-[20px] shrink-0 flex justify-center">
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground"/> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground"/>}
        </div>

        {/* Version */}
        <div className="w-[36px] shrink-0 flex justify-center">
          <VersionBadge version={script.version}/>
        </div>

        {/* Name */}
        <div className="w-[180px] shrink-0 min-w-0 flex items-center gap-1">
          <p className="font-semibold text-sm truncate">{script.name}</p>
          <CopyButton text={script.name}/>
        </div>

        {/* Description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{script.description || <span className="italic opacity-50">—</span>}</p>
        </div>

        {/* Updated at */}
        <div className="w-[130px] shrink-0 text-xs text-muted-foreground tabular-nums">
          {new Date(script.updated_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
        </div>

        {/* Active switch */}
        <div className="w-[48px] shrink-0 flex justify-center" onClick={e => e.stopPropagation()}>
          <Switch checked={script.is_active} onCheckedChange={toggleActive}/>
        </div>

        {/* Library toggle */}
        <div className="w-[48px] shrink-0 flex justify-center" onClick={e => e.stopPropagation()}>
          <Switch checked={script.is_library} onCheckedChange={toggleLibrary} disabled={!script.is_library && libCount >= maxLibs} title={script.is_library ? t('scripts.demoteLibrary') : (!script.is_library && libCount >= maxLibs ? t('scripts.libraryLimitReached', { max: maxLibs }) : t('scripts.promoteLibrary'))}/>
        </div>

        {/* Actions column */}
        <div className="w-16 shrink-0 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title={t('scripts.editScript')} onClick={() => router.push(`/games/${script.game_id}/scripts/${script.id}`)}>
            <Pencil className="h-4 w-4"/>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title={t('common.delete')} onClick={() => onDeleteRequested(script)}>
            <Trash2 className="h-4 w-4"/>
          </Button>
        </div>
      </div>

      {/* Expanded script preview */}
      {expanded && (<div className="px-4 pb-4 pt-0">
          <div style={{
                all: "initial",
                display: "block",
                fontFamily: "'Fira Mono', 'Consolas', monospace",
                fontSize: "12px",
                lineHeight: 1.5,
                borderRadius: "6px",
                overflow: "hidden",
                border: "1px solid #3c3c3c",
            }}>
            <CodeMirror value={script.script_body || "-- (empty)"} readOnly editable={false} theme={vscodeDark} extensions={[StreamLanguage.define(lua)]} basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: false,
                bracketMatching: false,
                closeBrackets: false,
                autocompletion: false,
                highlightActiveLine: false,
                highlightSelectionMatches: false,
            }} style={{ fontSize: "12px" }} className="[&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:max-h-[36rem]"/>
          </div>
        </div>)}
    </div>);
}
const DEFAULT_SCRIPT_BODY = "-- Lua script";
const MAX_LIBS = 7;
const defaultForm: CreateScriptRequest = {
    name: "",
    description: "",
    script_body: DEFAULT_SCRIPT_BODY,
};
export default function ScriptsPage() {
    const params = useParams() as {
        id: string;
    };
    const router = useRouter();
    const { toast } = useToast();
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const gameId = params.id;
    const [game, setGame] = useState<Game | null>(null);
    const [scripts, setScripts] = useState<GameScript[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Create sheet
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState<CreateScriptRequest>(defaultForm);
    const [formError, setFormError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [triggerOpen, setTriggerOpen] = useState(false);
    // Delete confirmation
    const [deletingScript, setDeletingScript] = useState<GameScript | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    // Accordion expand
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const libCount = scripts.filter(s => s.is_library).length;
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [g, s] = await Promise.all([
                getGame(gameId).catch(() => null),
                listScripts(gameId),
            ]);
            if (g)
                setGame(g);
            setScripts(Array.isArray(s) ? s : []);
        }
        catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('scripts.toastFailedLoad'));
        }
        finally {
            setLoading(false);
        }
    }, [gameId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);
    function handleUpdated(updated: GameScript) {
        setScripts(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
    async function handleDeleteConfirm() {
        if (!deletingScript)
            return;
        setIsDeleting(true);
        try {
            await deleteScript(gameId, deletingScript.id);
            setScripts(prev => prev.filter(s => s.id !== deletingScript.id));
            toast({ title: t('scripts.toastScriptDeleted'), description: deletingScript.name });
            setDeletingScript(null);
            // Refresh usage/limits
            getGame(gameId).then(g => setGame(g)).catch(() => null);
        }
        catch (err: unknown) {
            toast({
                variant: "destructive",
                title: t('scripts.toastFailedDelete'),
                description: err instanceof Error ? err.message : t('common.unknownError')
            });
        }
        finally {
            setIsDeleting(false);
        }
    }
    function validateForm(): string | null {
        if (!form.name.trim())
            return t('scripts.validationNameRequired');
        return null;
    }
    async function handleCreate() {
        const err = validateForm();
        if (err) {
            setFormError(err);
            return;
        }
        setFormError(null);
        setCreating(true);
        try {
            const created = await createScript(gameId, {
                name: form.name.trim(),
                description: form.description.trim(),
                script_body: form.script_body,
            });
            setScripts(prev => [created, ...prev]);
            setCreateOpen(false);
            setForm(defaultForm);
            toast({ title: t('scripts.toastScriptCreated'), description: created.name });
            // Refresh usage/limits
            getGame(gameId).then(g => setGame(g)).catch(() => null);
        }
        catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : t('scripts.toastFailedCreate'));
        }
        finally {
            setCreating(false);
        }
    }
    return (<div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb>
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
              <span>{t('scripts.breadcrumbScripts')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4"/>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Code2 className="h-7 w-7 text-muted-foreground"/>
              {t('scripts.pageTitle')}
            </h1>
            <div className="text-muted-foreground flex items-center gap-2">
              {game && game.limits?.max_scripts != null
            ? (() => {
                const max = game.limits.max_scripts;
                const used = game.usage?.scripts ?? scripts.length;
                const pct = Math.min((used / max) * 100, 100);
                return <>
                    <span className={used >= max ? "text-destructive font-medium" : "text-sm"}>
                      {used.toLocaleString()} / {max.toLocaleString()} {t('scripts.scriptsUnit')}
                    </span>
                    <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                      <span className={`block h-full rounded-full transition-all ${used >= max ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }}/>
                    </span>
                    <Link href={`/games/${gameId}/plugins`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors" title="Manage plugins / raise limits">
                      <Hammer className="h-3.5 w-3.5"/>
                    </Link>
                  </>;
            })()
            : <p className="text-sm">
                    {scripts.length} {scripts.length !== 1 ? t('scripts.scriptCountPlural') : t('scripts.scriptCount')}
                    {game ? ` · ${game.name}` : ""}
                  </p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <GameNavButtons gameId={gameId} active="scripts"/>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span>
            {scripts.length > 0
            ? `${scripts.length} ${scripts.length !== 1 ? t('scripts.scriptsDefinedPlural') : t('scripts.scriptsDefinedSingular')}`
            : t('scripts.noScriptsYet')}
          </span>
          {scripts.length > 0 && (<span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${libCount >= MAX_LIBS
                ? "border-destructive/50 text-destructive bg-destructive/10"
                : libCount > 0
                    ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                    : "border-border text-muted-foreground"}`}>
              <BookMarked className="h-3 w-3"/>
              {libCount} / {MAX_LIBS} {t('scripts.libraryCounter')}
            </span>)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>
          </Button>
          <Button size="sm" onClick={() => { setForm(defaultForm); setFormError(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1"/>
            {t('scripts.newScript')}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (<Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>)}

      {/* Content */}
      {loading ? (<div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin"/>
          <span className="text-sm">{t('scripts.loadingScripts')}</span>
        </div>) : scripts.length === 0 ? (<div className="py-16 text-center">
          <Code2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30"/>
          <p className="text-sm text-muted-foreground">{t('scripts.emptyTitle')}</p>
          <Button size="sm" className="mt-4" onClick={() => { setForm(defaultForm); setFormError(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1"/>
            {t('scripts.newScript')}
          </Button>
        </div>) : (<div className="border rounded-lg overflow-hidden">
          {/* Column header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="w-[20px] shrink-0"/>
            <div className="w-[36px] shrink-0 text-center">{t('scripts.tableHeaderVer')}</div>
            <div className="w-[180px] shrink-0">{t('scripts.tableHeaderName')}</div>
            <div className="flex-1">{t('scripts.tableHeaderDescription')}</div>
            <div className="w-[130px] shrink-0">{t('scripts.tableHeaderUpdatedAt')}</div>
            <div className="w-[48px] shrink-0 text-center">{t('scripts.tableHeaderActive')}</div>
            <div className="w-[48px] shrink-0 text-center">{t('scripts.tableHeaderLibrary')}</div>
            <div className="w-16 shrink-0"/>
          </div>
          <div className="divide-y">
            {scripts.map(script => (<ScriptRow key={script.id} script={script} expanded={expandedId === script.id} onToggle={() => setExpandedId(id => id === script.id ? null : script.id)} onUpdated={handleUpdated} onDeleteRequested={setDeletingScript} libCount={libCount} maxLibs={MAX_LIBS}/>))}
          </div>
        </div>)}

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={open => {
            if (!creating)
                setCreateOpen(open);
        }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5"/>
              {t('scripts.createTitle')}
            </SheetTitle>
            <SheetDescription>
              {t('scripts.createDescription')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="s-name">{t('scripts.labelName')} <span className="text-destructive">*</span></Label>
              <Input id="s-name" placeholder={t('scripts.placeholderName')} value={form.name} onChange={e => {
            // Sanitize on the fly: strip everything that's not a-z, 0-9, or _
            // and prevent leading digit (replace leading digit with empty)
            let val = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "");
            if (/^[0-9]/.test(val))
                val = val.replace(/^[0-9]+/, "");
            setForm(f => ({ ...f, name: val }));
        }} className="font-mono"/>
              <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('scripts.nameHint') }}/>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="s-desc">{t('scripts.labelDescription')}</Label>
              <Input id="s-desc" placeholder={t('scripts.placeholderDescription')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
            </div>

            {/* Error */}
            {formError && (<Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>)}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              {t('scripts.btnCancel')}
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Plus className="h-4 w-4 mr-2"/>}
              {t('scripts.btnCreateScript')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingScript} onOpenChange={(v) => !v && setDeletingScript(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('scripts.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('scripts.deleteDescription')} <span className="font-mono text-primary font-bold">{deletingScript?.name}</span>? {t('scripts.deleteCannotUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2"/>}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);
}
