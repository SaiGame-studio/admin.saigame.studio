"use client"

import { Suspense, useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useCapabilities } from "@/hooks/use-capabilities"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft, Star, Clock, FileText, Tag, ShieldAlert,
  Save, Loader2, Eye, Pencil, Bold, Italic, Heading, List, ListOrdered,
  Link as LinkIcon, Image, Code, Quote, Minus, X, Plus,
} from "lucide-react"
import Link from "next/link"
import { getCmsContent, updateCmsContent, toggleCmsContentPublish, listCategoryTree, getContentTranslations, autoTranslateCmsContent, CmsContent, ContentCategory, ContentTranslationSummary } from "@/lib/admin-api"
import CodeMirror from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { json } from "@codemirror/lang-json"
import { EditorView } from "@codemirror/view"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const SUPPORTED_LANGS = ["en", "vi", "ja"]

function statusBadgeVariant(status: string) {
  switch (status) {
    case "published": return "default" as const
    case "draft": return "secondary" as const
    case "archived": return "outline" as const
    default: return "secondary" as const
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

// Markdown toolbar helpers
function wrapSelection(view: EditorView | null, before: string, after: string) {
  if (!view) return
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: to + before.length },
  })
  view.focus()
}

function insertAtCursor(view: EditorView | null, text: string) {
  if (!view) return
  const { from } = view.state.selection.main
  view.dispatch({ changes: { from, insert: text }, selection: { anchor: from + text.length } })
  view.focus()
}

function prefixLine(view: EditorView | null, prefix: string) {
  if (!view) return
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  view.dispatch({ changes: { from: line.from, insert: prefix } })
  view.focus()
}

