"use client";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, User, Mail, Gift, Coins, X, Check, ChevronsUpDown } from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useItemProfilesCache } from "@/hooks/use-item-profiles-cache";
import { getGameProgressList, getGameProgressDetail, GameProgress } from "@/lib/game-user-api";
import { isValidUUID, type SystemMailForm } from "./mailbox-types";

interface SendMailFormProps {
    gameId: string;
    form: SystemMailForm;
    setForm: React.Dispatch<React.SetStateAction<SystemMailForm>>;
    loading: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onReceiverIdChange: (value: string) => void;
    playerIdRef: React.RefObject<HTMLInputElement | null>;
    highlightPlayerId: boolean;
}

export function SendMailForm({ gameId, form, setForm, loading, onSubmit, onReceiverIdChange, playerIdRef, highlightPlayerId }: SendMailFormProps) {
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const [openItemDropdown, setOpenItemDropdown] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    // Player search state
    const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
    const [playerSearchQuery, setPlayerSearchQuery] = useState("");
    const [playerSearchResults, setPlayerSearchResults] = useState<GameProgress[]>([]);
    const [playerSearchLoading, setPlayerSearchLoading] = useState(false);
    const [selectedPlayerName, setSelectedPlayerName] = useState("");
    const playerSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    // Debounced player search
    useEffect(() => {
        if (playerSearchDebounceRef.current)
            clearTimeout(playerSearchDebounceRef.current);
        if (!playerSearchQuery.trim()) {
            setPlayerSearchResults([]);
            return;
        }
        playerSearchDebounceRef.current = setTimeout(async () => {
            setPlayerSearchLoading(true);
            try {
                const result = await getGameProgressList(gameId, { display_name: playerSearchQuery });
                setPlayerSearchResults(result.progress);
            }
            catch {
                setPlayerSearchResults([]);
            }
            finally {
                setPlayerSearchLoading(false);
            }
        }, 400);
        return () => {
            if (playerSearchDebounceRef.current)
                clearTimeout(playerSearchDebounceRef.current);
        };
    }, [playerSearchQuery, gameId]);
    const handleSelectPlayer = (player: GameProgress) => {
        onReceiverIdChange(player.id);
        setSelectedPlayerName(player.user_display_name || player.user_email || player.id);
        setPlayerSearchOpen(false);
        setPlayerSearchQuery("");
    };
    // Use the caching hook for item profiles
    const { itemProfiles, error, loadItemProfiles, clearCache } = useItemProfilesCache(gameId);
    // When receiver_id is set (e.g. from URL) and we have no display name yet, fetch player info
    useEffect(() => {
        if (!form.receiver_id || !isValidUUID(form.receiver_id) || selectedPlayerName)
            return;
        getGameProgressDetail(form.receiver_id)
            .then((detail) => {
            const name = detail.user_display_name || detail.user_email || "";
            if (name)
                setSelectedPlayerName(name);
        })
            .catch(() => { });
    }, [form.receiver_id]); // intentionally omit selectedPlayerName to avoid re-running after it's set
    // Clear cache when component mounts (user re-enters the page)
    useEffect(() => {
        clearCache();
    }, [gameId, clearCache]);
    const updateAttachment = (index: number, field: string, value: any) => {
        const newAttachments = [...form.attachments];
        newAttachments[index] = { ...newAttachments[index], [field]: value };
        setForm({ ...form, attachments: newAttachments });
    };
    const addAttachment = () => {
        setForm({
            ...form,
            attachments: [...form.attachments, { type: "item", definition_id: "", quantity: 1 }]
        });
    };
    const removeAttachment = (index: number) => {
        const newAttachments = form.attachments.filter((_, i) => i !== index);
        setForm({ ...form, attachments: newAttachments });
    };
    return (<Card id="mailbox-send-card" className="mailbox-send-card">
      <CardHeader id="mailbox-send-card-header" className="mailbox-send-card-header">
        <CardTitle id="mailbox-send-card-title" className="mailbox-send-card-title">{t('mailbox.sendCardTitle')}</CardTitle>
        <CardDescription id="mailbox-send-card-desc" className="mailbox-send-card-desc">
          {t('mailbox.sendCardDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent id="mailbox-send-card-content" className="mailbox-send-card-content">
        <form id="mailbox-send-form" onSubmit={onSubmit} className="mailbox-send-form space-y-6">
          {/* Basic Information */}
          <div id="mailbox-basic-info" className="mailbox-basic-info grid grid-cols-1 md:grid-cols-2 gap-4">
            <div id="mailbox-player-field" className="mailbox-field mailbox-player-field space-y-2">
              <Label id="mailbox-player-label" className="mailbox-field-label">
                <User id="mailbox-player-label-icon" className="mailbox-field-label-icon inline h-4 w-4 mr-1"/>
                {t('mailbox.labelPlayerId')}
              </Label>
              <Popover open={playerSearchOpen} onOpenChange={setPlayerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button id="mailbox-player-select-btn" ref={playerIdRef as any} type="button" variant="outline" role="combobox" aria-expanded={playerSearchOpen} className={`mailbox-player-select-btn w-full justify-between font-normal transition-all duration-300 ${highlightPlayerId ? "ring-2 ring-primary border-primary" : ""}`}>
                    <span id="mailbox-player-select-value" className="mailbox-player-select-value truncate text-left">
                      {selectedPlayerName
            ? selectedPlayerName
            : form.receiver_id
                ? form.receiver_id
                : <span id="mailbox-player-select-placeholder" className="mailbox-player-select-placeholder text-muted-foreground">{t('mailbox.placeholderPlayerId')}</span>}
                    </span>
                    <div id="mailbox-player-select-actions" className="mailbox-player-select-actions flex items-center gap-1 ml-2 shrink-0">
                      {form.receiver_id && (<span id="mailbox-player-clear-btn" role="button" className="mailbox-player-clear-btn text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => {
                e.stopPropagation();
                onReceiverIdChange("");
                setSelectedPlayerName("");
                setPlayerSearchResults([]);
                setPlayerSearchQuery("");
            }} title={t('mailbox.clearPlayerId')}>
                          <X id="mailbox-player-clear-icon" className="mailbox-player-clear-icon h-3.5 w-3.5"/>
                        </span>)}
                      <ChevronsUpDown id="mailbox-player-select-chevron" className="mailbox-player-select-chevron h-4 w-4 opacity-50"/>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent id="mailbox-player-search-popover" className="mailbox-player-search-popover p-0" style={{ width: "var(--radix-popover-trigger-width)" }} align="start">
                  <Command id="mailbox-player-search-command" className="mailbox-player-search-command" shouldFilter={false}>
                    <CommandInput id="mailbox-player-search-input" className="mailbox-player-search-input" placeholder="Search player by name..." value={playerSearchQuery} onValueChange={setPlayerSearchQuery}/>
                    <CommandList id="mailbox-player-search-list" className="mailbox-player-search-list">
                      {playerSearchLoading ? (<div id="mailbox-player-search-loading" className="mailbox-player-search-loading py-6 text-center text-sm text-muted-foreground">Searching...</div>) : playerSearchResults.length === 0 && playerSearchQuery.trim() ? (<CommandEmpty id="mailbox-player-search-empty" className="mailbox-player-search-empty">No players found.</CommandEmpty>) : playerSearchResults.length === 0 ? (<div id="mailbox-player-search-hint" className="mailbox-player-search-hint py-6 text-center text-sm text-muted-foreground">Type a name to search players.</div>) : (<CommandGroup id="mailbox-player-search-group" className="mailbox-player-search-group">
                          {playerSearchResults.map((player) => (<CommandItem id={`mailbox-player-option-${player.id}`} className="mailbox-player-option" key={player.id} value={player.id} onSelect={() => handleSelectPlayer(player)}>
                              <Check id={`mailbox-player-option-check-${player.id}`} className={`mailbox-player-option-check mr-2 h-4 w-4 shrink-0 ${form.receiver_id === player.id ? "opacity-100" : "opacity-0"}`}/>
                              <div id={`mailbox-player-option-info-${player.id}`} className="mailbox-player-option-info min-w-0">
                                <div id={`mailbox-player-option-name-${player.id}`} className="mailbox-player-option-name font-medium truncate">{player.user_display_name || player.user_email}</div>
                                <div id={`mailbox-player-option-id-${player.id}`} className="mailbox-player-option-id text-xs text-muted-foreground font-mono truncate">{player.id}</div>
                              </div>
                            </CommandItem>))}
                        </CommandGroup>)}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div id="mailbox-subject-field" className="mailbox-field mailbox-subject-field space-y-2">
              <Label id="mailbox-subject-label" className="mailbox-field-label" htmlFor="mailbox-subject-input">
                <Mail id="mailbox-subject-label-icon" className="mailbox-field-label-icon inline h-4 w-4 mr-1"/>
                {t('mailbox.labelSubject')}
              </Label>
              <div id="mailbox-subject-input-wrapper" className="mailbox-input-wrapper relative">
                <Input id="mailbox-subject-input" placeholder={t('mailbox.placeholderSubject')} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={`mailbox-subject-input ${form.subject ? "pr-8" : ""}`} required/>
                {form.subject && (<button id="mailbox-subject-clear-btn" type="button" className="mailbox-input-clear-btn absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setForm({ ...form, subject: "" })}>
                    <X id="mailbox-subject-clear-icon" className="mailbox-input-clear-icon h-3.5 w-3.5"/>
                  </button>)}
              </div>
            </div>
          </div>

          <div id="mailbox-body-field" className="mailbox-field mailbox-body-field space-y-2">
            <Label id="mailbox-body-label" className="mailbox-field-label" htmlFor="mailbox-body-input">
              <Mail id="mailbox-body-label-icon" className="mailbox-field-label-icon inline h-4 w-4 mr-1"/>
              {t('mailbox.labelBody')}
            </Label>
            <div id="mailbox-body-input-wrapper" className="mailbox-input-wrapper relative">
              <Textarea id="mailbox-body-input" placeholder={t('mailbox.placeholderBody')} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} className={`mailbox-body-input ${form.body ? "pr-8" : ""}`} required/>
              {form.body && (<button id="mailbox-body-clear-btn" type="button" className="mailbox-input-clear-btn absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setForm({ ...form, body: "" })}>
                  <X id="mailbox-body-clear-icon" className="mailbox-input-clear-icon h-3.5 w-3.5"/>
                </button>)}
            </div>
          </div>

          {/* Expiration */}
          <div id="mailbox-options" className="mailbox-options grid grid-cols-1 md:grid-cols-2 gap-4">
            <div id="mailbox-expiration-field" className="mailbox-field mailbox-expiration-field space-y-2">
              <Label id="mailbox-expiration-label" className="mailbox-field-label" htmlFor="mailbox-expiration-input">{t('mailbox.labelExpiration')}</Label>
              <Input id="mailbox-expiration-input" className="mailbox-expiration-input" type="number" min="1" max="365" value={form.expires_in_days} onChange={(e) => setForm({ ...form, expires_in_days: parseInt(e.target.value) })} required/>
            </div>
            <div id="mailbox-idempotency-field" className="mailbox-field mailbox-idempotency-field space-y-2">
              <Label id="mailbox-idempotency-label" className="mailbox-field-label" htmlFor="mailbox-idempotency-input">{t('mailbox.labelIdempotencyKey')}</Label>
              <div id="mailbox-idempotency-input-wrapper" className="mailbox-input-wrapper relative">
                <Input id="mailbox-idempotency-input" placeholder={t('mailbox.placeholderIdempotencyKey')} value={form.idempotency_key} onChange={(e) => setForm({ ...form, idempotency_key: e.target.value })} className={`mailbox-idempotency-input ${form.idempotency_key ? "pr-8" : ""}`}/>
                {form.idempotency_key && (<button id="mailbox-idempotency-clear-btn" type="button" className="mailbox-input-clear-btn absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setForm({ ...form, idempotency_key: "" })}>
                    <X id="mailbox-idempotency-clear-icon" className="mailbox-input-clear-icon h-3.5 w-3.5"/>
                  </button>)}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (<div id="mailbox-send-error" className="mailbox-send-error space-y-2">
              <Label id="mailbox-send-error-label" className="mailbox-send-error-label text-red-600">{t('mailbox.errorLoadingItems')}</Label>
              <div id="mailbox-send-error-box" className="mailbox-send-error-box p-3 bg-red-50 border border-red-200 rounded-md">
                <p id="mailbox-send-error-text" className="mailbox-send-error-text text-red-600 text-sm">{error}</p>
              </div>
            </div>)}

          {/* Attachments */}
          <div id="mailbox-attachments" className="mailbox-attachments space-y-4">
            <div id="mailbox-attachments-header" className="mailbox-attachments-header flex items-center justify-between">
              <Label id="mailbox-attachments-label" className="mailbox-attachments-label flex items-center gap-1.5">
                <Gift id="mailbox-attachments-label-icon" className="mailbox-field-label-icon inline h-4 w-4 mr-1"/>
                {t('mailbox.labelAttachments')}
                <span id="mailbox-attachments-count" className={`mailbox-attachments-count text-xs font-mono ${form.attachments.length >= 10 ? "text-destructive" : "text-muted-foreground"}`}>
                  {form.attachments.length}/10
                </span>
              </Label>
              <Button id="mailbox-add-attachment-btn" className="mailbox-add-attachment-btn" type="button" variant="outline" size="sm" onClick={addAttachment} disabled={form.attachments.length >= 10}>
                {t('mailbox.addAttachment')}
              </Button>
            </div>

            {form.attachments.map((attachment, index) => (<div id={`mailbox-attachment-${index}`} key={index} className="mailbox-attachment grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <div id={`mailbox-attachment-type-field-${index}`} className="mailbox-attachment-type-field space-y-2">
                  <Label id={`mailbox-attachment-type-label-${index}`} className="mailbox-field-label">{t('mailbox.labelType')}</Label>
                  <Select value="item" disabled>
                    <SelectTrigger id={`mailbox-attachment-type-trigger-${index}`} className="mailbox-attachment-type-trigger">
                      <SelectValue>{t('mailbox.typeItem')}</SelectValue>
                    </SelectTrigger>
                    <SelectContent id={`mailbox-attachment-type-content-${index}`} className="mailbox-attachment-type-content">
                      <SelectItem id={`mailbox-attachment-type-option-item-${index}`} className="mailbox-attachment-type-option" value="item">{t('mailbox.typeItem')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div id={`mailbox-attachment-item-field-${index}`} className="mailbox-attachment-item-field space-y-2">
                  <Label id={`mailbox-attachment-item-label-${index}`} className="mailbox-field-label">{t('mailbox.labelItemDefinition')}</Label>
                  <Popover open={openItemDropdown === index} onOpenChange={(open) => setOpenItemDropdown(open ? index : null)}>
                    <PopoverTrigger asChild>
                      <Button id={`mailbox-attachment-item-select-btn-${index}`} variant="outline" role="combobox" aria-expanded={openItemDropdown === index} className="mailbox-attachment-item-select-btn w-full justify-between">
                        {attachment.definition_id
                ? itemProfiles.find((item) => item.id === attachment.definition_id)?.name || t('mailbox.selectItem')
                : t('mailbox.selectItem')}
                        <ChevronsUpDown id={`mailbox-attachment-item-select-chevron-${index}`} className="mailbox-attachment-item-select-chevron ml-2 h-4 w-4 shrink-0 opacity-50"/>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent id={`mailbox-attachment-item-popover-${index}`} className="mailbox-attachment-item-popover w-[300px] p-0">
                      <Command id={`mailbox-attachment-item-command-${index}`} className="mailbox-attachment-item-command">
                        <CommandInput id={`mailbox-attachment-item-search-input-${index}`} className="mailbox-attachment-item-search-input" placeholder={t('mailbox.searchItems')} onValueChange={(value) => {
                setSearchQuery(value);
                loadItemProfiles(value);
            }}/>
                        <CommandList id={`mailbox-attachment-item-list-${index}`} className="mailbox-attachment-item-list">
                          <CommandEmpty id={`mailbox-attachment-item-empty-${index}`} className="mailbox-attachment-item-empty">{t('mailbox.noItemsFound')}</CommandEmpty>
                          <CommandGroup id={`mailbox-attachment-item-group-${index}`} className="mailbox-attachment-item-group">
                            {itemProfiles.map((item) => (<CommandItem id={`mailbox-attachment-item-option-${index}-${item.id}`} className="mailbox-attachment-item-option" key={item.id} onSelect={(currentValue) => {
                    updateAttachment(index, "definition_id", currentValue === attachment.definition_id ? "" : item.id);
                    setOpenItemDropdown(null);
                }}>
                                <Check id={`mailbox-attachment-item-option-check-${index}-${item.id}`} className={`mailbox-attachment-item-option-check mr-2 h-4 w-4 ${attachment.definition_id === item.id ? "opacity-100" : "opacity-0"}`}/>
                                {item.name} ({item.item_code})
                              </CommandItem>))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div id={`mailbox-attachment-quantity-field-${index}`} className="mailbox-attachment-quantity-field space-y-2">
                  <Label id={`mailbox-attachment-quantity-label-${index}`} className="mailbox-field-label">
                    <Coins id={`mailbox-attachment-quantity-label-icon-${index}`} className="mailbox-field-label-icon inline h-4 w-4 mr-1"/>
                    {t('mailbox.labelQuantity')}
                  </Label>
                  <Input id={`mailbox-attachment-quantity-input-${index}`} className="mailbox-attachment-quantity-input" type="number" min="1" value={attachment.quantity} onChange={(e) => updateAttachment(index, "quantity", parseInt(e.target.value))}/>
                </div>

                <div id={`mailbox-attachment-actions-${index}`} className="mailbox-attachment-actions flex items-end">
                  <Button id={`mailbox-attachment-remove-btn-${index}`} className="mailbox-attachment-remove-btn" type="button" variant="destructive" size="sm" onClick={() => removeAttachment(index)}>
                    {t('mailbox.remove')}
                  </Button>
                </div>
              </div>))}
          </div>

          <div id="mailbox-send-actions" className="mailbox-send-actions flex justify-end">
            <Button id="mailbox-send-btn" className="mailbox-send-btn" type="submit" disabled={loading}>
              <Send id="mailbox-send-icon" className="mailbox-send-icon mr-2 h-4 w-4"/>
              {loading ? t('mailbox.sending') : t('mailbox.sendButton')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>);
}
