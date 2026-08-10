"use client";

import { useEffect } from "react";
import { getValidToken } from "@/lib/auth-utils";
import { useAuth } from "@/contexts/auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const VISITOR_ID_KEY = "support-chat-visitor-id";

function getPersistentVisitorID(): string {
  const savedID = window.localStorage.getItem(VISITOR_ID_KEY);
  if (/^[a-f0-9]{64}$/i.test(savedID || "")) return savedID!;
  const value = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  window.localStorage.setItem(VISITOR_ID_KEY, value);
  return value;
}

export function SupportPresenceHeartbeat() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!API_URL || isLoading) return;
    const send = () => {
      const token = getValidToken();
      const visitorID = getPersistentVisitorID();
      return void fetch(`${API_URL}/api/v1/support/presence/heartbeat`, { method: "POST", credentials: "include", headers: { "X-Support-Visitor-ID": visitorID, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.chat_invitation) {
          window.sessionStorage.removeItem("support-chat-invitation");
          window.dispatchEvent(new CustomEvent("support-chat-invitation", { detail: null }));
          return;
        }
        window.sessionStorage.setItem("support-chat-invitation", JSON.stringify(data.chat_invitation));
        window.localStorage.setItem("support-chat-conversation-id", data.chat_invitation.conversation_id);
        window.dispatchEvent(new CustomEvent("support-chat-invitation", { detail: data.chat_invitation }));
      })
      .catch(() => undefined);
    };
    send();
    const timer = window.setInterval(send, 5_000);
    return () => window.clearInterval(timer);
  }, [isLoading]);
  return null;
}
