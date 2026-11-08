"use client";

import { useMemo, useRef } from "react";
import { Bold, Italic, Heading, List, ListOrdered, Link, Image, Quote, Code, SquareCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { useTheme } from "next-themes";

interface ShopDescriptionEditorProps {
    id: string;
    labelId: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function ShopDescriptionEditor({ id, labelId, value, onChange, disabled = false }: ShopDescriptionEditorProps) {
    const { resolvedTheme } = useTheme();
    const { t } = useTranslation();
    const editor = useRef<EditorView | null>(null);
    const tools = [
        { key: "bold", icon: Bold, before: "**", after: "**" },
        { key: "italic", icon: Italic, before: "*", after: "*" },
        { key: "heading", icon: Heading, prefix: "## " },
        { key: "bulletList", icon: List, prefix: "- " },
        { key: "orderedList", icon: ListOrdered, prefix: "1. " },
        { key: "link", icon: Link, before: "[", after: "](url)" },
        { key: "image", icon: Image, before: "![", after: "](url)" },
        { key: "quote", icon: Quote, prefix: "> " },
        { key: "code", icon: Code, before: "`", after: "`" },
        { key: "codeBlock", icon: SquareCode, before: "```\n", after: "\n```" },
    ];

    function format(tool: typeof tools[number]) {
        const view = editor.current;
        if (!view || disabled) return;
        const { from, to } = view.state.selection.main;
        if (tool.prefix !== undefined) {
            const start = view.state.doc.lineAt(from).from;
            const end = view.state.doc.lineAt(to > from ? to - 1 : to).to;
            const text = view.state.doc.sliceString(start, end);
            const insert = text.split("\n").map((line) => tool.prefix + line).join("\n");
            if (view.state.doc.length + insert.length - (end - start) > 700) return;
            view.dispatch({ changes: { from: start, to: end, insert }, selection: { anchor: from + tool.prefix.length, head: to + insert.length - text.length }, userEvent: "input" });
        } else {
            const before = tool.before ?? "";
            const after = tool.after ?? "";
            if (view.state.doc.length + before.length + after.length > 700) return;
            const text = view.state.doc.sliceString(from, to);
            view.dispatch({ changes: { from, to, insert: before + text + after }, selection: { anchor: from + before.length, head: to + before.length }, userEvent: "input" });
        }
        view.focus();
    }
    const extensions = useMemo(() => [
        markdown(),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ id, "aria-labelledby": labelId }),
        EditorState.transactionFilter.of((transaction) => {
            if (transaction.docChanged && transaction.newDoc.length > 700 && transaction.newDoc.length >= transaction.startState.doc.length) return [];
            return transaction;
        }),
        EditorView.theme({
            "&": { fontSize: "14px" },
            ".cm-content": { minHeight: "156px", padding: "8px 0" },
            ".cm-line": { padding: "0 12px", lineHeight: "20px" },
            ".cm-scroller": { fontFamily: "inherit" },
        }),
    ], [id, labelId]);

    return <div id={`${id}-container`} className="overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
        <div id={`${id}-toolbar`} role="group" aria-label={t("markdownEditor.toolbar")} className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
            {tools.map((tool) => (
                <Button key={tool.key} id={`${id}-${tool.key}`} type="button" variant="ghost" size="icon" className="h-7 w-7" title={t(`markdownEditor.${tool.key}`)} aria-label={t(`markdownEditor.${tool.key}`)} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => format(tool)}>
                    <tool.icon id={`${id}-${tool.key}-icon`} className="size-3.5" />
                </Button>
            ))}
        </div>
        <CodeMirror
        id={`${id}-editor`}
        value={value}
        onChange={onChange}
        height="156px"
        theme={resolvedTheme?.includes("dark") ? vscodeDark : vscodeLight}
        extensions={extensions}
        onCreateEditor={(view) => { editor.current = view; }}
        editable={!disabled}
        readOnly={disabled}
        basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false, autocompletion: false }}
        className="[&_.cm-focused]:outline-none"
    /></div>;
}
