"use client";
import * as React from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport, } from "@/components/ui/toast";
const TOAST_DURATION_MS = 5000;
function reactNodeToText(node: React.ReactNode): string {
    if (node == null || typeof node === "boolean")
        return "";
    if (typeof node === "string" || typeof node === "number")
        return String(node);
    if (Array.isArray(node))
        return node.map(reactNodeToText).join("");
    if (React.isValidElement(node)) {
        return reactNodeToText((node.props as {
            children?: React.ReactNode;
        }).children);
    }
    return "";
}
function findOpenDialog(): HTMLElement | null {
    // Radix Dialog/AlertDialog (shadcn Sheet uses Dialog) marks the active
    // element with role="dialog"|"alertdialog" and data-state="open".
    // If multiple are open (nested), the innermost is the active focus trap —
    // take the last one in document order.
    const nodes = document.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
    return nodes.length > 0 ? nodes[nodes.length - 1] : null;
}
function copyTextFallback(text: string): boolean {
    // If a Radix Dialog/Sheet is open, its focus trap will steal focus from
    // our textarea if we append to document.body — breaking execCommand('copy').
    // Append inside the open dialog so focus stays within the trap's scope.
    const container = findOpenDialog() ?? document.body;
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.opacity = "0";
    container.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    let ok = false;
    try {
        ok = document.execCommand("copy");
    }
    catch {
        ok = false;
    }
    finally {
        container.removeChild(el);
    }
    return ok;
}
function ToastCopyButton({ text }: {
    text: string;
}) {
    const [copied, setCopied] = React.useState(false);
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Always use the textarea fallback when a Radix Dialog/Sheet is open —
        // navigator.clipboard.writeText can silently fail when the document's
        // active element is being redirected by a focus trap.
        const dialogOpen = !!findOpenDialog();
        let ok = false;
        if (!dialogOpen && navigator.clipboard?.writeText) {
            try {
                navigator.clipboard.writeText(text).catch(() => copyTextFallback(text));
                ok = true;
            }
            catch {
                ok = copyTextFallback(text);
            }
        }
        else {
            ok = copyTextFallback(text);
        }
        if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        }
    };
    return (<button type="button" onClick={handleClick} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} title="Copy" aria-label="Copy notification text" className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors group-[.destructive]:text-red-200 group-[.destructive]:hover:text-red-50 group-[.destructive]:hover:bg-red-500/20">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500"/> : <Copy className="h-3.5 w-3.5"/>}
    </button>);
}
export function Toaster() {
    const { toasts } = useToast();
    return (<ToastProvider swipeDirection="left" duration={TOAST_DURATION_MS}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
            const copyText = [reactNodeToText(title), reactNodeToText(description)]
                .filter(Boolean)
                .join("\n");
            return (<Toast key={id} {...props}>
            <div className="grid gap-1 flex-1 min-w-0 select-text" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              {title && (<ToastTitle className="flex items-center gap-1.5">
                  <span className="flex-1 min-w-0">{title}</span>
                  {copyText && <ToastCopyButton text={copyText}/>}
                </ToastTitle>)}
              {description && (<ToastDescription>{description}</ToastDescription>)}
            </div>
            {action}
            <ToastClose />
          </Toast>);
        })}
      <ToastViewport />
    </ToastProvider>);
}
