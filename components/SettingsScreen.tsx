"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  Settings as SettingsIcon,
  RefreshCw,
  Database,
  LogOut,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  RECONNECT_URL,
  changeDatabase,
  refreshCache,
  resetConfiguration,
} from "../services/notionSettingsService";
import { getConnectionStatus } from "../services/notionConnectionService";
import { checkForUpdates, type UpdateStatus } from "../services/updateCheckerService";
import { WIDGET_VERSION } from "../lib/version";
import { CARD_SHADOW } from "../lib/elevation";

const containerStyle: CSSProperties = {
  borderRadius: 24,
  boxShadow: CARD_SHADOW,
};

type ActionKey = "changeDatabase" | "refreshCache" | "reset";

interface ActionFeedback {
  action: ActionKey;
  kind: "success" | "error";
  message: string;
}

/**
 * Standalone settings screen (app/settings/page.tsx). Every action
 * here calls an existing, already-verified service — this screen
 * doesn't introduce any new business logic, only a place to trigger
 * actions that previously had no UI.
 */
export default function SettingsScreen() {
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    getConnectionStatus().then((status) => {
      setWorkspaceName(status.connected ? status.workspaceName ?? "Your workspace" : null);
    });
    checkForUpdates().then(setUpdateStatus);
  }, []);

  async function handleChangeDatabase() {
    setPendingAction("changeDatabase");
    setFeedback(null);
    try {
      await changeDatabase();
      setFeedback({
        action: "changeDatabase",
        kind: "success",
        message: "Database cleared. Reload the app to choose a new one.",
      });
    } catch (err) {
      setFeedback({
        action: "changeDatabase",
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRefreshCache() {
    setPendingAction("refreshCache");
    setFeedback(null);
    try {
      const result = await refreshCache();
      const missing = result.properties.filter((p) => !p.optional && p.status !== "matched");
      setFeedback({
        action: "refreshCache",
        kind: missing.length === 0 ? "success" : "error",
        message:
          missing.length === 0
            ? "Refreshed — everything still looks good."
            : `Refreshed — found an issue: ${missing.map((p) => p.label).join(", ")} needs attention.`,
      });
    } catch (err) {
      setFeedback({
        action: "refreshCache",
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReset() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }

    setPendingAction("reset");
    setFeedback(null);
    try {
      await resetConfiguration();
      setWorkspaceName(null);
      setFeedback({
        action: "reset",
        kind: "success",
        message: "Configuration reset. Reload the app to start over.",
      });
    } catch (err) {
      setFeedback({
        action: "reset",
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setPendingAction(null);
      setConfirmingReset(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-10">
      <div className="w-full max-w-md bg-white p-8" style={containerStyle}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900">
            <SettingsIcon className="h-4 w-4 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-neutral-900">
              Settings
            </h1>
            <p className="text-[12px] text-neutral-400">
              {workspaceName ? `Connected to ${workspaceName}` : "Not connected"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-1.5">
          <SettingsRow
            icon={<LogOut className="h-4 w-4" strokeWidth={2} />}
            title="Reconnect Notion"
            description="Re-authorize this app's access to your workspace."
            actionLabel="Reconnect"
            href={RECONNECT_URL}
          />

          <SettingsRow
            icon={<Database className="h-4 w-4" strokeWidth={2} />}
            title="Change database"
            description="Keep your workspace connected, pick a different database."
            actionLabel="Change"
            isLoading={pendingAction === "changeDatabase"}
            onClick={handleChangeDatabase}
          />

          <SettingsRow
            icon={<RefreshCw className="h-4 w-4" strokeWidth={2} />}
            title="Refresh cache"
            description="Re-check the connected database against what this app needs."
            actionLabel="Refresh"
            isLoading={pendingAction === "refreshCache"}
            onClick={handleRefreshCache}
          />

          <SettingsRow
            icon={<RotateCcw className="h-4 w-4" strokeWidth={2} />}
            title="Reset configuration"
            description="Disconnect everything and start over from scratch."
            actionLabel={confirmingReset ? "Confirm reset" : "Reset"}
            destructive
            isLoading={pendingAction === "reset"}
            onClick={handleReset}
          />
        </div>

        {feedback && (
          <div
            className={`mt-5 flex items-start gap-2 rounded-xl px-3.5 py-3 ${
              feedback.kind === "success" ? "bg-emerald-50" : "bg-rose-50"
            }`}
          >
            {feedback.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" strokeWidth={2} />
            )}
            <p
              className={`text-[13px] leading-snug ${
                feedback.kind === "success" ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {feedback.message}
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-[#F2F2F2] pt-4">
          <p className="text-[12px] text-neutral-400">Version {WIDGET_VERSION}</p>
          {updateStatus?.checked && updateStatus.updateAvailable ? (
            <a
              href={updateStatus.releaseNotesUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[12px] font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900"
            >
              Update to {updateStatus.latestVersion}
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
            </a>
          ) : (
            <p className="text-[12px] text-neutral-300">
              {updateStatus?.checked ? "Up to date" : "Not checked"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  actionLabel,
  href,
  onClick,
  isLoading,
  destructive,
}: {
  icon: React.ReactElement;
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
  onClick?: () => void;
  isLoading?: boolean;
  destructive?: boolean;
}) {
  const buttonClasses = `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 ease-out ${
    destructive
      ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
  }`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#F2F2F2] px-3.5 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-neutral-800">{title}</p>
        <p className="text-[12px] leading-snug text-neutral-400">{description}</p>
      </div>

      {href ? (
        <a href={href} className={buttonClasses}>
          {actionLabel}
        </a>
      ) : (
        <button type="button" onClick={onClick} disabled={isLoading} className={buttonClasses}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : actionLabel}
        </button>
      )}
    </div>
  );
}
