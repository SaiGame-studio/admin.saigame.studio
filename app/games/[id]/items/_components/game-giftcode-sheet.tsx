"use client";

import { useEffect, useState } from "react";
import { Loader2, Dices, Plus, X } from "lucide-react";
import { format } from "date-fns";

import { useTranslation } from "@/lib/i18n/use-translation";
import { useToast } from "@/hooks/use-toast";
import { createGameGiftCode, updateGameGiftCode } from "@/lib/game-giftcode-api";
import { listGachaPacks } from "@/lib/inventory-api";
import type { GameGiftCode } from "@/types/game-giftcode";
import type { GachaPack } from "@/types/inventory";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

type GameGiftCodeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  existingCode: GameGiftCode | null;
  onSaved: (code: GameGiftCode) => void;
};

export function GameGiftCodeSheet({
  open,
  onOpenChange,
  gameId,
  existingCode,
  onSaved,
}: GameGiftCodeSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // Available packs for dropdown (simplified to basic multi-select for now)
  const [availablePacks, setAvailablePacks] = useState<GachaPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);

  const [form, setForm] = useState({
    code: "",
    description: "",
    max_uses: -1,
    expires_at: "",
    active_at: "",
    is_active: true,
    gacha_pack_ids: [] as string[],
  });

  type MaxUsesMode = "single" | "limited" | "unlimited";
  const [maxUsesMode, setMaxUsesMode] = useState<MaxUsesMode>("unlimited");
  const [limitedUses, setLimitedUses] = useState("100");

  useEffect(() => {
    if (open && gameId) {
      setLoadingPacks(true);
      listGachaPacks({ gameId }, { limit: 100 })
        .then(res => setAvailablePacks(res.packs ?? []))
        .catch(() => {})
        .finally(() => setLoadingPacks(false));
    }
  }, [open, gameId]);

  useEffect(() => {
    if (open) {
      if (existingCode) {
        setForm({
          code: existingCode.code,
          description: existingCode.description,
          max_uses: existingCode.max_uses,
          expires_at: existingCode.expires_at ? format(new Date(existingCode.expires_at), "yyyy-MM-dd'T'HH:mm") : "",
          active_at: existingCode.active_at ? format(new Date(existingCode.active_at), "yyyy-MM-dd'T'HH:mm") : "",
          is_active: existingCode.is_active,
          gacha_pack_ids: [...existingCode.gacha_pack_ids],
        });
        if (existingCode.max_uses === -1) {
          setMaxUsesMode("unlimited");
        } else if (existingCode.max_uses === 1) {
          setMaxUsesMode("single");
        } else {
          setMaxUsesMode("limited");
          setLimitedUses(existingCode.max_uses.toString());
        }
      } else {
        setForm({
          code: "",
          description: "",
          max_uses: -1,
          expires_at: "",
          active_at: "",
          is_active: true,
          gacha_pack_ids: [],
        });
        setMaxUsesMode("unlimited");
        setLimitedUses("100");
      }
      setFormErr(null);
    }
  }, [open, existingCode]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);

    if (!form.code.trim()) return setFormErr("Code is required");
    if (form.gacha_pack_ids.length === 0) return setFormErr("Must select at least one gacha pack");

    let finalMaxUses = -1;
    if (maxUsesMode === "single") {
      finalMaxUses = 1;
    } else if (maxUsesMode === "limited") {
      finalMaxUses = parseInt(limitedUses) || 0;
      if (finalMaxUses <= 0) return setFormErr("Limited uses must be greater than 0");
    }

    const payload = {
      code: form.code.trim(),
      description: form.description.trim(),
      max_uses: finalMaxUses,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
      active_at: form.active_at ? new Date(form.active_at).toISOString() : undefined,
      is_active: form.is_active,
      gacha_pack_ids: form.gacha_pack_ids.filter(Boolean),
    };

    setFormErr(null);
    try {
      let saved: GameGiftCode;
      if (existingCode) {
        saved = await updateGameGiftCode(gameId, existingCode.id, payload);
        toast({ title: "Giftcode updated" });
      } else {
        saved = await createGameGiftCode(gameId, payload);
        toast({ title: "Giftcode created" });
      }
      onSaved(saved);
      onOpenChange(false);
    } catch (err: any) {
      setFormErr(err.message || "Failed to save giftcode");
    } finally {
      setSaving(false);
    }
  }

  const handleRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(f => ({ ...f, code }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existingCode ? "Edit Gift Code" : "Create Gift Code"}</SheetTitle>
          <SheetDescription>
            {existingCode ? "Modify gift code settings" : "Create a new code to give players gacha packs."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
            <div className="flex items-center gap-2">
              <Input
                id="code"
                placeholder="e.g. SUMMER2024"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
                disabled={!!existingCode}
                className="flex-1"
              />
              {!existingCode && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={handleRandomCode}
                  title="Generate Random Code"
                >
                  <Dices className="h-4 w-4" />
                </Button>
              )}
            </div>
            {!!existingCode && <p className="text-[11px] text-muted-foreground">Code name cannot be changed after creation.</p>}
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Internal description for this code"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Linked Gacha Packs <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground mt-1">When claimed, these packs will be opened (bypassing key requirements) and contents placed in player's inventory/mailbox.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm(f => ({ ...f, gacha_pack_ids: [...f.gacha_pack_ids, ""] }))}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            
            <div className="space-y-2">
              {loadingPacks ? (
                <div className="text-xs text-muted-foreground p-2 text-center">Loading packs...</div>
              ) : form.gacha_pack_ids.map((packId, idx) => (
                <div key={idx} className="flex items-center gap-2 border p-2 rounded-md">
                  <Select
                    value={packId}
                    onValueChange={(val) => {
                      const newIds = [...form.gacha_pack_ids];
                      newIds[idx] = val;
                      setForm(f => ({ ...f, gacha_pack_ids: newIds }));
                    }}
                  >
                    <SelectTrigger className="flex-1 bg-background">
                      <SelectValue placeholder="Select a Gacha Pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePacks.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} <span className="text-xs text-muted-foreground ml-2">({p.code_name || p.id})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newIds = [...form.gacha_pack_ids];
                      newIds.splice(idx, 1);
                      setForm(f => ({ ...f, gacha_pack_ids: newIds }));
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
              {!loadingPacks && form.gacha_pack_ids.length === 0 && (
                <div className="text-center p-4 border border-dashed rounded-md text-sm text-muted-foreground">
                  No packs added. Click Add to select a gacha pack.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Max Uses <span className="text-destructive">*</span></Label>
            <RadioGroup value={maxUsesMode} onValueChange={(v) => setMaxUsesMode(v as MaxUsesMode)} className="space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="cursor-pointer font-normal">Single use (1 person)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="limited" id="limited" />
                <Label htmlFor="limited" className="cursor-pointer font-normal">Limited uses</Label>
                {maxUsesMode === "limited" && (
                  <Input type="number" min={2} className="h-8 w-24" value={limitedUses} onChange={(e) => setLimitedUses(e.target.value)} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="unlimited" id="unlimited" />
                <Label htmlFor="unlimited" className="cursor-pointer font-normal">Unlimited (everyone can redeem)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="active_at">Active At</Label>
              <Input
                id="active_at"
                type="datetime-local"
                value={form.active_at}
                onChange={(e) => setForm((f) => ({ ...f, active_at: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires_at">Expires At</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          </div>

          {formErr && <p className="text-sm text-destructive">{formErr}</p>}
          <SheetFooter className="gap-2 flex-wrap pt-4 sm:justify-between items-center">
            <div className="flex items-center gap-2">
              <Switch id="is_active_footer" checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label htmlFor="is_active_footer" className="text-sm cursor-pointer font-medium">{form.is_active ? "Active" : "Inactive"}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {existingCode ? t("common.save") : "Create"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
