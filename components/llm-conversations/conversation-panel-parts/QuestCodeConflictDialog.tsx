'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Hammer, PackagePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuestDefinition } from '@/lib/quest-api';

interface QuestCodeConflictDialogProps {
  open: boolean;
  gameId: string;
  existing: QuestDefinition | null;
  pending: {
    questDefinition: Record<string, unknown>;
    turnId: string;
    responseIdx: number;
    questDefinitionIdx: number;
  } | null;
  newCodeInput: string;
  onNewCodeInputChange: (value: string) => void;
  onUpdate: () => void;
  onSaveNew: (newCodeName: string) => void;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string;
}

export function QuestCodeConflictDialog({
  open,
  gameId,
  existing,
  pending,
  newCodeInput,
  onNewCodeInputChange,
  onUpdate,
  onSaveNew,
  onOpenChange,
  t,
}: QuestCodeConflictDialogProps) {
  useEffect(() => {
    if (open && existing?.code_name) {
      onNewCodeInputChange(`${existing.code_name}_2`);
      return;
    }

    if (!open) {
      onNewCodeInputChange('');
    }
  }, [open, existing?.code_name, onNewCodeInputChange]);

  const questCodeConflictDescription = existing
    ? t('llmConversation.questCodeConflictDesc').replace('{code}', existing.code_name ?? '')
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="quest-code-conflict-dialog-root">
        <DialogHeader id="quest-code-conflict-dialog-header">
          <DialogTitle id="quest-code-conflict-dialog-title">{t('llmConversation.questCodeConflictTitle')}</DialogTitle>
          <DialogDescription id="quest-code-conflict-dialog-desc">
            {questCodeConflictDescription}
          </DialogDescription>
        </DialogHeader>

        {existing && (
          <Link
            id="quest-code-conflict-existing-link"
            href={`/games/${gameId}/quests?editQuestId=${existing.id}&noconvpanel=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Hammer id="quest-code-conflict-existing-link-icon" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span id="quest-code-conflict-existing-link-name" className="flex-1 truncate">
              {existing.name}
            </span>
            <code id="quest-code-conflict-existing-link-code" className="rounded bg-muted-foreground/20 px-1 text-xs">
              {existing.code_name ?? ''}
            </code>
            <ExternalLink id="quest-code-conflict-existing-link-ext-icon" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Link>
        )}

        <Button
          id="quest-code-conflict-update-btn"
          type="button"
          onClick={onUpdate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-black"
          disabled={!existing || !pending}
        >
          <Hammer id="quest-code-conflict-update-icon" className="h-4 w-4" />
          {t('llmConversation.questCodeConflictUpdate')}
        </Button>

        <div id="quest-code-conflict-divider" className="relative flex items-center gap-2">
          <div id="quest-code-conflict-divider-left" className="flex-1 border-t border-border" />
          <span id="quest-code-conflict-divider-label" className="text-xs text-muted-foreground">
            {t('common.or')}
          </span>
          <div id="quest-code-conflict-divider-right" className="flex-1 border-t border-border" />
        </div>

        <div id="quest-code-conflict-save-new-section" className="space-y-2">
          <Label
            id="quest-code-conflict-new-code-label"
            htmlFor="quest-code-conflict-new-code-input"
            className="text-xs text-muted-foreground"
          >
            {t('llmConversation.questCodeConflictNewCodeLabel')}
          </Label>
          <Input
            id="quest-code-conflict-new-code-input"
            value={newCodeInput}
            onChange={(e) => onNewCodeInputChange(e.target.value)}
            className="font-mono"
          />
          <Button
            id="quest-code-conflict-save-new-btn"
            type="button"
            onClick={() => onSaveNew(newCodeInput)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-black"
            disabled={!pending}
          >
            <PackagePlus id="quest-code-conflict-save-new-icon" className="h-4 w-4" />
            {t('llmConversation.questCodeConflictSaveNew')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
