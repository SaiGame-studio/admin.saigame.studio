"use client";
import { useId, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
interface CopyButtonProps {
    text: string;
    className?: string;
    id?: string;
    iconId?: string;
    label?: string;
    /** Icon size class (default: "h-3.5 w-3.5") */
    size?: string;
}
export function CopyButton({ text, className, id, iconId, label = "Copy", size = "h-3.5 w-3.5" }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const generatedTooltipId = useId();
    function handleCopy(e: React.MouseEvent) {
        e.stopPropagation();
        e.preventDefault();
        const fallback = () => {
            // Append inside the closest dialog/sheet (focus trap) so focus isn't stolen
            const container = (e.currentTarget as HTMLElement).closest('[role="dialog"]') || document.body;
            const el = document.createElement("textarea");
            el.value = text;
            el.style.position = "fixed";
            el.style.opacity = "0";
            el.style.left = "-9999px";
            container.appendChild(el);
            el.focus();
            el.select();
            document.execCommand("copy");
            container.removeChild(el);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => { fallback(); });
        }
        else {
            fallback();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    return (<TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button id={id} onClick={handleCopy} className={`ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors${className ? ` ${className}` : ""}`} aria-label={label} type="button">
            {copied
                ? <Check id={iconId} className={`${size} text-green-500`}/>
                : <Copy id={iconId} className={size}/>}
          </button>
        </TooltipTrigger>
        <TooltipContent id={id ? `${id}-tooltip` : generatedTooltipId} side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>);
}
