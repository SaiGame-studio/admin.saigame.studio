"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/CopyButton";
import { Mail, MailOpen, Inbox, RefreshCw, Package, ChevronDown, ChevronRight, CornerDownLeft, ExternalLink } from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { ItemDefinition } from "@/types/inventory";
import { formatDate, isValidUUID, type MailboxResponse } from "./mailbox-types";

function StatusBadge({ id, status }: {
    id: string;
    status: string;
}) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        claimed: "default",
        unclaimed: "secondary",
        unread: "secondary",
        read: "secondary",
        expired: "destructive",
    };
    const labels: Record<string, string> = {
        unclaimed: "unclaim",
        unread: "unclaim",
        read: "unclaim",
    };
    return (<Badge id={id} variant={variants[status] ?? "outline"} className="mailbox-status-badge text-xs capitalize">
      {labels[status] ?? status}
    </Badge>);
}
function ReadBadge({ id, readAt, claimedAt }: {
    id: string;
    readAt: string | null;
    claimedAt: string | null;
}) {
    // claimed implies read — if either timestamp is set, the message was read
    const isRead = readAt !== null || claimedAt !== null;
    return (<Badge id={id} variant={isRead ? "outline" : "secondary"} className={`mailbox-read-badge text-xs flex items-center gap-1 shrink-0 ${isRead ? "text-muted-foreground" : "border-blue-400 text-blue-600 dark:text-blue-400"}`}>
      {isRead ? <MailOpen id={`${id}-icon`} className="mailbox-read-badge-icon h-3 w-3"/> : <Mail id={`${id}-icon`} className="mailbox-read-badge-icon h-3 w-3"/>}
      {isRead ? "read" : "unread"}
    </Badge>);
}

interface PlayerInboxCardProps {
    gameId: string;
    receiverId: string;
    mailboxData: MailboxResponse | null;
    mailboxLoading: boolean;
    mailboxError: string | null;
    itemDefsMap: Record<string, ItemDefinition>;
    onRefresh: () => void;
    onFocusPlayerId: () => void;
}

