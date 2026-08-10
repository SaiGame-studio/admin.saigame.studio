"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pencil, RefreshCw, Send, Trash2, Users } from "lucide-react";
import { useCapabilities } from "@/hooks/use-capabilities";
import { deleteSupportConversation, getSupportConversation, getSupportPresence, PresenceTarget, startSupportConversation, SupportConversation, SupportMessage, SupportPresence, updateSupportConversationSubject } from "@/lib/support-chat-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

const EMPTY_PRESENCE: SupportPresence = { counts: { guests: 0, authenticated_users: 0, total: 0 }, targets: [] };
const SELECTED_VISITOR_KEY = "support-chat-selected-visitor";

function countryFlag(countryCode?: string): string {
  if (!countryCode || !/^[A-Z]{2}$/i.test(countryCode)) return "Globe";
  return String.fromCodePoint(...countryCode.toUpperCase().split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

export default function SupportPage() {
  const { is_super_admin } = useCapabilities();
  const { t } = useTranslation();
  const [presence, setPresence] = useState<SupportPresence>(EMPTY_PRESENCE);
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<PresenceTarget | null>(null);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectInput, setSubjectInput] = useState("");
  const [historyAutoScroll, setHistoryAutoScroll] = useState(true);
  const [pendingHistoryMessages, setPendingHistoryMessages] = useState(0);
  const historyRef = useRef<HTMLDivElement>(null);
  const knownHistoryMessageIDs = useRef(new Set<string>());
  const historyInitialized = useRef(false);

  const load = useCallback(async () => {
    try {
      setPresence(await getSupportPresence());
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to load visitors", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (visitorID: string) => {
    const data = await getSupportConversation(visitorID);
    setConversation(data.conversation);
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    if (!is_super_admin) return;
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [is_super_admin, load]);

  useEffect(() => {
    if (selectedVisitor || presence.targets.length === 0) return;
    const visitorID = window.localStorage.getItem(SELECTED_VISITOR_KEY);
    const visitor = presence.targets.find((target) => target.id === visitorID);
    if (visitor) setSelectedVisitor(visitor);
  }, [presence.targets, selectedVisitor]);

  useEffect(() => {
    if (!selectedVisitor) return;
    const refreshConversation = () => void loadConversation(selectedVisitor.id);
    refreshConversation();
    const timer = window.setInterval(refreshConversation, 5_000);
    return () => window.clearInterval(timer);
  }, [selectedVisitor, loadConversation]);

  useEffect(() => {
    if (selectedVisitor && historyAutoScroll) historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [historyAutoScroll, messages, selectedVisitor]);

  useEffect(() => {
    knownHistoryMessageIDs.current.clear();
    historyInitialized.current = false;
    setPendingHistoryMessages(0);
  }, [selectedVisitor]);

  useEffect(() => {
    if (!historyInitialized.current) {
      messages.forEach((item) => knownHistoryMessageIDs.current.add(item.id));
      historyInitialized.current = true;
      return;
    }
    const newMessageCount = messages.filter((item) => !knownHistoryMessageIDs.current.has(item.id)).length;
    messages.forEach((item) => knownHistoryMessageIDs.current.add(item.id));
    if (!historyAutoScroll && newMessageCount > 0) setPendingHistoryMessages((count) => count + newMessageCount);
  }, [historyAutoScroll, messages]);

  useEffect(() => {
    if (historyAutoScroll) setPendingHistoryMessages(0);
  }, [historyAutoScroll]);

  const startChat = async () => {
    if (!selectedVisitor || !message.trim()) return;
    setSending(true);
    try {
      await startSupportConversation(selectedVisitor, "Support chat", message.trim());
      setMessage("");
      setHistoryAutoScroll(true);
      await loadConversation(selectedVisitor.id);
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to start chat", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setSending(false);
    }
  };

  const deleteConversation = async () => {
    if (!conversation) return;
    setDeleting(true);
    try {
      await deleteSupportConversation(conversation.id);
      setConversation(null);
      setMessages([]);
      setMessage("");
      setDeleteOpen(false);
      toast({ title: t("supportAdmin.deleteSuccess") });
    } catch (error) {
      toast({ variant: "destructive", title: t("supportAdmin.deleteFailed"), description: error instanceof Error ? error.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  const saveSubject = async () => {
    if (!conversation) return;
    try {
      const data = await updateSupportConversationSubject(conversation.id, subjectInput);
      setConversation((current) => current ? { ...current, subject: data.conversation.subject } : current);
      if (selectedVisitor) setPresence((current) => ({ ...current, targets: current.targets.map((target) => target.id === selectedVisitor.id ? { ...target, label: data.conversation.subject || target.label } : target) }));
      setEditingSubject(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to update subject", description: error instanceof Error ? error.message : undefined });
    }
  };

  const startEditingSubject = () => {
    if (!conversation) return;
    setSubjectInput(conversation.subject || "");
    setEditingSubject(true);
  };

  if (!is_super_admin) return <main id="support-forbidden" className="p-6">Super Admin access is required.</main>;

  return <main id="support-console" className="space-y-6 p-6">
    <div id="support-header" className="flex items-center justify-between gap-4">
      <div id="support-heading"><h1 id="support-title" className="text-2xl font-semibold">Support chat</h1><p id="support-description" className="text-sm text-muted-foreground">Select an active visitor to inspect their conversation.</p></div>
      <Button id="support-refresh" variant="outline" size="icon" title="Refresh" onClick={() => void load()} disabled={loading} aria-label="Refresh visitors"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button>
    </div>
    <section id="support-workspace" className="grid gap-4 lg:grid-cols-10">
      <Card id="support-conversation-panel" className="lg:col-span-7">
        <CardHeader id="support-conversation-header" className="flex-row items-center justify-between gap-4 space-y-0">
          <div id="support-conversation-heading" className="flex min-w-0 flex-1 items-center gap-2">{editingSubject ? <Input id="support-conversation-title" className="h-10 flex-1" value={subjectInput} onChange={(event) => setSubjectInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void saveSubject(); } if (event.key === "Escape") setEditingSubject(false); }} maxLength={160} autoFocus /> : <CardTitle id="support-conversation-title" className="flex-1 break-words whitespace-normal">{conversation?.subject || "Conversation history"}</CardTitle>}<Button id="support-edit-subject" variant="outline" size="icon" onClick={() => void (editingSubject ? saveSubject() : startEditingSubject())} disabled={!conversation} aria-label="Edit conversation subject">{editingSubject ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}</Button></div>
          <div id="support-conversation-actions" className="flex shrink-0 gap-2">{conversation && <Button id="support-delete-conversation" variant="destructive" size="icon" onClick={() => setDeleteOpen(true)} aria-label={t("supportAdmin.deleteButton")}><Trash2 className="h-4 w-4" /></Button>}</div>
        </CardHeader>
        <CardContent id="support-conversation-content" className="h-[calc(100vh-16rem)] overflow-hidden">
          {selectedVisitor ? <>
            <div id={`support-history-${selectedVisitor.id}`} ref={historyRef} onScroll={(event) => { const element = event.currentTarget; setHistoryAutoScroll(element.scrollHeight - element.scrollTop - element.clientHeight <= 24); }} className="h-[calc(100%_-_3.5rem)] space-y-2 overflow-y-auto rounded-md border p-4 text-sm">
              {messages.map((item) => <p id={`support-message-${item.id}`} key={item.id} className={item.sender_kind === "agent" ? "text-right" : "text-left"}>{item.body}</p>)}
              {messages.length === 0 && <p id="support-history-no-messages" className="text-muted-foreground">No messages yet.</p>}
            </div>
            {pendingHistoryMessages > 0 && <Button id="support-history-new-message-indicator" size="sm" className="relative z-10 mx-auto -mt-10 flex" onClick={() => { setHistoryAutoScroll(true); setPendingHistoryMessages(0); historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" }); }}>{t("supportAdmin.newMessages", { count: pendingHistoryMessages })}</Button>}
            <div id="support-message-composer" className="mt-4 flex gap-2">
              <Textarea id="support-message" className="h-10 min-h-10 resize-none" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void startChat(); } }} placeholder="Write a message..." maxLength={4000} />
              <Button id="support-send" size="icon" className="h-10 w-10 shrink-0" onClick={() => void startChat()} disabled={sending || !message.trim()} aria-label="Send message"><Send className="h-4 w-4" /></Button>
            </div>
          </> : <div id="support-history-empty" className="flex h-full items-center justify-center rounded-md border text-sm text-muted-foreground">Choose a visitor to view history.</div>}
        </CardContent>
      </Card>
      <Card id="support-visitors" className="lg:col-span-3"><CardHeader id="support-visitors-header"><CardTitle id="support-visitors-title" className="flex items-center gap-2"><Users className="h-5 w-5" />Active visitors</CardTitle><div id="support-visitor-counts" className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground"><span id="support-count-guests" className="rounded-full bg-muted px-2 py-1">Guests: {presence.counts.guests}</span><span id="support-count-authenticated-users" className="rounded-full bg-muted px-2 py-1">Auth: {presence.counts.authenticated_users}</span><span id="support-count-total-active" className="rounded-full bg-muted px-2 py-1">Total: {presence.counts.total}</span></div><CardDescription id="support-visitors-description">Click a visitor to display their history.</CardDescription></CardHeader><CardContent id="support-visitors-content"><div id="support-target-list" className="divide-y rounded-md border">{presence.targets.map((visitor) => <button id={`support-target-${visitor.id}`} type="button" key={`${visitor.kind}-${visitor.id}`} onClick={() => { window.localStorage.setItem(SELECTED_VISITOR_KEY, visitor.id); setSelectedVisitor(visitor); }} className={`w-full px-3 py-2 text-left ${selectedVisitor?.id === visitor.id ? "bg-muted" : "hover:bg-muted/50"}`}><div id={`support-target-details-${visitor.id}`} className="min-w-0"><p id={`support-target-label-${visitor.id}`} className="truncate text-sm font-medium">{visitor.label}</p><p id={`support-target-location-${visitor.id}`} className="truncate text-xs text-muted-foreground">{countryFlag(visitor.country_code)} {visitor.country_name || visitor.country_code || "Unknown country"} · {visitor.ip || "Unknown IP"}</p></div></button>)}{!loading && presence.targets.length === 0 && <p id="support-no-targets" className="p-6 text-center text-sm text-muted-foreground">No active visitors.</p>}</div></CardContent></Card>
    </section>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent id="support-delete-dialog">
        <AlertDialogHeader id="support-delete-dialog-header"><AlertDialogTitle id="support-delete-dialog-title">{t("supportAdmin.deleteTitle")}</AlertDialogTitle><AlertDialogDescription id="support-delete-dialog-description">{t("supportAdmin.deleteDescription")}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter id="support-delete-dialog-footer"><AlertDialogCancel id="support-delete-dialog-cancel" disabled={deleting}>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction id="support-delete-dialog-confirm" disabled={deleting} onClick={() => void deleteConversation()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>;
}
