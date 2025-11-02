"use client"
import { AutumnProvider } from "autumn-js/react";
import React from "react";

export default function CustomAutumnProvider({ children }: { children: React.ReactNode }) {
  // Capture ?token=... from URL (after checkout redirect) and persist
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (token) {
      localStorage.setItem("bearer_token", token);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return (
    <AutumnProvider
      getBearerToken={async () => {
        return localStorage.getItem("bearer_token") || null;
      }}
    >
      {children}
    </AutumnProvider>
  );
}