function CmsDetailInner() {
  const router = useRouter()
  const params = useParams()
  const capabilities = useCapabilities()
  const { toast } = useToast()

  const id = params.id as string

  const [content, setContent] = useState<CmsContent | null>(null)
  const [translations, setTranslations] = useState<ContentTranslationSummary[]>([])
  const [rootId, setRootId] = useState<string | null>(null)
  const [translating, setTranslating] = useState<string | null>(null) // lang being auto-translated
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  // Editable fields
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string; depth: number }[]>([])
  const [description, setDescription] = useState("")
  const [body, setBody] = useState("")
  const [featured, setFeatured] = useState(false)
  const [changeLog, setChangeLog] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState<string[]>([])
  const [seoKeywordInput, setSeoKeywordInput] = useState("")
  const [metadataJson, setMetadataJson] = useState("")

  // Editor ref
  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const editorRef = useRef<HTMLLabelElement>(null)

  useEffect(() => {
    function flattenTree(cats: ContentCategory[], depth = 0): { value: string; label: string; depth: number }[] {
      const result: { value: string; label: string; depth: number }[] = []
      for (const cat of cats) {
        result.push({ value: cat.id, label: cat.name, depth })
        if (cat.children?.length) result.push(...flattenTree(cat.children, depth + 1))
      }
      return result
    }
    listCategoryTree().then(tree => setCategoryOptions(flattenTree(tree))).catch(() => {})
  }, [])

  // Track dirty state
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!capabilities.is_super_admin) router.push("/")
  }, [capabilities, router])

  const populateForm = useCallback((c: CmsContent) => {
    setTitle(c.title || "")
    setSlug(c.slug || "")
    setCategoryId(c.category_id ?? null)
    setDescription(c.description || "")
    setBody(c.body || "")
    setFeatured(c.featured || false)
    setChangeLog(c.change_log || "")
    setSeoTitle(c.seo_title || "")
    setSeoDescription(c.seo_description || "")
    setSeoKeywords(c.seo_keywords || [])
    setMetadataJson(c.metadata ? JSON.stringify(c.metadata, null, 2) : "{}")
    setDirty(false)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await getCmsContent(id)
        setContent(result)
        populateForm(result)
      } catch (err) {
        console.error("Failed to load content", err)
        setError("Failed to load content")
      } finally {
        setLoading(false)
      }
      // Translations are non-critical — load separately
      try {
        const transResult = await getContentTranslations(id)
        setTranslations(transResult.translations)
        setRootId(transResult.root_id)
      } catch {
        // ignore — translations endpoint may not exist for this content
      }
    }
    if (id && capabilities.is_super_admin) load()
  }, [id, capabilities.is_super_admin, populateForm])

  const markDirty = () => setDirty(true)

  const handleAddSeoKeyword = () => {
    const k = seoKeywordInput.trim()
    if (k && !seoKeywords.includes(k)) { setSeoKeywords([...seoKeywords, k]); markDirty() }
    setSeoKeywordInput("")
  }

  const handleRemoveSeoKeyword = (kw: string) => {
    setSeoKeywords(seoKeywords.filter((k) => k !== kw))
    markDirty()
  }

  const handleSave = async () => {
    let parsedMetadata: Record<string, unknown> = {}
    try {
      parsedMetadata = JSON.parse(metadataJson)
    } catch {
      toast({ title: "Invalid JSON", description: "Metadata must be valid JSON.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const updated = await updateCmsContent(id, {
        title,
        slug,
        language: content.language,
        description,
        category_id: categoryId,
        featured,
        body,
        change_log: changeLog,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_keywords: seoKeywords,
        metadata: parsedMetadata,
      })
      setContent(updated)
      setDirty(false)
      toast({ title: "Saved", description: "Content updated successfully." })
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublish = async () => {
    if (!content) return
    const action = content.status === "published" ? "unpublish" : "publish"
    setPublishing(true)
    try {
      const updated = await toggleCmsContentPublish(id, action)
      setContent((prev) => prev ? { ...prev, status: updated.status } : prev)
      toast({ title: action === "publish" ? "Published" : "Unpublished", description: `Content is now ${updated.status}.` })
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setPublishing(false)
    }
  }

  if (!capabilities.is_super_admin) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/admin/cms")}>
          <ArrowLeft className="h-4 w-4" />
          Back to CMS
        </Button>
        <div className="flex items-center gap-2">
          {content && (
            <>
              <span className="text-xs text-muted-foreground">v{content.version_number}</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium ${content.status === "published" ? "text-green-600" : "text-muted-foreground"}`}>
                  {publishing ? "..." : content.status === "published" ? "Published" : "Draft"}
                </span>
                <Switch
                  checked={content.status === "published"}
                  disabled={publishing}
                  onCheckedChange={handleTogglePublish}
                />
              </div>
              <Separator orientation="vertical" className="h-4" />
            </>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Language Tabs */}
      {content && (() => {
        const transMap = Object.fromEntries(translations.map(t => [t.language, t]))
        return (
          <Tabs value={content.language} className="mb-3">
            <TabsList>
              {SUPPORTED_LANGS.map(lang => {
                const trans = transMap[lang]
                const isTranslating = translating === lang
                return (
                  <TabsTrigger
                    key={lang}
                    value={lang}
                    disabled={isTranslating}
                    className="uppercase text-xs px-3"
                    onClick={async () => {
                      if (trans) {
                        if (trans.id === id) return
                        if (dirty && !window.confirm("You have unsaved changes. Switch language anyway?")) return
                        router.push(`/admin/cms/${trans.id}`)
                      } else {
                        if (dirty && !window.confirm("You have unsaved changes. Auto-translate anyway?")) return
                        setTranslating(lang)
                        try {
                          await autoTranslateCmsContent(rootId ?? id, [lang])
                          // Reload translations to get the new entry
                          const transResult = await getContentTranslations(rootId ?? id)
                          setTranslations(transResult.translations)
                          setRootId(transResult.root_id)
                          const newTrans = transResult.translations.find(t => t.language === lang)
                          if (newTrans) router.push(`/admin/cms/${newTrans.id}`)
                        } catch (err) {
                          toast({ title: "Auto-translate failed", description: String(err), variant: "destructive" })
                        } finally {
                          setTranslating(null)
                        }
                      }
                    }}
                  >
                    {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : lang}
                    {!trans && !isTranslating && <span className="ml-1 opacity-40 text-[10px]">+</span>}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        )
      })()}

      {!loading && !error && content && (
        <>
          {/* Main layout: 3/4 editor, 1/4 sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left: Title + Description + Body editor (3/4) */}
            <div className="lg:col-span-3 space-y-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markDirty() }}
                  placeholder="Title"
                  className="text-lg font-semibold h-10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); markDirty() }}
                  placeholder="slug-url"
                  className="text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); markDirty() }}
                  placeholder="Description"
                  className="text-sm"
                />
              </div>
              <Label ref={editorRef} className="text-xs text-muted-foreground">Body</Label>
              {/* Toolbar */}
              <div className="flex items-center gap-1 flex-wrap border rounded-md p-1 bg-muted/30">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Bold" onClick={() => wrapSelection(editorView, "**", "**")}>
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Italic" onClick={() => wrapSelection(editorView, "*", "*")}>
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Separator orientation="vertical" className="h-4 mx-0.5" />
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Heading 1" onClick={() => prefixLine(editorView, "# ")}>
                  <Heading className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Heading 2" onClick={() => prefixLine(editorView, "## ")}>
                  <span className="text-xs font-bold">H2</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Heading 3" onClick={() => prefixLine(editorView, "### ")}>
                  <span className="text-xs font-bold">H3</span>
                </Button>
                <Separator orientation="vertical" className="h-4 mx-0.5" />
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Bullet list" onClick={() => prefixLine(editorView, "- ")}>
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Numbered list" onClick={() => prefixLine(editorView, "1. ")}>
                  <ListOrdered className="h-3.5 w-3.5" />
                </Button>
                <Separator orientation="vertical" className="h-4 mx-0.5" />
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Link" onClick={() => wrapSelection(editorView, "[", "](url)")}>
                  <LinkIcon className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Image" onClick={() => insertAtCursor(editorView, "![alt](url)")}>
                  <Image className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Code" onClick={() => wrapSelection(editorView, "`", "`")}>
                  <Code className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Code block" onClick={() => wrapSelection(editorView, "```\n", "\n```")}>
                  <span className="text-xs font-mono">{"{}"}</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Blockquote" onClick={() => prefixLine(editorView, "> ")}>
                  <Quote className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Horizontal rule" onClick={() => insertAtCursor(editorView, "\n---\n")}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <div className="flex-1" />
                <Button
                  variant={previewMode ? "default" : "ghost"}
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {previewMode ? "Edit" : "Preview"}
                </Button>
              </div>

              {/* Editor / Preview */}
              {previewMode ? (
                <Card>
                  <CardContent className="pt-4 prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">{body || "No content."}</pre>
                  </CardContent>
                </Card>
              ) : (
                <CodeMirror
                  value={body}
                  onChange={(val) => { setBody(val); markDirty() }}
                  theme={vscodeDark}
                  extensions={[
                    markdown({ codeLanguages: languages }),
                    EditorView.lineWrapping,
                  ]}
                  onCreateEditor={(view) => setEditorView(view)}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                    highlightSelectionMatches: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: false,
                    tabSize: 2,
                  }}
                  style={{ fontSize: "14px" }}
                  className="rounded-lg border border-zinc-700 [&_.cm-editor]:outline-none [&_.cm-editor]:h-[80vh] [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:h-full"
                />
              )}
            </div>

            {/* Right: Metadata sidebar (1/4) */}
            <div className="space-y-4">
              {/* Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />Category</Label>
                    <select
                      className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
                      value={categoryId ?? ""}
                      onChange={(e) => { setCategoryId(e.target.value || null); markDirty() }}
                    >
                      <option value="">— No category —</option>
                      {categoryOptions.map((c) => (
                        <option key={c.value} value={c.value}>
                          {"\u00a0\u00a0".repeat(c.depth)}{c.depth > 0 ? "↳ " : ""}{c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(content.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Updated:</span>
                    <span>{formatDate(content.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Published:</span>
                    <span>{formatDate(content.published_at)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* SEO */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">SEO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <Input
                      value={seoTitle}
                      onChange={(e) => { setSeoTitle(e.target.value); markDirty() }}
                      placeholder="SEO title"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input
                      value={seoDescription}
                      onChange={(e) => { setSeoDescription(e.target.value); markDirty() }}
                      placeholder="SEO description"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Keywords</Label>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {seoKeywords.map((kw) => (
                        <Badge key={kw} variant="secondary" className="text-xs gap-1 pr-1">
                          {kw}
                          <button onClick={() => handleRemoveSeoKeyword(kw)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Input
                        value={seoKeywordInput}
                        onChange={(e) => setSeoKeywordInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSeoKeyword() } }}
                        placeholder="Add keyword..."
                        className="h-7 text-xs"
                      />
                      <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={handleAddSeoKeyword}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metadata & Change Log */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Change Log</Label>
                    <Input
                      value={changeLog}
                      onChange={(e) => { setChangeLog(e.target.value); markDirty() }}
                      placeholder="What changed..."
                      className="h-7 text-xs"
                    />
                  </div>
                  <CodeMirror
                    value={metadataJson}
                    onChange={(val) => { setMetadataJson(val); markDirty() }}
                    theme={vscodeDark}
                    extensions={[json(), EditorView.lineWrapping]}
                    basicSetup={{
                      lineNumbers: false,
                      foldGutter: false,
                      highlightActiveLine: false,
                      autocompletion: false,
                      tabSize: 2,
                    }}
                    style={{ fontSize: "12px" }}
                    className="rounded border border-zinc-700 [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:max-h-[200px]"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Float scroll-to-editor button */}
      {!loading && !error && content && (
        <button
          className="fixed bottom-6 right-6 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-50"
          title="Jump to editor"
          onClick={() => {
            const el = editorRef.current
            if (el) {
              const top = el.getBoundingClientRect().top + window.scrollY - 70
              window.scrollTo({ top, behavior: "smooth" })
            }
          }}
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default function CmsDetailPage() {
  return (
    <Suspense>
      <CmsDetailInner />
    </Suspense>
  )
}
