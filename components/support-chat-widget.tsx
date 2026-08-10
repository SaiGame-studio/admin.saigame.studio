"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getGuestSupportConversation, replyToGuestSupportConversation, SupportMessage } from "@/lib/support-chat-api";

type Invitation = { conversation_id: string; subject?: string };

export function SupportChatWidget() {
  const { is_super_admin } = useCapabilities();
  const { t } = useTranslation();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [sending, setSending] = useState(false);

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

  const sendMessage = async () => {
    const body = message.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const data = await replyToGuestSupportConversation(body);
      setMessage("");
      setMessages(data.messages);
    } finally {
      setSending(false);
    }
  };

  if (is_super_admin || !invitation) return null;

  return <div id="support-chat-widget" className="fixed bottom-5 right-5 z-50 flex w-80 flex-col items-end">
    {open && <div id="support-chat-window" className="mb-3 w-full overflow-hidden rounded-xl border bg-background shadow-xl">
      <div id="support-chat-window-header" className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
        <span id="support-chat-window-title">{t("supportChat.title")}</span>
        <Button id="support-chat-close" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label={t("supportChat.close")}><X className="h-4 w-4" /></Button>
      </div>
      <div id="support-chat-messages" className="h-64 space-y-2 overflow-y-auto p-4 text-sm">
        {messages.map((item) => <p id={`support-chat-message-${item.id}`} key={item.id} className={item.sender_kind === "agent" ? "text-left" : "text-right"}>{item.body}</p>)}
        {messages.length === 0 && <p id="support-chat-no-messages" className="text-muted-foreground">{t("supportChat.loading")}</p>}
      </div>
      <div id="support-chat-composer" className="flex gap-2 border-t p-3">
        <Textarea id="support-chat-message" className="h-10 min-h-10 resize-none" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={t("supportChat.placeholder")} maxLength={4000} />
        <Button id="support-chat-send" size="icon" className="h-10 w-10 shrink-0" disabled={sending || !message.trim()} onClick={() => void sendMessage()} aria-label={t("supportChat.send")}><Send className="h-4 w-4" /></Button>
      </div>
    </div>}
    <Button id="support-chat-launcher" size="icon" className="rounded-full shadow-lg" onClick={() => setOpen(true)} aria-label={t("supportChat.open")}><MessageCircle className="h-5 w-5" /></Button>
  </div>;
}
