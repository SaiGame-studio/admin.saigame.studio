"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";

export function TwoFactorRecoveryCodes({ id, codes, issuer, accountEmail, onContinue }: { id: string; codes: string[]; issuer: string; accountEmail: string; onContinue: () => void }) {
    const { t } = useTranslation();
    const [saved, setSaved] = useState(false);
    const [hasDownloaded, setHasDownloaded] = useState(false);
    const download = () => {
        const url = URL.createObjectURL(new Blob([`${issuer} - ${accountEmail}\n\n${codes.join("\n")}\n`], { type: "text/plain;charset=utf-8" }));
        const link = document.createElement("a");
        link.id = `${id}-download-link`;
        link.href = url; link.download = `${issuer.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-recovery-codes.txt`;
        document.body.appendChild(link); link.click(); link.remove();
        setHasDownloaded(true);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return <section id={id} className="space-y-4">
        <h3 id={`${id}-title`} className="font-semibold">{t("twoFactor.recoveryTitle")}</h3>
        <p id={`${id}-account`} className="break-all text-sm font-medium">{issuer} · {accountEmail}</p>
        <p id={`${id}-help`} className="text-sm text-muted-foreground">{t("twoFactor.recoverySaveHelp")}</p>
        <ul id={`${id}-list`} className="space-y-1 rounded bg-muted p-3 font-mono text-xs sm:text-sm">
            {codes.map((code, index) => <li id={`${id}-code-${index}`} key={index} className="break-all">{code}</li>)}
        </ul>
        <Button id={`${id}-download`} type="button" variant="outline" onClick={download}>{t("twoFactor.downloadCodes")}</Button>
        <div id={`${id}-continue-actions`} className="flex items-center gap-4">
            <Button id={`${id}-continue`} type="button" disabled={!hasDownloaded || !saved} onClick={onContinue}>{t("twoFactor.signInAgain")}</Button>
            {hasDownloaded && <label id={`${id}-saved-label`} htmlFor={`${id}-saved`} className="flex min-w-0 items-center gap-2 text-sm">
                <input id={`${id}-saved`} type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} />
                {t("twoFactor.codesSaved")}
            </label>}
        </div>
    </section>;
}