export function PlayerInboxCard({ gameId, receiverId, mailboxData, mailboxLoading, mailboxError, itemDefsMap, onRefresh, onFocusPlayerId }: PlayerInboxCardProps) {
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
    return (<Card id="mailbox-inbox-card" className="mailbox-inbox-card group">
      <CardHeader id="mailbox-inbox-header" className="mailbox-inbox-header">
        <div id="mailbox-inbox-header-row" className="mailbox-inbox-header-row flex items-center justify-between">
          <div id="mailbox-inbox-header-text" className="mailbox-inbox-header-text">
            <CardTitle id="mailbox-inbox-title" className="mailbox-inbox-title flex items-center gap-2">
              <Inbox id="mailbox-inbox-title-icon" className="mailbox-inbox-title-icon h-5 w-5"/>
              {t('mailbox.inboxTitle')}
            </CardTitle>
            <CardDescription id="mailbox-inbox-desc" className="mailbox-inbox-desc">
              {mailboxData
            ? (<span id="mailbox-inbox-summary" className="mailbox-inbox-summary flex items-center gap-1 flex-wrap">
                    <span id="mailbox-inbox-summary-text" className="mailbox-inbox-summary-text">{mailboxData.total} {mailboxData.total !== 1 ? t('mailbox.inboxMessagesPlural') : t('mailbox.inboxMessages')} — {t('mailbox.inboxProfileId')}</span>
                    <span id="mailbox-inbox-profile-id" className="mailbox-inbox-profile-id font-mono">{mailboxData.profile_id}</span>
                    <CopyButton id="mailbox-inbox-profile-id-copy-btn" className="mailbox-inbox-profile-id-copy-btn" text={mailboxData.profile_id}/>
                  </span>)
            : receiverId && isValidUUID(receiverId)
                ? t('mailbox.inboxLoading')
                : (<span id="mailbox-inbox-enter-player" className="mailbox-inbox-enter-player inline-flex items-center gap-1">
                    {t('mailbox.inboxEnterPlayer')}
                    <button id="mailbox-inbox-focus-player-btn" type="button" onClick={onFocusPlayerId} title="Enter Player ID" className="mailbox-inbox-focus-player-btn opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center">
                      <CornerDownLeft id="mailbox-inbox-focus-player-icon" className="mailbox-inbox-focus-player-icon h-3.5 w-3.5"/>
                    </button>
                  </span>)}
            </CardDescription>
          </div>
          {receiverId && isValidUUID(receiverId) && (<TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button id="mailbox-inbox-refresh-btn" className="mailbox-inbox-refresh-btn" variant="ghost" size="icon" onClick={onRefresh} disabled={mailboxLoading} aria-label={t('common.refresh')}>
                    <RefreshCw id="mailbox-inbox-refresh-icon" className={`mailbox-inbox-refresh-icon h-4 w-4 ${mailboxLoading ? "animate-spin" : ""}`}/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent id="mailbox-inbox-refresh-tooltip" className="mailbox-inbox-refresh-tooltip" side="top">
                  <p id="mailbox-inbox-refresh-tooltip-text" className="mailbox-inbox-refresh-tooltip-text">{t('common.refresh')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>)}
        </div>
      </CardHeader>
      <CardContent id="mailbox-inbox-content" className="mailbox-inbox-content">
        {mailboxError && (<div id="mailbox-inbox-error" className="mailbox-inbox-error p-3 bg-destructive/10 border border-destructive/30 rounded-md mb-4">
            <p id="mailbox-inbox-error-text" className="mailbox-inbox-error-text text-destructive text-sm">{mailboxError}</p>
          </div>)}

        {mailboxLoading && !mailboxData && (<div id="mailbox-inbox-loading" className="mailbox-inbox-loading flex items-center justify-center py-12 text-muted-foreground">
            <RefreshCw id="mailbox-inbox-loading-icon" className="mailbox-inbox-loading-icon h-5 w-5 animate-spin mr-2"/>
            {t('mailbox.inboxLoadingMailbox')}
          </div>)}

        {!mailboxLoading && !mailboxData && !mailboxError && (<div id="mailbox-inbox-no-mailbox" className="mailbox-inbox-empty mailbox-inbox-no-mailbox flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Inbox id="mailbox-inbox-no-mailbox-icon" className="mailbox-inbox-empty-icon h-10 w-10 opacity-30"/>
            <p id="mailbox-inbox-no-mailbox-text" className="mailbox-inbox-empty-text text-sm">{t('mailbox.inboxNoMailbox')}</p>
          </div>)}

        {mailboxData && mailboxData.messages.length === 0 && (<div id="mailbox-inbox-no-messages" className="mailbox-inbox-empty mailbox-inbox-no-messages flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Inbox id="mailbox-inbox-no-messages-icon" className="mailbox-inbox-empty-icon h-10 w-10 opacity-30"/>
            <p id="mailbox-inbox-no-messages-text" className="mailbox-inbox-empty-text text-sm">{t('mailbox.inboxNoMessages')}</p>
          </div>)}

        {mailboxData && mailboxData.messages.length > 0 && (<div id="mailbox-message-list" className="mailbox-message-list space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {mailboxData.messages.map((msg) => {
                const isExpanded = expandedMessages.has(msg.id);
                const toggle = () => setExpandedMessages(prev => {
                    const next = new Set(prev);
                    next.has(msg.id) ? next.delete(msg.id) : next.add(msg.id);
                    return next;
                });
                return (<div id={`mailbox-message-${msg.id}`} key={msg.id} className="mailbox-message border rounded-lg text-sm overflow-hidden">
                  {/* Collapsed row — always visible */}
                  <button id={`mailbox-message-toggle-btn-${msg.id}`} type="button" onClick={toggle} className="mailbox-message-toggle-btn w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
                    {isExpanded ? <ChevronDown id={`mailbox-message-collapse-icon-${msg.id}`} className="mailbox-message-collapse-icon h-3.5 w-3.5 shrink-0 text-muted-foreground"/> : <ChevronRight id={`mailbox-message-expand-icon-${msg.id}`} className="mailbox-message-expand-icon h-3.5 w-3.5 shrink-0 text-muted-foreground"/>}
                    <span id={`mailbox-message-subject-${msg.id}`} className="mailbox-message-subject flex-1 font-medium truncate">{msg.subject}</span>
                    <span id={`mailbox-message-date-${msg.id}`} className="mailbox-message-date text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatDate(msg.created_at)}</span>
                    {msg.attachments && msg.attachments.length > 0 && (<span id={`mailbox-message-attachment-count-${msg.id}`} className="mailbox-message-attachment-count inline-flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                        <Package id={`mailbox-message-attachment-count-icon-${msg.id}`} className="mailbox-message-attachment-count-icon h-3 w-3"/>
                        {msg.attachments.length}
                      </span>)}
                    {/* hide ReadBadge when claimed — claimed already implies read */}
                    {msg.status !== "claimed" && <ReadBadge id={`mailbox-message-read-badge-${msg.id}`} readAt={msg.read_at} claimedAt={msg.claimed_at}/>}
                    <StatusBadge id={`mailbox-message-status-badge-${msg.id}`} status={msg.status}/>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (<div id={`mailbox-message-detail-${msg.id}`} className="mailbox-message-detail px-4 pb-4 pt-1 space-y-2 border-t">
                      <div id={`mailbox-message-id-row-${msg.id}`} className="mailbox-message-id-row flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <span id={`mailbox-message-id-label-${msg.id}`} className="mailbox-message-id-label shrink-0">ID:</span>
                        <span id={`mailbox-message-id-value-${msg.id}`} className="mailbox-message-id-value">{msg.id}</span>
                        <CopyButton id={`mailbox-message-id-copy-btn-${msg.id}`} className="mailbox-message-id-copy-btn" text={msg.id}/>
                      </div>

                      <p id={`mailbox-message-body-${msg.id}`} className="mailbox-message-body text-muted-foreground">{msg.body}</p>

                      <div id={`mailbox-message-meta-${msg.id}`} className="mailbox-message-meta flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span id={`mailbox-message-meta-type-${msg.id}`} className="mailbox-message-meta-item">{t('mailbox.detailType')}: <span id={`mailbox-message-meta-type-value-${msg.id}`} className="mailbox-message-meta-value font-medium text-foreground">{msg.message_type}</span></span>
                        <span id={`mailbox-message-meta-sent-${msg.id}`} className="mailbox-message-meta-item">{t('mailbox.detailSent')}: <span id={`mailbox-message-meta-sent-value-${msg.id}`} className="mailbox-message-meta-value font-medium text-foreground">{formatDate(msg.created_at)}</span></span>
                        {msg.expires_at && (<span id={`mailbox-message-meta-expires-${msg.id}`} className="mailbox-message-meta-item">{t('mailbox.detailExpires')}: <span id={`mailbox-message-meta-expires-value-${msg.id}`} className="mailbox-message-meta-value font-medium text-foreground">{formatDate(msg.expires_at)}</span></span>)}
                        <span id={`mailbox-message-meta-read-${msg.id}`} className="mailbox-message-meta-item">Read: <span id={`mailbox-message-meta-read-value-${msg.id}`} className="mailbox-message-meta-value font-medium text-foreground">{msg.read_at ? formatDate(msg.read_at) : "—"}</span></span>
                        {msg.claimed_at && (<span id={`mailbox-message-meta-claimed-${msg.id}`} className="mailbox-message-meta-item">{t('mailbox.detailClaimed')}: <span id={`mailbox-message-meta-claimed-value-${msg.id}`} className="mailbox-message-meta-value font-medium text-foreground">{formatDate(msg.claimed_at)}</span></span>)}
                      </div>

                      {msg.attachments && msg.attachments.length > 0 && (<div id={`mailbox-message-attachments-${msg.id}`} className="mailbox-message-attachments pt-1">
                          <p id={`mailbox-message-attachments-title-${msg.id}`} className="mailbox-message-attachments-title text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                            <Package id={`mailbox-message-attachments-title-icon-${msg.id}`} className="mailbox-message-attachments-title-icon h-3 w-3"/>
                            {t('mailbox.detailAttachments')} ({msg.attachments.length})
                          </p>
                          <div id={`mailbox-message-attachment-list-${msg.id}`} className="mailbox-message-attachment-list flex flex-wrap gap-2">
                            {msg.attachments.map((att, i) => (<span id={`mailbox-message-attachment-${msg.id}-${i}`} key={i} className="mailbox-message-attachment inline-flex items-center gap-1 bg-muted rounded px-2 py-0.5 text-xs">
                                <span id={`mailbox-message-attachment-type-${msg.id}-${i}`} className="mailbox-message-attachment-type capitalize">{att.type}</span>
                                {att.definition_id && (<span id={`mailbox-message-attachment-item-${msg.id}-${i}`} className="mailbox-message-attachment-item text-muted-foreground truncate max-w-[160px]" title={att.definition_id}>
                                    {itemDefsMap[att.definition_id]
                                        ? `${itemDefsMap[att.definition_id].name} (${itemDefsMap[att.definition_id].item_code || att.definition_id.slice(0, 8)})`
                                        : `${att.definition_id.slice(0, 8)}…`}
                                  </span>)}
                                <span id={`mailbox-message-attachment-quantity-${msg.id}-${i}`} className="mailbox-message-attachment-quantity font-medium">×{att.quantity}</span>
                                {att.type === "item" && att.definition_id && (<a id={`mailbox-message-attachment-link-${msg.id}-${i}`} href={`/games/${gameId}/items/${att.definition_id}`} className="mailbox-message-attachment-link text-muted-foreground hover:text-foreground transition-colors" title="Open item page" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink id={`mailbox-message-attachment-link-icon-${msg.id}-${i}`} className="mailbox-message-attachment-link-icon h-3 w-3"/>
                                  </a>)}
                              </span>))}
                          </div>
                        </div>)}
                    </div>)}
                </div>);
            })}
          </div>)}
      </CardContent>
    </Card>);
}
