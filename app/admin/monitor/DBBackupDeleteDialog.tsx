"use client";

import { Loader2, Trash2 } from "lucide-react";
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

interface DBBackupDeleteDialogProps {
  id: string;
  fileName: string | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DBBackupDeleteDialog({
  id,
  fileName,
  loading,
  onCancel,
  onConfirm,
}: DBBackupDeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog
      open={fileName !== null}
      onOpenChange={(open) => {
        if (!open && !loading) onCancel();
      }}
    >
      <AlertDialogContent id={id}>
        <AlertDialogHeader id={`${id}-header`}>
          <AlertDialogTitle id={`${id}-title`}>
            {t("dbBackups.deleteConfirmTitle") || "Delete backup file?"}
          </AlertDialogTitle>
          <AlertDialogDescription id={`${id}-description`}>
            {(t("dbBackups.deleteConfirmDescription") || "Delete {file}? This action cannot be undone.").replace("{file}", fileName || "")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter id={`${id}-footer`}>
          <AlertDialogCancel id={`${id}-cancel-btn`} disabled={loading}>
            {t("dbBackups.confirmCancel") || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            id={`${id}-confirm-btn`}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {loading ? (
              <Loader2 id={`${id}-confirm-loader`} className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 id={`${id}-confirm-icon`} className="mr-2 h-4 w-4" />
            )}
            <span id={`${id}-confirm-label`}>
              {t("dbBackups.deleteConfirmAction") || "Delete file"}
            </span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
