"use client";
import { useEffect, useState } from "react";
import { Loader2, Save, Mail, Zap, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { updateGame } from "@/lib/game-api";
import type { Game } from "@/types/game";
type DeliveryMode = "mailbox" | "direct";
const DEFAULT_TITLE_PLACEHOLDER = "Quest Reward: {quest_name}";
const DEFAULT_BODY_PLACEHOLDER = "You have completed '{quest_name}'. Claim your rewards!";
interface Props {
    game: Game | null;
    onGameUpdate?: (g: Game) => void;
}
function readDelivery(game: Game | null): DeliveryMode {
    return game?.settings?.quest_reward_delivery === "direct" ? "direct" : "mailbox";
}
function readStr(game: Game | null, key: string): string {
    const v = game?.settings?.[key];
    return typeof v === "string" ? v : "";
}
export function SettingsTab({ game, onGameUpdate }: Props) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [delivery, setDelivery] = useState<DeliveryMode>(readDelivery(game));
    const [title, setTitle] = useState(readStr(game, "quest_mailbox_title"));
    const [body, setBody] = useState(readStr(game, "quest_mailbox_body"));
    const [savingMode, setSavingMode] = useState(false);
    const [savingText, setSavingText] = useState(false);
    useEffect(() => {
        setDelivery(readDelivery(game));
        setTitle(readStr(game, "quest_mailbox_title"));
        setBody(readStr(game, "quest_mailbox_body"));
    }, [
        game?.id,
        game?.settings?.quest_reward_delivery,
        game?.settings?.quest_mailbox_title,
        game?.settings?.quest_mailbox_body,
    ]);
    if (!game) {
        return (<div id="quest-settings-loading" className="quest-settings-loading flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 id="quest-settings-loading-icon" className="quest-settings-loading-icon h-5 w-5 animate-spin mr-2"/>
        {t('common.loading')}
      </div>);
    }
    const savedTitle = readStr(game, "quest_mailbox_title");
    const savedBody = readStr(game, "quest_mailbox_body");
    const textDirty = delivery === "mailbox" && (title !== savedTitle || body !== savedBody);
    const handleDeliveryChange = async (value: string) => {
        if (value !== "mailbox" && value !== "direct")
            return;
        if (value === delivery)
            return;
        const prev = delivery;
        setDelivery(value);
        setSavingMode(true);
        try {
            const updated = await updateGame(game.id, {
                settings: {
                    ...game.settings,
                    quest_reward_delivery: value,
                },
            });
            onGameUpdate?.(updated);
            toast({
                title: t('common.saved'),
                description: t(value === "mailbox"
                    ? 'quest.settings.savedMailbox'
                    : 'quest.settings.savedDirect'),
            });
        }
        catch {
            setDelivery(prev);
            toast({
                title: t('common.error'),
                description: t('quest.settings.failedUpdate'),
                variant: "destructive",
            });
        }
        finally {
            setSavingMode(false);
        }
    };
    const handleSaveText = async () => {
        setSavingText(true);
        try {
            const updated = await updateGame(game.id, {
                settings: {
                    ...game.settings,
                    quest_reward_delivery: "mailbox",
                    quest_mailbox_title: title,
                    quest_mailbox_body: body,
                },
            });
            onGameUpdate?.(updated);
            toast({
                title: t('common.saved'),
                description: t('quest.settings.textSaved'),
            });
        }
        catch {
            toast({
                title: t('common.error'),
                description: t('quest.settings.failedUpdate'),
                variant: "destructive",
            });
        }
        finally {
            setSavingText(false);
        }
    };
    return (<div id="quest-settings" className="quest-settings space-y-6 max-w-3xl">
      <Card id="quest-settings-delivery-card" className="quest-settings-delivery-card">
        <CardHeader id="quest-settings-delivery-header" className="quest-settings-delivery-header">
          <CardTitle id="quest-settings-delivery-title" className="quest-settings-delivery-title flex items-center gap-2">
            <Mail id="quest-settings-delivery-title-icon" className="quest-settings-delivery-title-icon h-5 w-5"/>
            {t('quest.settings.rewardDeliveryTitle')}
          </CardTitle>
          <CardDescription id="quest-settings-delivery-description" className="quest-settings-delivery-description">
            {t('quest.settings.rewardDeliveryDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent id="quest-settings-delivery-content" className="quest-settings-delivery-content space-y-4">
          <RadioGroup id="quest-settings-delivery-options" value={delivery} onValueChange={handleDeliveryChange} className="quest-settings-delivery-options gap-3" disabled={savingMode}>
            <Label id="quest-settings-delivery-mailbox-label" htmlFor="delivery-mailbox" className="quest-settings-delivery-option flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem id="delivery-mailbox" value="mailbox" className="quest-settings-delivery-option-input mt-0.5"/>
              <div id="quest-settings-delivery-mailbox-content" className="quest-settings-delivery-option-content flex-1">
                <div id="quest-settings-delivery-mailbox-name" className="quest-settings-delivery-option-name flex items-center gap-2 font-medium">
                  <Mail id="quest-settings-delivery-mailbox-icon" className="quest-settings-delivery-option-icon h-4 w-4"/>
                  {t('quest.settings.modeMailboxLabel')}
                  <span id="quest-settings-delivery-mailbox-recommended" className="quest-settings-delivery-option-recommended text-xs font-normal text-muted-foreground">
                    ({t('quest.settings.recommended')})
                  </span>
                </div>
                <p id="quest-settings-delivery-mailbox-description" className="quest-settings-delivery-option-description text-sm text-muted-foreground mt-1">
                  {t('quest.settings.modeMailboxDesc')}
                </p>
              </div>
            </Label>

            <Label id="quest-settings-delivery-direct-label" htmlFor="delivery-direct" className="quest-settings-delivery-option flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem id="delivery-direct" value="direct" className="quest-settings-delivery-option-input mt-0.5"/>
              <div id="quest-settings-delivery-direct-content" className="quest-settings-delivery-option-content flex-1">
                <div id="quest-settings-delivery-direct-name" className="quest-settings-delivery-option-name flex items-center gap-2 font-medium">
                  <Zap id="quest-settings-delivery-direct-icon" className="quest-settings-delivery-option-icon h-4 w-4"/>
                  {t('quest.settings.modeDirectLabel')}
                </div>
                <p id="quest-settings-delivery-direct-description" className="quest-settings-delivery-option-description text-sm text-muted-foreground mt-1">
                  {t('quest.settings.modeDirectDesc')}
                </p>
              </div>
            </Label>
          </RadioGroup>

          {savingMode && (<div id="quest-settings-delivery-saving" className="quest-settings-delivery-saving flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 id="quest-settings-delivery-saving-icon" className="quest-settings-delivery-saving-icon h-3.5 w-3.5 animate-spin"/>
              {t('quest.settings.saving')}
            </div>)}
        </CardContent>
      </Card>

      {delivery === "mailbox" && (<Card id="quest-settings-mailbox-card" className="quest-settings-mailbox-card">
          <CardHeader id="quest-settings-mailbox-header" className="quest-settings-mailbox-header">
            <CardTitle id="quest-settings-mailbox-title" className="quest-settings-mailbox-title">{t('quest.settings.mailboxContentTitle')}</CardTitle>
            <CardDescription id="quest-settings-mailbox-description" className="quest-settings-mailbox-description">
              {t('quest.settings.mailboxContentDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent id="quest-settings-mailbox-content" className="quest-settings-mailbox-content space-y-4">
            <div id="quest-settings-mailbox-title-field" className="quest-settings-mailbox-field space-y-2">
              <Label id="quest-settings-mailbox-title-label" htmlFor="mailbox-title" className="quest-settings-mailbox-label">
                {t('quest.settings.mailboxTitle')}
              </Label>
              <Input id="mailbox-title" className="quest-settings-mailbox-input" value={title} onChange={(e) => setTitle(e.target.value)}/>
              <p id="quest-settings-mailbox-title-default" className="quest-settings-mailbox-default text-xs text-muted-foreground">
                {t('quest.delivery.defaultFromSystem')}
                {": "}
                <span id="quest-settings-mailbox-title-placeholder" className="quest-settings-mailbox-placeholder italic">{DEFAULT_TITLE_PLACEHOLDER}</span>
              </p>
            </div>

            <div id="quest-settings-mailbox-body-field" className="quest-settings-mailbox-field space-y-2">
              <Label id="quest-settings-mailbox-body-label" htmlFor="mailbox-body" className="quest-settings-mailbox-label">
                {t('quest.settings.mailboxBody')}
              </Label>
              <Textarea id="mailbox-body" className="quest-settings-mailbox-input" value={body} onChange={(e) => setBody(e.target.value)} rows={3}/>
              <p id="quest-settings-mailbox-body-default" className="quest-settings-mailbox-default text-xs text-muted-foreground">
                {t('quest.delivery.defaultFromSystem')}
                {": "}
                <span id="quest-settings-mailbox-body-placeholder" className="quest-settings-mailbox-placeholder italic">{DEFAULT_BODY_PLACEHOLDER}</span>
              </p>
            </div>

            <div id="quest-settings-mailbox-actions" className="quest-settings-mailbox-actions flex items-center justify-end gap-3">
              {textDirty && (<span id="quest-settings-mailbox-unsaved" className="quest-settings-mailbox-unsaved text-xs text-muted-foreground">
                  {t('quest.settings.unsavedChanges')}
                </span>)}
              <Button id="quest-settings-mailbox-save" className="quest-settings-mailbox-save" onClick={handleSaveText} disabled={!textDirty || savingText}>
                {savingText ? (<Loader2 id="quest-settings-mailbox-save-loading" className="quest-settings-mailbox-save-icon h-4 w-4 mr-2 animate-spin"/>) : (<Save id="quest-settings-mailbox-save-icon" className="quest-settings-mailbox-save-icon h-4 w-4 mr-2"/>)}
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>)}

      <Card id="quest-settings-override-hint" className="quest-settings-override-hint bg-muted/30 border-dashed">
        <CardContent id="quest-settings-override-hint-content" className="quest-settings-override-hint-content py-4 flex gap-3 text-sm">
          <Info id="quest-settings-override-hint-icon" className="quest-settings-override-hint-icon h-5 w-5 text-muted-foreground shrink-0 mt-0.5"/>
          <p id="quest-settings-override-hint-text" className="quest-settings-override-hint-text text-muted-foreground">
            {t('quest.settings.overrideHint')}
          </p>
        </CardContent>
      </Card>
    </div>);
}
