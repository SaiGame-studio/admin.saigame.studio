"use client";

import { Mail, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";

type DeliveryMode = "mailbox" | "direct";

const OVERRIDE_KEYS = ["override_game_delivery", "reward_delivery", "mailbox_title", "mailbox_body"] as const;
const DEFAULT_TITLE = "Quest Reward: {quest_name}";
const DEFAULT_BODY = "You have completed '{quest_name}'. Claim your rewards!";

interface Props {
    game: Game;
    metadata?: Record<string, unknown>;
    idScope: "create" | "edit";
    onChange: (metadata: Record<string, unknown> | undefined) => void;
}

export function QuestDeliveryEditor({ game, metadata, idScope, onChange }: Props) {
    const { t } = useTranslation();
    const id = (name: string) => "quest-delivery-" + name + "-" + idScope;
    const override = metadata?.override_game_delivery === true;
    const storedMode = metadata?.reward_delivery;
    const mode: DeliveryMode = storedMode === "direct" || storedMode === "mailbox"
        ? storedMode
        : game.settings?.quest_reward_delivery === "direct" ? "direct" : "mailbox";
    const title = typeof metadata?.mailbox_title === "string" ? metadata.mailbox_title : "";
    const body = typeof metadata?.mailbox_body === "string" ? metadata.mailbox_body : "";
    const gameTitle = typeof game.settings?.quest_mailbox_title === "string" ? game.settings.quest_mailbox_title : "";
    const gameBody = typeof game.settings?.quest_mailbox_body === "string" ? game.settings.quest_mailbox_body : "";
    const updateMetadata = (patch: Record<string, unknown>) => onChange({ ...(metadata ?? {}), ...patch });
    const setOverride = (enabled: boolean) => {
        if (enabled) {
            updateMetadata({ override_game_delivery: true, reward_delivery: mode });
            return;
        }
        const nextMetadata = Object.fromEntries(Object.entries(metadata ?? {}).filter(([key]) => !OVERRIDE_KEYS.includes(key as typeof OVERRIDE_KEYS[number])));
        onChange(Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined);
    };
    const setMode = (nextMode: DeliveryMode) => {
        const nextMetadata: Record<string, unknown> = { ...(metadata ?? {}), override_game_delivery: true, reward_delivery: nextMode };
        if (nextMode === "direct") {
            delete nextMetadata.mailbox_title;
            delete nextMetadata.mailbox_body;
        }
        onChange(nextMetadata);
    };
    const setMailboxText = (key: "mailbox_title" | "mailbox_body", value: string) => {
        const nextMetadata: Record<string, unknown> = { ...(metadata ?? {}), override_game_delivery: true, reward_delivery: "mailbox" };
        if (value)
            nextMetadata[key] = value;
        else
            delete nextMetadata[key];
        onChange(nextMetadata);
    };

    return (<div id={id("editor")} className="space-y-3 border rounded-md p-3 bg-muted/20">
      <div id={id("header")} className="flex items-center justify-between gap-4">
        <div id={id("heading")} className="space-y-0.5">
          <Label id={id("label")} htmlFor={id("override")} className="text-sm font-medium">{t("quest.delivery.sectionTitle")}</Label>
          <p id={id("status")} className="text-xs text-muted-foreground">{override ? t("quest.delivery.overridesGame") : t("quest.delivery.followingGame")}</p>
        </div>
        <Switch id={id("override")} checked={override} onCheckedChange={setOverride}/>
      </div>
      {override && (<div id={id("options")} className="space-y-3 border-l-2 border-muted pl-4">
        <RadioGroup id={id("mode")} value={mode} onValueChange={(value) => {
            if (value === "mailbox" || value === "direct") setMode(value);
        }} className="flex gap-4">
          <Label id={id("mailbox-label")} htmlFor={id("mailbox")} className="flex items-center gap-2 text-sm cursor-pointer">
            <RadioGroupItem id={id("mailbox")} value="mailbox"/>
            <Mail id={id("mailbox-icon")} className="h-3.5 w-3.5"/>
            {t("quest.delivery.modeMailbox")}
          </Label>
          <Label id={id("direct-label")} htmlFor={id("direct")} className="flex items-center gap-2 text-sm cursor-pointer">
            <RadioGroupItem id={id("direct")} value="direct"/>
            <Zap id={id("direct-icon")} className="h-3.5 w-3.5"/>
            {t("quest.delivery.modeDirect")}
          </Label>
        </RadioGroup>
        {mode === "mailbox" && (<div id={id("mailbox-fields")} className="space-y-3">
          <div id={id("title-field")} className="space-y-1.5">
            <Label id={id("title-label")} htmlFor={id("title")} className="text-xs">{t("quest.delivery.mailboxTitle")}</Label>
            <Input id={id("title")} value={title} onChange={(event) => setMailboxText("mailbox_title", event.target.value)} className="h-8 text-sm"/>
            <p id={id("title-default")} className="text-[11px] text-muted-foreground">{gameTitle ? t("quest.delivery.defaultFromGame") : t("quest.delivery.defaultFromSystem")}: <span id={id("title-default-value")} className="italic">{gameTitle || DEFAULT_TITLE}</span></p>
          </div>
          <div id={id("body-field")} className="space-y-1.5">
            <Label id={id("body-label")} htmlFor={id("body")} className="text-xs">{t("quest.delivery.mailboxBody")}</Label>
            <Textarea id={id("body")} value={body} onChange={(event) => setMailboxText("mailbox_body", event.target.value)} rows={2} className="text-sm"/>
            <p id={id("body-default")} className="text-[11px] text-muted-foreground">{gameBody ? t("quest.delivery.defaultFromGame") : t("quest.delivery.defaultFromSystem")}: <span id={id("body-default-value")} className="italic">{gameBody || DEFAULT_BODY}</span></p>
          </div>
        </div>)}
      </div>)}
    </div>);
}
