"use client";

import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";

export type ExplanationTopic = "write_props" | "update_qty" | null;

export function ExplanationPanel({
  open,
  topic,
  onOpenChange,
}: {
  open: boolean;
  topic: ExplanationTopic;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {topic === "write_props"
              ? t("items.explanation.writeProps.title")
              : topic === "update_qty"
                ? t("items.explanation.updateQty.title")
                : t("common.support")}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          {topic === "write_props" && (
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="font-semibold text-foreground mb-1.5">{t("items.explanation.writeProps.title")}</h3>
                <p className="text-muted-foreground">{t("items.explanation.writeProps.description")}</p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">{t("items.explanation.writeProps.whenEnabled")}</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                  <li>{t("items.explanation.writeProps.enabled1")}</li>
                  <li>{t("items.explanation.writeProps.enabled2")}</li>
                  <li>{t("items.explanation.writeProps.enabled3")}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">{t("items.explanation.writeProps.whenDisabled")}</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                  <li>{t("items.explanation.writeProps.disabled1")}</li>
                  <li>{t("items.explanation.writeProps.disabled2")}</li>
                  <li>{t("items.explanation.writeProps.disabled3")}</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-blue-800 dark:text-blue-200">
                <strong>{t("items.explanation.writeProps.tip")}</strong> {t("items.explanation.writeProps.tipContent")}
              </div>
            </div>
          )}

          {topic === "update_qty" && (
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="font-semibold text-foreground mb-1.5">{t("items.explanation.updateQty.title")}</h3>
                <p className="text-muted-foreground">{t("items.explanation.updateQty.description")}</p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">{t("items.explanation.updateQty.whenEnabled")}</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                  <li>{t("items.explanation.updateQty.enabled1")}</li>
                  <li>{t("items.explanation.updateQty.enabled2")}</li>
                  <li>{t("items.explanation.updateQty.enabled3")}</li>
                  <li>{t("items.explanation.updateQty.enabled4")}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">{t("items.explanation.updateQty.whenDisabled")}</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                  <li>{t("items.explanation.updateQty.disabled1")}</li>
                  <li>{t("items.explanation.updateQty.disabled2")}</li>
                  <li>{t("items.explanation.updateQty.disabled3")}</li>
                  <li>{t("items.explanation.updateQty.disabled4")}</li>
                </ul>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-2 text-xs text-amber-800 dark:text-amber-200">
                <strong>{t("items.explanation.updateQty.warning")}</strong> {t("items.explanation.updateQty.warningContent")}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
