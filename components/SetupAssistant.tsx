"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  Database,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import {
  listDatabases,
  validateDatabase,
  selectDatabase,
  type DatabaseSummary,
  type SchemaValidation,
} from "../services/notionSetupService";
import { CARD_SHADOW } from "../lib/elevation";

const containerStyle: CSSProperties = {
  borderRadius: 24,
  boxShadow: CARD_SHADOW,
};

type Step =
  | { name: "picking" }
  | { name: "checking"; database: DatabaseSummary }
  | { name: "reviewing"; database: DatabaseSummary; validation: SchemaValidation };

/**
 * Shown once a workspace is connected but no database has been chosen
 * yet. Lists the workspace's databases, then — once one is picked —
 * checks it against the properties this app needs and offers
 * automatic mapping for anything missing, before finishing setup.
 */
export default function SetupAssistant({
  workspaceName,
  onComplete,
}: {
  workspaceName: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<Step>({ name: "picking" });
  const [databases, setDatabases] = useState<DatabaseSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listDatabases()
      .then((list) => {
        if (!cancelled) setDatabases(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Couldn't load your databases.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePick(database: DatabaseSummary) {
    setLoadError(null);
    setStep({ name: "checking", database });

    try {
      const validation = await validateDatabase(database.id);
      setStep({ name: "reviewing", database, validation });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't check that database.");
      setStep({ name: "picking" });
    }
  }

  async function handleConfirm(database: DatabaseSummary, validation: SchemaValidation) {
    setIsConfirming(true);
    setLoadError(null);

    try {
      const propertyMap: Record<string, string> = {};
      validation.properties.forEach((property) => {
        if (property.status !== "matched" && property.suggestion) {
          propertyMap[property.name] = property.suggestion.propertyName;
        }
      });

      await selectDatabase(database.id, propertyMap);
      onComplete();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't finish setup.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-10">
      <div className="w-full max-w-md bg-white p-8" style={containerStyle}>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900">
            <Database className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-neutral-900">
            {step.name === "reviewing" ? "Review your database" : "Choose your content database"}
          </h1>
          <p className="mt-1.5 max-w-[280px] text-[13.5px] leading-relaxed text-neutral-400">
            {step.name === "reviewing"
              ? `Here's how "${step.database.title}" lines up with what this app needs.`
              : `Connected to ${workspaceName || "your workspace"}. Pick the database to preview.`}
          </p>
        </div>

        {loadError && (
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" strokeWidth={2} />
            <p className="text-[13px] leading-snug text-rose-600">{loadError}</p>
          </div>
        )}

        {step.name === "picking" && (
          <div className="mt-6">
            {databases === null ? (
              <div className="flex items-center justify-center gap-2 py-8 text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                <span className="text-[13px]">Loading your databases…</span>
              </div>
            ) : databases.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-neutral-400">
                No databases were shared with this integration yet. Open a database in Notion,
                use the ••• menu, and add this app under Connections.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {databases.map((database) => (
                  <button
                    key={database.id}
                    type="button"
                    onClick={() => handlePick(database)}
                    className="flex items-center gap-2.5 rounded-xl border border-[#F2F2F2] px-3.5 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-neutral-50"
                  >
                    <span className="text-[15px]">{database.icon ?? "📄"}</span>
                    <span className="flex-1 truncate text-[13.5px] font-medium text-neutral-800">
                      {database.title}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" strokeWidth={2} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step.name === "checking" && (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            <span className="text-[13px]">Checking properties…</span>
          </div>
        )}

        {step.name === "reviewing" && (
          <>
            <div className="mt-6 flex flex-col gap-2">
              {step.validation.properties.map((property) => (
                <div
                  key={property.name}
                  className="flex items-start gap-2.5 rounded-xl border border-[#F2F2F2] px-3.5 py-2.5"
                >
                  {property.status === "matched" && (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                  )}
                  {property.status === "type_mismatch" && (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
                  )}
                  {property.status === "missing" && (
                    <XCircle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${property.optional ? "text-neutral-300" : "text-rose-500"}`}
                      strokeWidth={2}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-neutral-800">
                      {property.label}
                      {property.optional && (
                        <span className="ml-1.5 text-[11px] font-normal text-neutral-400">optional</span>
                      )}
                    </p>
                    {property.status === "matched" ? (
                      <p className="mt-0.5 text-[12px] text-neutral-400">Found and ready to go.</p>
                    ) : property.suggestion ? (
                      <p className="mt-0.5 text-[12px] text-neutral-400">
                        We'll use your <span className="font-medium text-neutral-600">{property.suggestion.propertyName}</span> property for this.
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[12px] text-neutral-400">{property.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleConfirm(step.database, step.validation)}
              disabled={!step.validation.isReady || isConfirming}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-[13px] font-medium text-white transition-colors duration-200 ease-out hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  Finishing setup…
                </>
              ) : step.validation.isReady ? (
                "Looks good — connect this database"
              ) : (
                "Add the missing properties in Notion first"
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep({ name: "picking" })}
              className="mt-2 w-full rounded-xl py-2.5 text-[13px] font-medium text-neutral-500 transition-colors duration-200 ease-out hover:bg-neutral-50 hover:text-neutral-700"
            >
              Choose a different database
            </button>
          </>
        )}
      </div>
    </div>
  );
}
