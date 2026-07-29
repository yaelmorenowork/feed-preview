"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { getConnectionStatus } from "./services/notionConnectionService";

// A user only ever sees exactly one of these three screens at a time,
// so each is code-split into its own chunk instead of all three (plus
// their dependencies — drag & drop, media editing, etc.) being part
// of the very first bundle a brand-new, not-yet-connected user has to
// download just to see a "Connect with Notion" button.
const OnboardingScreen = dynamic(() => import("./components/OnboardingScreen"));
const SetupAssistant = dynamic(() => import("./components/SetupAssistant"));
const FeedPreview = dynamic(() => import("./components/FeedPreview"));

type WidgetState =
  | { name: "loading" }
  | { name: "disconnected"; connectionError: string | null }
  | { name: "needs_setup"; workspaceName: string }
  | { name: "ready" };

function readQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

/** Strips OAuth callback query params from the URL without a reload,
 *  so refreshing the page doesn't re-trigger error/success handling. */
function clearQueryParams(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", window.location.pathname);
}

/**
 * Top-level entry point for the widget.
 *
 * On mount, checks connection status via the server (the access
 * token itself never reaches this component or any client code) and
 * shows exactly one of three screens:
 *  - OnboardingScreen: no workspace connected yet.
 *  - SetupAssistant: connected, but no database chosen/validated yet.
 *  - FeedPreview: fully configured — the existing, unmodified product.
 *
 * Wrapped in an ErrorBoundary so an unexpected error anywhere in the
 * tree shows a graceful fallback instead of a blank/crashed embed
 * inside the host Notion page.
 */
export default function Widget() {
  const [state, setState] = useState<WidgetState>({ name: "loading" });

  useEffect(() => {
    let cancelled = false;

    const connectionError = readQueryParam("connection_error");
    const justConnected = readQueryParam("connected");
    if (connectionError || justConnected) clearQueryParams();

    getConnectionStatus().then((status) => {
      if (cancelled) return;

      if (!status.connected) {
        setState({ name: "disconnected", connectionError });
      } else if (!status.setupComplete) {
        setState({ name: "needs_setup", workspaceName: status.workspaceName ?? "" });
      } else {
        setState({ name: "ready" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ErrorBoundary>
      {state.name === "loading" && (
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-300" strokeWidth={2} />
        </div>
      )}

      {state.name === "disconnected" && (
        <OnboardingScreen connectionError={state.connectionError} />
      )}

      {state.name === "needs_setup" && (
        <SetupAssistant
          workspaceName={state.workspaceName}
          onComplete={() => setState({ name: "ready" })}
        />
      )}

      {state.name === "ready" && <FeedPreview />}
    </ErrorBoundary>
  );
}
