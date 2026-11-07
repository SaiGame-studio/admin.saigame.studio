"use client";

import { useState } from "react";
import { BookOpen, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n/use-translation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// Error codes returned by POST .../item-grants (ss-go game_api_key_item_grant_handler.go and apikey_middleware.go).
const ERROR_CODES: [number, string][] = [
    [400, "INVALID_GAMER_PROGRESS_ID"],
    [400, "INVALID_REQUEST_BODY"],
    [400, "INVALID_ITEM_CODE"],
    [400, "INVALID_QUANTITY"],
    [401, "API_KEY_REQUIRED"],
    [401, "INVALID_API_KEY"],
    [403, "API_KEY_GAME_MISMATCH"],
    [404, "GAMER_PROGRESS_NOT_FOUND"],
    [404, "ITEM_CODE_NOT_FOUND"],
    [409, "MAX_OWNED_ITEM_QUANTITY_REACHED"],
    [409, "ITEM_CONTAINER_FULL"],
    [500, "ITEM_GRANT_FAILED"],
];

function CodeBlock({ id, code }: { id: string; code: string }) {
    return <pre id={id} className="overflow-x-auto whitespace-pre rounded-md border bg-muted/50 p-3 font-mono text-xs leading-relaxed">{code}</pre>;
}

export function GameAPIKeyUsageGuide({ gameId }: { gameId: string }) {
    const { t } = useTranslation();
    const tr = (key: string) => t(`game.apiKeys.${key}`);
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const endpoint = `${API_URL}/api/v1/games/${gameId}/gamer-progress/{gamer_progress_id}/item-grants`;
    const curl = [
        `curl -X POST "${endpoint}" \\`,
        `  -H "X-API-Key: <YOUR_API_KEY>" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '{"item_code": "GOLD", "quantity": 5}'`,
    ].join("\n");
    const success = JSON.stringify({
        grant_id: "019a6b1c-3d4e-7f80-a1b2-c3d4e5f60718",
        gamer_progress_id: "0199f0aa-1b2c-7d3e-8f40-5a6b7c8d9e0f",
        item_code: "GOLD",
        quantity: 5,
    }, null, 2);
    const failure = JSON.stringify({ error: "failed to grant item", message: "", message_code: "ITEM_CODE_NOT_FOUND" }, null, 2);

    async function copyCurl() {
        try {
            await navigator.clipboard.writeText(curl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable: the command stays selectable */ }
    }

    return <>
        <button id="game-api-keys-guide-open" type="button" className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline" onClick={() => setOpen(true)}>
            <BookOpen id="game-api-keys-guide-open-icon" className="h-3.5 w-3.5" />{tr("guideLink")}
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent id="game-api-keys-guide-panel" side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-2xl">
                <SheetHeader id="game-api-keys-guide-header" className="pb-4">
                    <SheetTitle id="game-api-keys-guide-title">{tr("guideTitle")}</SheetTitle>
                    <SheetDescription id="game-api-keys-guide-intro">{tr("guideIntro")}</SheetDescription>
                </SheetHeader>
                <div id="game-api-keys-guide-body" className="space-y-6 text-sm">
                    <section id="game-api-keys-guide-endpoint" className="space-y-2">
                        <h4 id="game-api-keys-guide-endpoint-title" className="font-semibold">{tr("guideEndpointTitle")}</h4>
                        <CodeBlock id="game-api-keys-guide-endpoint-code" code={`POST ${endpoint}`} />
                        <p id="game-api-keys-guide-endpoint-help" className="text-muted-foreground">{tr("guideEndpointHelp")}</p>
                    </section>
                    <section id="game-api-keys-guide-auth" className="space-y-2">
                        <h4 id="game-api-keys-guide-auth-title" className="font-semibold">{tr("guideAuthTitle")}</h4>
                        <CodeBlock id="game-api-keys-guide-auth-code" code={"X-API-Key: <YOUR_API_KEY>"} />
                        <p id="game-api-keys-guide-auth-help" className="text-muted-foreground">{tr("guideAuthHelp")}</p>
                    </section>
                    <section id="game-api-keys-guide-body-section" className="space-y-2">
                        <h4 id="game-api-keys-guide-body-title" className="font-semibold">{tr("guideBodyTitle")}</h4>
                        <CodeBlock id="game-api-keys-guide-body-code" code={JSON.stringify({ item_code: "GOLD", quantity: 5 }, null, 2)} />
                        <ul id="game-api-keys-guide-body-rules" className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li id="game-api-keys-guide-body-rule-item-code">{tr("guideBodyItemCode")}</li>
                            <li id="game-api-keys-guide-body-rule-quantity">{tr("guideBodyQuantity")}</li>
                            <li id="game-api-keys-guide-body-rule-strict">{tr("guideBodyStrict")}</li>
                        </ul>
                    </section>
                    <section id="game-api-keys-guide-example" className="space-y-2">
                        <div id="game-api-keys-guide-example-heading" className="flex items-center justify-between gap-2">
                            <h4 id="game-api-keys-guide-example-title" className="font-semibold">{tr("guideExampleTitle")}</h4>
                            <Button id="game-api-keys-guide-example-copy" variant="outline" size="sm" onClick={() => void copyCurl()}>
                                <Copy id="game-api-keys-guide-example-copy-icon" className="mr-1.5 h-3.5 w-3.5" />{tr(copied ? "copied" : "copy")}
                            </Button>
                        </div>
                        <CodeBlock id="game-api-keys-guide-example-code" code={curl} />
                    </section>
                    <section id="game-api-keys-guide-response" className="space-y-2">
                        <h4 id="game-api-keys-guide-response-title" className="font-semibold">{tr("guideResponseTitle")}</h4>
                        <p id="game-api-keys-guide-response-success-label" className="text-muted-foreground">{tr("guideResponseSuccess")}</p>
                        <CodeBlock id="game-api-keys-guide-response-success-code" code={success} />
                        <p id="game-api-keys-guide-response-failure-label" className="text-muted-foreground">{tr("guideResponseFailure")}</p>
                        <CodeBlock id="game-api-keys-guide-response-failure-code" code={failure} />
                    </section>
                    <section id="game-api-keys-guide-errors" className="space-y-2">
                        <h4 id="game-api-keys-guide-errors-title" className="font-semibold">{tr("guideErrorsTitle")}</h4>
                        <div id="game-api-keys-guide-errors-wrapper" className="overflow-x-auto rounded-md border">
                            <table id="game-api-keys-guide-errors-table" className="w-full text-xs">
                                <thead id="game-api-keys-guide-errors-head" className="bg-muted/50 text-left"><tr id="game-api-keys-guide-errors-heading-row">
                                    <th id="game-api-keys-guide-errors-column-status" className="px-3 py-2 font-medium">HTTP</th>
                                    <th id="game-api-keys-guide-errors-column-code" className="px-3 py-2 font-medium">message_code</th>
                                    <th id="game-api-keys-guide-errors-column-meaning" className="px-3 py-2 font-medium">{tr("guideErrorsMeaning")}</th>
                                </tr></thead>
                                <tbody id="game-api-keys-guide-errors-body">{ERROR_CODES.map(([status, code]) => <tr id={`game-api-keys-guide-error-${code.toLowerCase().replace(/_/g, "-")}`} key={code} className="border-t">
                                    <td id={`game-api-keys-guide-error-status-${code.toLowerCase().replace(/_/g, "-")}`} className="px-3 py-2 tabular-nums">{status}</td>
                                    <td id={`game-api-keys-guide-error-code-${code.toLowerCase().replace(/_/g, "-")}`} className="px-3 py-2 font-mono">{code}</td>
                                    <td id={`game-api-keys-guide-error-meaning-${code.toLowerCase().replace(/_/g, "-")}`} className="px-3 py-2 text-muted-foreground">{tr(`guideError.${code}`)}</td>
                                </tr>)}</tbody>
                            </table>
                        </div>
                    </section>
                    <section id="game-api-keys-guide-notes" className="space-y-2 pb-2">
                        <h4 id="game-api-keys-guide-notes-title" className="font-semibold">{tr("guideNotesTitle")}</h4>
                        <ul id="game-api-keys-guide-notes-list" className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li id="game-api-keys-guide-note-server-only">{tr("guideNoteServerOnly")}</li>
                            <li id="game-api-keys-guide-note-add-only">{tr("guideNoteAddOnly")}</li>
                            <li id="game-api-keys-guide-note-retry">{tr("guideNoteRetry")}</li>
                            <li id="game-api-keys-guide-note-logs">{tr("guideNoteLogs")}</li>
                        </ul>
                    </section>
                </div>
            </SheetContent>
        </Sheet>
    </>;
}
