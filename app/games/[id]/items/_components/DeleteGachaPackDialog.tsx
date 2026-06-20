"use client";

import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { GachaPack } from "@/types/inventory";

export function DeleteGachaPackDialog({
  pack,
  loading,
  onConfirm,
  onClose,
}: {
  pack: GachaPack | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const open = !!pack;
  const dialogId = `delete-gacha-pack-dialog-${pack?.id ?? "none"}`;
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const cancelId = `${dialogId}-cancel`;
  const confirmId = `${dialogId}-confirm`;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <AlertDialogContent id={dialogId} aria-labelledby={titleId} aria-describedby={descriptionId}>
        <AlertDialogHeader id={`${dialogId}-header`}>
          <AlertDialogTitle id={titleId}>
            {t("items.deletePack")} "{pack?.name}"?
          </AlertDialogTitle>
          <AlertDialogDescription id={descriptionId}>{t("items.deletePackDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter id={`${dialogId}-footer`}>
          <AlertDialogCancel id={cancelId} disabled={loading}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            id={confirmId}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
