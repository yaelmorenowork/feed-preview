"use client";

import { Component, type ReactNode, type CSSProperties, type ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";
import { CARD_SHADOW } from "../lib/elevation";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const containerStyle: CSSProperties = {
  borderRadius: 24,
  boxShadow: CARD_SHADOW,
};

/**
 * Top-level safety net for the widget. React error boundaries can
 * only be implemented as class components (no hook equivalent).
 * Catches unexpected render-time errors anywhere in the widget tree
 * and shows a calm fallback instead of leaving the embed blank or
 * crashing the host Notion page.
 *
 * The fallback includes a "Try again" action that simply resets the
 * boundary's own state, so a transient render error doesn't force a
 * full page reload to recover from.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Widget] Unexpected error", error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white p-10">
          <div
            className="flex w-full max-w-md flex-col items-center bg-white p-8 text-center"
            style={containerStyle}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100/80">
              <AlertTriangle className="h-6 w-6 text-rose-500" strokeWidth={1.75} />
            </div>
            <p className="mt-5 text-[15px] font-semibold text-neutral-900">
              Something went wrong
            </p>
            <p className="mt-1.5 max-w-[280px] text-[13.5px] leading-relaxed text-neutral-400">
              This widget hit an unexpected error.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-5 rounded-xl bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-colors duration-200 ease-out hover:bg-neutral-800"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
