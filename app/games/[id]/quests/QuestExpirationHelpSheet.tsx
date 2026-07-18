"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEscapeLayer } from "@/hooks/use-escape-manager";

interface QuestExpirationHelpSheetProps {
    idScope: "create" | "edit";
    t: (key: string) => string;
}

export function QuestExpirationHelpSheet({ idScope, t }: QuestExpirationHelpSheetProps) {
    const [open, setOpen] = useState(false);
    const helpId = `quest-expiration-help-${idScope}`;
    useEscapeLayer(open, () => setOpen(false), 2);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            id={`${helpId}-trigger`}
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground"
                            aria-label={t("quest.expirationHelp.open")}
                            onClick={() => setOpen(true)}
                        >
                            <HelpCircle id={`${helpId}-trigger-icon`} className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent id={`${helpId}-tooltip`} side="top">
                        <p id={`${helpId}-tooltip-text`}>{t("quest.expirationHelp.open")}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <SheetContent id={`${helpId}-panel`} side="right" className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader id={`${helpId}-header`}>
                    <SheetTitle id={`${helpId}-title`}>{t("quest.expirationHelp.title")}</SheetTitle>
                    <SheetDescription id={`${helpId}-description`}>
                        {t("quest.expirationHelp.description")}
                    </SheetDescription>
                </SheetHeader>

                <div id={`${helpId}-content`} className="mt-6 space-y-6 text-sm">
                    <section id={`${helpId}-deadline-section`} className="space-y-2">
                        <h3 id={`${helpId}-deadline-title`} className="font-semibold">{t("quest.expirationHelp.deadlineTitle")}</h3>
                        <ul id={`${helpId}-deadline-list`} className="list-disc space-y-2 pl-5 text-muted-foreground">
                            <li id={`${helpId}-deadline-created`}>{t("quest.expirationHelp.deadlineCreated")}</li>
                            <li id={`${helpId}-deadline-types`}>{t("quest.expirationHelp.supportedTypes")}</li>
                            <li id={`${helpId}-deadline-daily`}>{t("quest.expirationHelp.dailyDeadline")}</li>
                        </ul>
                    </section>

                    <section id={`${helpId}-restart-section`} className="space-y-2">
                        <h3 id={`${helpId}-restart-title`} className="font-semibold">{t("quest.expirationHelp.restartTitle")}</h3>
                        <ul id={`${helpId}-restart-list`} className="list-disc space-y-2 pl-5 text-muted-foreground">
                            <li id={`${helpId}-restart-existing`}>{t("quest.expirationHelp.existingStart")}</li>
                            <li id={`${helpId}-restart-cancelled`}>{t("quest.expirationHelp.cancelledRestart")}</li>
                            <li id={`${helpId}-restart-update`}>{t("quest.expirationHelp.definitionUpdate")}</li>
                        </ul>
                    </section>

                    <section id={`${helpId}-expired-section`} className="space-y-2">
                        <h3 id={`${helpId}-expired-title`} className="font-semibold">{t("quest.expirationHelp.expiredTitle")}</h3>
                        <ul id={`${helpId}-expired-list`} className="list-disc space-y-2 pl-5 text-muted-foreground">
                            <li id={`${helpId}-expired-runtime`}>{t("quest.expirationHelp.runtimeStatus")}</li>
                            <li id={`${helpId}-expired-actions`}>{t("quest.expirationHelp.blockedActions")}</li>
                            <li id={`${helpId}-expired-cancel`}>{t("quest.expirationHelp.expiredCancellation")}</li>
                        </ul>
                    </section>
                </div>
            </SheetContent>
        </Sheet>
    );
}
