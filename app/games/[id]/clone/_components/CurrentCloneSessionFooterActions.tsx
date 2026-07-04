"use client";

import { useState } from "react";
import { Loader2, Square } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { CloneSessionRunOptionsSwitch } from "./CloneSessionRunOptionsSwitch";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

type CurrentCloneSessionFooterActionsProps = {
    deletingCurrentSession: boolean;
    runCloneSessionError: string | null;
    runningCloneSession: boolean;
    canCompleteCloneSession: boolean;
    sessionId?: string;
    initialOverwriteConflicts?: boolean;
    t: TranslationFn;
    onDelete: () => void;
    onRefreshCurrentSession: () => Promise<void>;
    onRunCloneSession: () => Promise<void>;
    onStopCloneSession: () => void;
};

export function CurrentCloneSessionFooterActions({
    deletingCurrentSession,
    runCloneSessionError,
    runningCloneSession,
    canCompleteCloneSession,
    sessionId,
    initialOverwriteConflicts,
    t,
    onDelete,
    onRefreshCurrentSession,
    onRunCloneSession,
    onStopCloneSession,
}: CurrentCloneSessionFooterActionsProps) {
    const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);


    const handlePrimaryAction = () => {
        if (canCompleteCloneSession) {
            setCompleteConfirmOpen(true);
            return;
        }

        void onRunCloneSession();
    };

    const confirmCompleteCloneSession = async () => {
        setCompleteConfirmOpen(false);
        await onRunCloneSession();
    };

    return (
        <>
            <AlertDialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
                <AlertDialogContent id="clone-game-source-current-session-complete-confirm-dialog">
                    <AlertDialogHeader id="clone-game-source-current-session-complete-confirm-header">
                        <AlertDialogTitle id="clone-game-source-current-session-complete-confirm-title">
                            {t("cloneGame.sourceGameCurrentSessionCompleteConfirmTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription id="clone-game-source-current-session-complete-confirm-description">
                            {t("cloneGame.sourceGameCurrentSessionCompleteConfirmDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter id="clone-game-source-current-session-complete-confirm-footer">
                        <AlertDialogCancel
                            id="clone-game-source-current-session-complete-confirm-cancel"
                            disabled={runningCloneSession}
                        >
                            {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            id="clone-game-source-current-session-complete-confirm-action"
                            disabled={runningCloneSession}
                            onClick={() => void confirmCompleteCloneSession()}
                        >
                            {runningCloneSession ? t("common.loading") : t("cloneGame.sourceGameCurrentSessionComplete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CardFooter id="clone-game-source-current-session-footer" className="flex flex-wrap items-center justify-between gap-2">
                <div id="clone-game-source-current-session-footer-left" className="flex flex-wrap items-center gap-2">
                    <Button
                        id="clone-game-source-current-session-delete-btn"
                        type="button"
                        variant="destructive"
                        onClick={onDelete}
                        disabled={deletingCurrentSession}
                    >
                        {deletingCurrentSession ? <Loader2 id="clone-game-source-current-session-delete-loading-icon" className="h-4 w-4 animate-spin" /> : null}
                        {deletingCurrentSession ? t("common.loading") : t("common.delete")}
                    </Button>
                </div>
                <div id="clone-game-source-current-session-footer-right" className="flex flex-wrap items-center gap-2">
                    <CloneSessionRunOptionsSwitch
                        id="clone-game-source-current-session-overwrite-conflicts-switch"
                        sessionId={sessionId}
                        initialChecked={initialOverwriteConflicts}
                        disabled={runningCloneSession || deletingCurrentSession}
                        t={t}
                        onUpdated={onRefreshCurrentSession}
                    />
                    <Button
                        id="clone-game-source-current-session-stop-btn"
                        type="button"
                        variant="outline"
                        disabled={!runningCloneSession}
                        className={runningCloneSession
                            ? "min-w-[5rem] justify-center border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            : "min-w-[5rem] justify-center border-muted text-muted-foreground opacity-50"
                        }
                        onClick={onStopCloneSession}
                    >
                        <Square id="clone-game-source-current-session-stop-icon" className="h-3.5 w-3.5 fill-current" />
                        {t("common.stop")}
                    </Button>
                    <Button
                        id="clone-game-source-current-session-run-btn"
                        type="button"
                        className="min-w-[9rem] justify-center"
                        onClick={handlePrimaryAction}
                        disabled={!sessionId || runningCloneSession || deletingCurrentSession}
                    >
                        {runningCloneSession ? <Loader2 id="clone-game-source-current-session-run-loading-icon" className="h-4 w-4 animate-spin" /> : null}
                        {runningCloneSession ? t("common.loading") : canCompleteCloneSession ? t("cloneGame.sourceGameCurrentSessionComplete") : t("cloneGame.sourceGameCurrentSessionRun")}
                    </Button>
                </div>
            </CardFooter>
            {runCloneSessionError ? (
                <div id="clone-game-source-current-session-run-error-row" className="px-6 pb-6">
                    <p id="clone-game-source-current-session-run-error" className="text-sm text-destructive">
                        {runCloneSessionError}
                    </p>
                </div>
            ) : null}
        </>
    );
}
