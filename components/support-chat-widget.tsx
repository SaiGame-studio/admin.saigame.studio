"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getGuestSupportConversation, markGuestSupportMessagesRead, replyToGuestSupportConversation, SupportMessage } from "@/lib/support-chat-api";

type Invitation = { conversation_id: string; subject?: string };

export function SupportChatWidget() {
  const { is_super_admin } = useCapabilities();
  const { t } = useTranslation();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [hasNewAgentMessage, setHasNewAgentMessage] = useState(false);
  const [highlightedMessageIDs, setHighlightedMessageIDs] = useState<string[]>([]);
  const knownMessageIDs = useRef(new Set<string>());
  const messageHistoryInitialized = useRef(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [pendingNewMessages, setPendingNewMessages] = useState(0);

  const loadConversation = useCallback(async () => {
    try {
      const data = await getGuestSupportConversation();
      setMessages(data.messages);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    const receive = (event: Event) => setInvitation((event as CustomEvent<Invitation | null>).detail);
    const savedInvitation = window.sessionStorage.getItem("support-chat-invitation");
    if (savedInvitation) {
      try {
        setInvitation(JSON.parse(savedInvitation) as Invitation);
      } catch {
        window.sessionStorage.removeItem("support-chat-invitation");
      }
    }
    window.addEventListener("support-chat-invitation", receive);
    return () => window.removeEventListener("support-chat-invitation", receive);
  }, []);

  useEffect(() => {
    if (!invitation) return;
    void loadConversation();
    const timer = window.setInterval(() => void loadConversation(), 5_000);
    return () => window.clearInterval(timer);
  }, [invitation, loadConversation]);

  useEffect(() => {
    const latestAgentMessage = [...messages].reverse().find((item) => item.sender_kind === "agent");
    if (!latestAgentMessage || !invitation) return;
    const readKey = `support-chat-last-read-${invitation.conversation_id}`;
    if (open) {
      window.localStorage.setItem(readKey, latestAgentMessage.id);
      setHasNewAgentMessage(false);
      return;
    }
    setHasNewAgentMessage(window.localStorage.getItem(readKey) !== latestAgentMessage.id);
  }, [invitation, messages, open]);

  useEffect(() => {
    if (open && messages.some((item) => item.sender_kind === "agent" && !item.read_at)) void markGuestSupportMessagesRead();
  }, [messages, open]);

  useEffect(() => {
    if (open && autoScroll) messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [autoScroll, messages, open]);

  useEffect(() => {
    if (!messageHistoryInitialized.current) {
      messages.forEach((item) => knownMessageIDs.current.add(item.id));
      messageHistoryInitialized.current = true;
      return;
    }
    const newAgentMessageIDs = messages.filter((item) => item.sender_kind === "agent" && !knownMessageIDs.current.has(item.id)).map((item) => item.id);
    messages.forEach((item) => knownMessageIDs.current.add(item.id));
    if (!open || newAgentMessageIDs.length === 0) return;
    if (!autoScroll) {
      setPendingNewMessages((count) => count + newAgentMessageIDs.length);
      return;
    }
    setHighlightedMessageIDs(newAgentMessageIDs);
    const timer = window.setTimeout(() => setHighlightedMessageIDs([]), 3_000);
    return () => window.clearTimeout(timer);
  }, [autoScroll, messages, open]);

  useEffect(() => {
    if (autoScroll) setPendingNewMessages(0);
  }, [autoScroll]);

  const sendMessage = async () => {
    const body = message.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const data = await replyToGuestSupportConversation(body);
      setMessage("");
      setMessages(data.messages);
      setAutoScroll(true);
      setPendingNewMessages(0);
      window.requestAnimationFrame(() => messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" }));
    } finally {
      setSending(false);
    }
  };

  if (is_super_admin || !invitation) return null;

  return <div id="support-chat-widget" className="fixed bottom-5 right-5 z-50 flex w-80 flex-col items-end">
    {open && <div id="support-chat-window" className="relative mb-3 w-full overflow-hidden rounded-xl border bg-background shadow-xl">
      <div id="support-chat-window-header" className="flex items-center justify-between bg-primary px-3 py-2 text-primary-foreground">
        <div id="support-chat-agent-profile" className="flex items-center gap-2"><img id="support-chat-agent-header-avatar" src="/sai-avatar.png" alt="Simon Sai" className="h-7 w-7 rounded-full object-cover" /><div id="support-chat-agent-header-details" className="leading-tight"><p id="support-chat-agent-header-name" className="text-sm font-medium">Simon Sai</p><p id="support-chat-window-title" className="text-xs opacity-80">Super Admin</p></div></div>
        <Button id="support-chat-close" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label={t("supportChat.close")}><X className="h-4 w-4" /></Button>
      </div>
      <div id="support-chat-messages" ref={messageListRef} onScroll={(event) => { const element = event.currentTarget; setAutoScroll(element.scrollHeight - element.scrollTop - element.clientHeight <= 24); }} className="h-64 space-y-2 overflow-y-auto p-4 text-sm">
        {messages.map((item) => <div id={`support-chat-message-row-${item.id}`} key={item.id} className={`${item.sender_kind === "agent" ? "flex items-start gap-2" : "text-right"} ${highlightedMessageIDs.includes(item.id) ? "animate-pulse rounded-md bg-primary/10 p-2" : ""}`}>{item.sender_kind === "agent" && <img id={`support-chat-agent-avatar-${item.id}`} src="/sai-avatar.png" alt="Support" className="h-5 w-5 shrink-0 rounded-full object-cover" />}<p id={`support-chat-message-${item.id}`} className={item.sender_kind === "agent" ? "text-left" : "text-right"}>{item.body}</p></div>)}
        {messages.length === 0 && <p id="support-chat-no-messages" className="text-muted-foreground">{t("supportChat.loading")}</p>}
      </div>
      {pendingNewMessages > 0 && <Button id="support-chat-new-message-indicator" size="sm" className="absolute bottom-16 left-1/2 -translate-x-1/2 shadow-md" onClick={() => { setAutoScroll(true); setPendingNewMessages(0); messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" }); }}>{pendingNewMessages} new {pendingNewMessages === 1 ? "message" : "messages"}</Button>}
      <div id="support-chat-composer" className="flex gap-2 border-t p-3">
        <Textarea id="support-chat-message" className="h-10 min-h-10 resize-none" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={t("supportChat.placeholder")} maxLength={4000} />
        <Button id="support-chat-send" size="icon" className="h-10 w-10 shrink-0" disabled={sending || !message.trim()} onClick={() => void sendMessage()} aria-label={t("supportChat.send")}><Send className="h-4 w-4" /></Button>
      </div>
    </div>}
    {!open && <Button id="support-chat-launcher" size="icon" className={`rounded-full shadow-lg ${hasNewAgentMessage ? "animate-bounce" : ""}`} onClick={() => setOpen(true)} aria-label={t("supportChat.open")}><MessageCircle className="h-5 w-5" /></Button>}
  </div>;
}
