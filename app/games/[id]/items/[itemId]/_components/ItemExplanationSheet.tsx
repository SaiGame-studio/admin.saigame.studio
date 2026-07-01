"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n/use-translation";

export type ItemExplanationTopic = "write_props" | "update_qty" | null;

type ItemExplanationSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    topic: ItemExplanationTopic;
};

export function ItemExplanationSheet({ open, onOpenChange, topic }: ItemExplanationSheetProps) {
    const { t } = useTranslation();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent id="item-detail-explanation-sheet" side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
                <SheetHeader id="item-detail-explanation-sheet-header">
                    <SheetTitle id="item-detail-explanation-sheet-title">
                        {topic === "write_props"
                            ? t("items.explanation.writeProps.title")
                            : topic === "update_qty"
                                ? t("items.explanation.updateQty.title")
                                : t("common.support")}
                    </SheetTitle>
                </SheetHeader>

                <div id="item-detail-explanation-sheet-body" className="flex-1 overflow-y-auto py-4">
                    {topic === "write_props" ? (
                        <div id="item-detail-explanation-write-props" className="space-y-3 text-sm">
                            <div id="item-detail-explanation-write-props-summary">
                                <h3 id="item-detail-explanation-write-props-heading" className="mb-1.5 font-semibold text-foreground">
                                    {t("items.explanation.writeProps.title")}
                                </h3>
                                <p id="item-detail-explanation-write-props-description" className="text-muted-foreground">
                                    {t("items.explanation.writeProps.description")}
                                </p>
                            </div>

                            <div id="item-detail-explanation-write-props-enabled">
                                <h4 id="item-detail-explanation-write-props-enabled-heading" className="mb-1 font-medium text-foreground">
                                    {t("items.explanation.writeProps.whenEnabled")}
                                </h4>
                                <ul id="item-detail-explanation-write-props-enabled-list" className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                                    <li id="item-detail-explanation-write-props-enabled-item-1">{t("items.explanation.writeProps.enabled1")}</li>
                                    <li id="item-detail-explanation-write-props-enabled-item-2">{t("items.explanation.writeProps.enabled2")}</li>
                                    <li id="item-detail-explanation-write-props-enabled-item-3">{t("items.explanation.writeProps.enabled3")}</li>
                                </ul>
                            </div>

                            <div id="item-detail-explanation-write-props-disabled">
                                <h4 id="item-detail-explanation-write-props-disabled-heading" className="mb-1 font-medium text-foreground">
                                    {t("items.explanation.writeProps.whenDisabled")}
                                </h4>
                                <ul id="item-detail-explanation-write-props-disabled-list" className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                                    <li id="item-detail-explanation-write-props-disabled-item-1">{t("items.explanation.writeProps.disabled1")}</li>
                                    <li id="item-detail-explanation-write-props-disabled-item-2">{t("items.explanation.writeProps.disabled2")}</li>
                                    <li id="item-detail-explanation-write-props-disabled-item-3">{t("items.explanation.writeProps.disabled3")}</li>
                                </ul>
                            </div>

                            <div id="item-detail-explanation-write-props-tip" className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                <strong>{t("items.explanation.writeProps.tip")}</strong> {t("items.explanation.writeProps.tipContent")}
                            </div>
                        </div>
                    ) : null}

                    {topic === "update_qty" ? (
                        <div id="item-detail-explanation-update-qty" className="space-y-3 text-sm">
                            <div id="item-detail-explanation-update-qty-summary">
                                <h3 id="item-detail-explanation-update-qty-heading" className="mb-1.5 font-semibold text-foreground">
                                    {t("items.explanation.updateQty.title")}
                                </h3>
                                <p id="item-detail-explanation-update-qty-description" className="text-muted-foreground">
                                    {t("items.explanation.updateQty.description")}
                                </p>
                            </div>

                            <div id="item-detail-explanation-update-qty-enabled">
                                <h4 id="item-detail-explanation-update-qty-enabled-heading" className="mb-1 font-medium text-foreground">
                                    {t("items.explanation.updateQty.whenEnabled")}
                                </h4>
                                <ul id="item-detail-explanation-update-qty-enabled-list" className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                                    <li id="item-detail-explanation-update-qty-enabled-item-1">{t("items.explanation.updateQty.enabled1")}</li>
                                    <li id="item-detail-explanation-update-qty-enabled-item-2">{t("items.explanation.updateQty.enabled2")}</li>
                                    <li id="item-detail-explanation-update-qty-enabled-item-3">{t("items.explanation.updateQty.enabled3")}</li>
                                    <li id="item-detail-explanation-update-qty-enabled-item-4">{t("items.explanation.updateQty.enabled4")}</li>
                                </ul>
                            </div>

                            <div id="item-detail-explanation-update-qty-disabled">
                                <h4 id="item-detail-explanation-update-qty-disabled-heading" className="mb-1 font-medium text-foreground">
                                    {t("items.explanation.updateQty.whenDisabled")}
                                </h4>
                                <ul id="item-detail-explanation-update-qty-disabled-list" className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                                    <li id="item-detail-explanation-update-qty-disabled-item-1">{t("items.explanation.updateQty.disabled1")}</li>
                                    <li id="item-detail-explanation-update-qty-disabled-item-2">{t("items.explanation.updateQty.disabled2")}</li>
                                    <li id="item-detail-explanation-update-qty-disabled-item-3">{t("items.explanation.updateQty.disabled3")}</li>
                                    <li id="item-detail-explanation-update-qty-disabled-item-4">{t("items.explanation.updateQty.disabled4")}</li>
                                </ul>
                            </div>

                            <div id="item-detail-explanation-update-qty-warning" className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                                <strong>{t("items.explanation.updateQty.warning")}</strong> {t("items.explanation.updateQty.warningContent")}
                            </div>
                        </div>
                    ) : null}
                </div>

                <SheetFooter id="item-detail-explanation-sheet-footer" className="border-t pt-4">
                    <Button id="item-detail-explanation-sheet-close" variant="outline" onClick={() => onOpenChange(false)}>
                        {t("common.close")}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
