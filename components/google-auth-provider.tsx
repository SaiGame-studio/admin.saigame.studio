"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import type React from "react";
export function GoogleAuthProvider({ children }: {
    children: React.ReactNode;
}) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "780968193083-p0c7vvsf864khtltmqk8pv82l6qoconn.apps.googleusercontent.com";
    return (<GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>);
}
