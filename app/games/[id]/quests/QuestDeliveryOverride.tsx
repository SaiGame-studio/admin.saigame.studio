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
            const updated = await updateQuestDefinition(game.studio_id, game.id, quest.id, { metadata: nextMeta });
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
    return (<div className="border rounded-md p-3 bg-background space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground"/>
          <span className="text-sm font-medium">{t('quest.delivery.sectionTitle')}</span>
          <Badge variant="outline" className="text-[10px] gap-1">
            {effectiveMode === "mailbox" ? (<>
                <Mail className="h-3 w-3"/>
                {t('quest.delivery.modeMailbox')}
              </>) : (<>
                <Zap className="h-3 w-3"/>
                {t('quest.delivery.modeDirect')}
              </>)}
          </Badge>
          {!override && (<span className="text-xs text-muted-foreground">
              {t('quest.delivery.followingGame')}
            </span>)}
        </div>

        <Label htmlFor={`override-${quest.id}`} className="flex items-center gap-2 text-xs cursor-pointer">
          {t('quest.delivery.overrideToggle')}
          <Switch id={`override-${quest.id}`} checked={override} onCheckedChange={(v) => setOverride(v)}/>
        </Label>
      </div>

      {override && (<div className="space-y-3 pl-6 border-l-2 border-muted">
          <RadioGroup value={mode} onValueChange={(v) => {
                if (v === "mailbox" || v === "direct")
                    setMode(v);
            }} className="flex gap-4">
            <Label htmlFor={`mode-mailbox-${quest.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem id={`mode-mailbox-${quest.id}`} value="mailbox"/>
              <Mail className="h-3.5 w-3.5"/>
              {t('quest.delivery.modeMailbox')}
            </Label>
            <Label htmlFor={`mode-direct-${quest.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem id={`mode-direct-${quest.id}`} value="direct"/>
              <Zap className="h-3.5 w-3.5"/>
              {t('quest.delivery.modeDirect')}
            </Label>
          </RadioGroup>

          {mode === "mailbox" && (<div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`title-${quest.id}`} className="text-xs">
                  {t('quest.delivery.mailboxTitle')}
                </Label>
                <Input id={`title-${quest.id}`} value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm"/>
                <p className="text-[11px] text-muted-foreground">
                  {gameTitleDefault
                    ? t('quest.delivery.defaultFromGame')
                    : t('quest.delivery.defaultFromSystem')}
                  {": "}
                  <span className="italic">{gameTitleDefault || DEFAULT_TITLE_PLACEHOLDER}</span>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`body-${quest.id}`} className="text-xs">
                  {t('quest.delivery.mailboxBody')}
                </Label>
                <Textarea id={`body-${quest.id}`} value={body} onChange={(e) => setBody(e.target.value)} rows={2} className="text-sm"/>
                <p className="text-[11px] text-muted-foreground">
                  {gameBodyDefault
                    ? t('quest.delivery.defaultFromGame')
                    : t('quest.delivery.defaultFromSystem')}
                  {": "}
                  <span className="italic">{gameBodyDefault || DEFAULT_BODY_PLACEHOLDER}</span>
                </p>
              </div>
            </div>)}
        </div>)}

      {!override && (<div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5"/>
          <span>{t('quest.delivery.hintFollowing')}</span>
        </div>)}

      <div className="flex items-center justify-end gap-2">
        {dirty && (<span className="text-[11px] text-muted-foreground">
            {t('quest.delivery.unsaved')}
          </span>)}
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? (<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>) : (<Save className="h-3.5 w-3.5 mr-1.5"/>)}
          {t('common.save')}
        </Button>
      </div>
    </div>);
}
