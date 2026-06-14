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
        return (<div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2"/>
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
    return (<div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5"/>
            {t('quest.settings.rewardDeliveryTitle')}
          </CardTitle>
          <CardDescription>
            {t('quest.settings.rewardDeliveryDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={delivery} onValueChange={handleDeliveryChange} className="gap-3" disabled={savingMode}>
            <Label htmlFor="delivery-mailbox" className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem id="delivery-mailbox" value="mailbox" className="mt-0.5"/>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Mail className="h-4 w-4"/>
                  {t('quest.settings.modeMailboxLabel')}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({t('quest.settings.recommended')})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('quest.settings.modeMailboxDesc')}
                </p>
              </div>
            </Label>

            <Label htmlFor="delivery-direct" className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem id="delivery-direct" value="direct" className="mt-0.5"/>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Zap className="h-4 w-4"/>
                  {t('quest.settings.modeDirectLabel')}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('quest.settings.modeDirectDesc')}
                </p>
              </div>
            </Label>
          </RadioGroup>

          {savingMode && (<div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin"/>
              {t('quest.settings.saving')}
            </div>)}
        </CardContent>
      </Card>

      {delivery === "mailbox" && (<Card>
          <CardHeader>
            <CardTitle>{t('quest.settings.mailboxContentTitle')}</CardTitle>
            <CardDescription>
              {t('quest.settings.mailboxContentDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mailbox-title">
                {t('quest.settings.mailboxTitle')}
              </Label>
              <Input id="mailbox-title" value={title} onChange={(e) => setTitle(e.target.value)}/>
              <p className="text-xs text-muted-foreground">
                {t('quest.delivery.defaultFromSystem')}
                {": "}
                <span className="italic">{DEFAULT_TITLE_PLACEHOLDER}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailbox-body">
                {t('quest.settings.mailboxBody')}
              </Label>
              <Textarea id="mailbox-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3}/>
              <p className="text-xs text-muted-foreground">
                {t('quest.delivery.defaultFromSystem')}
                {": "}
                <span className="italic">{DEFAULT_BODY_PLACEHOLDER}</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              {textDirty && (<span className="text-xs text-muted-foreground">
                  {t('quest.settings.unsavedChanges')}
                </span>)}
              <Button onClick={handleSaveText} disabled={!textDirty || savingText}>
                {savingText ? (<Loader2 className="h-4 w-4 mr-2 animate-spin"/>) : (<Save className="h-4 w-4 mr-2"/>)}
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>)}

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4 flex gap-3 text-sm">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5"/>
          <p className="text-muted-foreground">
            {t('quest.settings.overrideHint')}
          </p>
        </CardContent>
      </Card>
    </div>);
}
