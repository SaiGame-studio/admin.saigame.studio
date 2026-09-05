"use client";
import { useEffect, useState } from "react";
import { Loader2, Mail, Zap, Save, Info, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { updateQuestDefinition, type QuestDefinition } from "@/lib/quest-api";
import { ApiError } from "@/lib/api-client";
import type { Game } from "@/types/game";
type DeliveryMode = "mailbox" | "direct";
const DEFAULT_TITLE_PLACEHOLDER = "Quest Reward: {quest_name}";
const DEFAULT_BODY_PLACEHOLDER = "You have completed '{quest_name}'. Claim your rewards!";
const OVERRIDE_KEYS = [
    "override_game_delivery",
    "reward_delivery",
    "mailbox_title",
    "mailbox_body",
] as const;
interface Props {
    quest: QuestDefinition;
    game: Game;
    onUpdated: (updated: QuestDefinition) => void;
}
function metaStr(meta: Record<string, unknown> | undefined, key: string): string {
    const v = meta?.[key];
    return typeof v === "string" ? v : "";
}
function metaDelivery(meta: Record<string, unknown> | undefined): DeliveryMode | null {
    const v = meta?.reward_delivery;
    return v === "mailbox" || v === "direct" ? v : null;
}
function gameDefaultMode(game: Game): DeliveryMode {
    return game.settings?.quest_reward_delivery === "direct" ? "direct" : "mailbox";
}
export function QuestDeliveryOverride({ quest, game, onUpdated }: Props) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const savedOverride = quest.metadata?.override_game_delivery === true;
    const savedMode = metaDelivery(quest.metadata) ?? gameDefaultMode(game);
    const savedTitle = metaStr(quest.metadata, "mailbox_title");
    const savedBody = metaStr(quest.metadata, "mailbox_body");
    const [override, setOverride] = useState(savedOverride);
    const [mode, setMode] = useState<DeliveryMode>(savedMode);
    const [title, setTitle] = useState(savedTitle);
    const [body, setBody] = useState(savedBody);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        setOverride(savedOverride);
        setMode(savedMode);
        setTitle(savedTitle);
        setBody(savedBody);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quest.id, quest.updated_at]);
    const dirty = override !== savedOverride ||
        (override && (mode !== savedMode || (mode === "mailbox" && (title !== savedTitle || body !== savedBody))));
    const effectiveMode: DeliveryMode = override ? mode : gameDefaultMode(game);
    const gameTitleDefault = (game.settings?.quest_mailbox_title as string) ?? "";
    const gameBodyDefault = (game.settings?.quest_mailbox_body as string) ?? "";
    const handleSave = async () => {
        setSaving(true);
        try {
            const existing = (quest.metadata ?? {}) as Record<string, unknown>;
            let nextMeta: Record<string, unknown>;
            if (!override) {
                nextMeta = Object.fromEntries(Object.entries(existing).filter(([k]) => !OVERRIDE_KEYS.includes(k as typeof OVERRIDE_KEYS[number])));
            }
            else if (mode === "direct") {
                const { mailbox_title: _t, mailbox_body: _b, ...rest } = existing;
                nextMeta = {
                    ...rest,
                    override_game_delivery: true,
                    reward_delivery: "direct",
                };
            }
            else {
                nextMeta = {
                    ...existing,
                    override_game_delivery: true,
                    reward_delivery: "mailbox",
                };
                if (title)
                    nextMeta.mailbox_title = title;
                else
                    delete nextMeta.mailbox_title;
                if (body)
                    nextMeta.mailbox_body = body;
                else
                    delete nextMeta.mailbox_body;
            }
            const updated = await updateQuestDefinition(game.id, quest.id, { metadata: nextMeta });
            onUpdated(updated);
            toast({
                title: t('common.saved'),
                description: t('quest.delivery.saved'),
            });
        }
        catch (e) {
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: e instanceof ApiError ? e.message : t('quest.delivery.failedSave'),
            });
        }
        finally {
            setSaving(false);
        }
    };
    return (<div id={`quest-delivery-override-${quest.id}`} className="quest-delivery-override border rounded-md p-3 bg-background space-y-3">
      <div id={`quest-delivery-override-header-${quest.id}`} className="quest-delivery-override-header flex items-center justify-between gap-4">
        <div id={`quest-delivery-override-summary-${quest.id}`} className="quest-delivery-override-summary flex items-center gap-2">
          <Settings2 id={`quest-delivery-override-icon-${quest.id}`} className="quest-delivery-override-icon h-4 w-4 text-muted-foreground"/>
          <span id={`quest-delivery-override-title-${quest.id}`} className="quest-delivery-override-title text-sm font-medium">{t('quest.delivery.sectionTitle')}</span>
          <Badge id={`quest-delivery-override-mode-${quest.id}`} variant="outline" className="quest-delivery-override-mode text-[10px] gap-1">
            {effectiveMode === "mailbox" ? (<>
                <Mail id={`quest-delivery-override-mailbox-icon-${quest.id}`} className="quest-delivery-override-mode-icon h-3 w-3"/>
                {t('quest.delivery.modeMailbox')}
              </>) : (<>
                <Zap id={`quest-delivery-override-direct-icon-${quest.id}`} className="quest-delivery-override-mode-icon h-3 w-3"/>
                {t('quest.delivery.modeDirect')}
              </>)}
          </Badge>
          {!override && (<span id={`quest-delivery-override-following-game-${quest.id}`} className="quest-delivery-override-following-game text-xs text-muted-foreground">
              {t('quest.delivery.followingGame')}
            </span>)}
        </div>

        <Label id={`quest-delivery-override-toggle-label-${quest.id}`} htmlFor={`override-${quest.id}`} className="quest-delivery-override-toggle-label flex items-center gap-2 text-xs cursor-pointer">
          {t('quest.delivery.overrideToggle')}
          <Switch id={`override-${quest.id}`} className="quest-delivery-override-toggle" checked={override} onCheckedChange={(v) => setOverride(v)}/>
        </Label>
      </div>

      {override && (<div id={`quest-delivery-override-options-${quest.id}`} className="quest-delivery-override-options space-y-3 pl-6 border-l-2 border-muted">
          <RadioGroup value={mode} onValueChange={(v) => {
                if (v === "mailbox" || v === "direct")
                    setMode(v);
            }} id={`quest-delivery-override-mode-options-${quest.id}`} className="quest-delivery-override-mode-options flex gap-4">
            <Label id={`quest-delivery-override-mailbox-label-${quest.id}`} htmlFor={`mode-mailbox-${quest.id}`} className="quest-delivery-override-mode-label flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem id={`mode-mailbox-${quest.id}`} value="mailbox" className="quest-delivery-override-mode-input"/>
              <Mail id={`quest-delivery-override-mailbox-option-icon-${quest.id}`} className="quest-delivery-override-mode-icon h-3.5 w-3.5"/>
              {t('quest.delivery.modeMailbox')}
            </Label>
            <Label id={`quest-delivery-override-direct-label-${quest.id}`} htmlFor={`mode-direct-${quest.id}`} className="quest-delivery-override-mode-label flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem id={`mode-direct-${quest.id}`} value="direct" className="quest-delivery-override-mode-input"/>
              <Zap id={`quest-delivery-override-direct-option-icon-${quest.id}`} className="quest-delivery-override-mode-icon h-3.5 w-3.5"/>
              {t('quest.delivery.modeDirect')}
            </Label>
          </RadioGroup>

          {mode === "mailbox" && (<div id={`quest-delivery-override-mailbox-${quest.id}`} className="quest-delivery-override-mailbox space-y-3">
              <div id={`quest-delivery-override-title-field-${quest.id}`} className="quest-delivery-override-field space-y-1.5">
                <Label id={`quest-delivery-override-title-label-${quest.id}`} htmlFor={`title-${quest.id}`} className="quest-delivery-override-label text-xs">
                  {t('quest.delivery.mailboxTitle')}
                </Label>
                <Input id={`title-${quest.id}`} value={title} onChange={(e) => setTitle(e.target.value)} className="quest-delivery-override-input h-8 text-sm"/>
                <p id={`quest-delivery-override-title-default-${quest.id}`} className="quest-delivery-override-default text-[11px] text-muted-foreground">
                  {gameTitleDefault
                    ? t('quest.delivery.defaultFromGame')
                    : t('quest.delivery.defaultFromSystem')}
                  {": "}
                  <span id={`quest-delivery-override-title-placeholder-${quest.id}`} className="quest-delivery-override-placeholder italic">{gameTitleDefault || DEFAULT_TITLE_PLACEHOLDER}</span>
                </p>
              </div>
              <div id={`quest-delivery-override-body-field-${quest.id}`} className="quest-delivery-override-field space-y-1.5">
                <Label id={`quest-delivery-override-body-label-${quest.id}`} htmlFor={`body-${quest.id}`} className="quest-delivery-override-label text-xs">
                  {t('quest.delivery.mailboxBody')}
                </Label>
                <Textarea id={`body-${quest.id}`} value={body} onChange={(e) => setBody(e.target.value)} rows={2} className="quest-delivery-override-input text-sm"/>
                <p id={`quest-delivery-override-body-default-${quest.id}`} className="quest-delivery-override-default text-[11px] text-muted-foreground">
                  {gameBodyDefault
                    ? t('quest.delivery.defaultFromGame')
                    : t('quest.delivery.defaultFromSystem')}
                  {": "}
                  <span id={`quest-delivery-override-body-placeholder-${quest.id}`} className="quest-delivery-override-placeholder italic">{gameBodyDefault || DEFAULT_BODY_PLACEHOLDER}</span>
                </p>
              </div>
            </div>)}
        </div>)}

      {!override && (<div id={`quest-delivery-override-hint-${quest.id}`} className="quest-delivery-override-hint flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info id={`quest-delivery-override-hint-icon-${quest.id}`} className="quest-delivery-override-hint-icon h-3.5 w-3.5 shrink-0 mt-0.5"/>
          <span id={`quest-delivery-override-hint-text-${quest.id}`} className="quest-delivery-override-hint-text">{t('quest.delivery.hintFollowing')}</span>
        </div>)}

      <div id={`quest-delivery-override-actions-${quest.id}`} className="quest-delivery-override-actions flex items-center justify-end gap-2">
        {dirty && (<span id={`quest-delivery-override-unsaved-${quest.id}`} className="quest-delivery-override-unsaved text-[11px] text-muted-foreground">
            {t('quest.delivery.unsaved')}
          </span>)}
        <Button id={`quest-delivery-override-save-${quest.id}`} className="quest-delivery-override-save" size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? (<Loader2 id={`quest-delivery-override-save-loading-${quest.id}`} className="quest-delivery-override-save-icon h-3.5 w-3.5 mr-1.5 animate-spin"/>) : (<Save id={`quest-delivery-override-save-icon-${quest.id}`} className="quest-delivery-override-save-icon h-3.5 w-3.5 mr-1.5"/>)}
          {t('common.save')}
        </Button>
      </div>
    </div>);
}
