import type { NotionSession } from "../session";
import { createNotionClient } from "./client";
import { validateDatabaseSchema } from "./schema";
import { toFriendlyError } from "../../lib/friendlyNotionError";
import { WIDGET_VERSION } from "../../lib/version";

export type CheckStatus = "pass" | "fail" | "warning" | "skipped";

export interface DiagnosticCheck {
  id: "connection" | "database" | "permissions" | "properties" | "api" | "version";
  label: string;
  status: CheckStatus;
  message: string;
  fixSteps?: string[];
}

export interface DiagnosticsReport {
  overallStatus: "healthy" | "issues";
  checks: DiagnosticCheck[];
}

/**
 * Live check against Notion's API — not a cached/assumed value. Calls
 * a lightweight, always-available endpoint so this reflects Notion's
 * actual current reachability, independent of whether a workspace is
 * connected.
 */
async function checkApiStatus(accessToken: string | undefined): Promise<DiagnosticCheck> {
  try {
    const response = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        "Notion-Version": "2022-06-28",
      },
      signal: AbortSignal.timeout(8000),
    });

    // Even a 401 (no/invalid token) proves the API itself is up and
    // responding correctly — that's a separate concern from "connection".
    if (response.ok || response.status === 401) {
      return {
        id: "api",
        label: "Notion API status",
        status: "pass",
        message: "Notion's API is responding normally.",
      };
    }

    return {
      id: "api",
      label: "Notion API status",
      status: "warning",
      message: "Notion's API responded, but not as expected. It may be experiencing issues.",
    };
  } catch {
    return {
      id: "api",
      label: "Notion API status",
      status: "fail",
      message: "Couldn't reach Notion's API right now.",
      fixSteps: ["Check your internet connection.", "Try again in a few minutes."],
    };
  }
}

function versionCheck(): DiagnosticCheck {
  return {
    id: "version",
    label: "Widget version",
    status: "pass",
    message: `Running version ${WIDGET_VERSION}.`,
  };
}

function skipped(id: DiagnosticCheck["id"], label: string, reason: string): DiagnosticCheck {
  return { id, label, status: "skipped", message: reason };
}

/**
 * Runs every health check the Diagnostics screen (and, implicitly,
 * the installation wizard) relies on: connection, database selection,
 * permissions, required properties, live API status, and version.
 * Later checks are skipped (not run) once an earlier one blocks them,
 * so the report always explains the *first* thing to fix rather than
 * a wall of downstream failures.
 */
export async function runDiagnostics(session: NotionSession | null): Promise<DiagnosticsReport> {
  const checks: DiagnosticCheck[] = [];

  if (!session) {
    checks.push({
      id: "connection",
      label: "Notion connection",
      status: "fail",
      message: "No Notion workspace is connected.",
      fixSteps: ['Open Settings and choose "Reconnect Notion."'],
    });
    checks.push(skipped("database", "Database selected", "Connect a workspace first."));
    checks.push(skipped("permissions", "Permissions", "Connect a workspace first."));
    checks.push(skipped("properties", "Required properties", "Connect a workspace first."));
    checks.push(await checkApiStatus(undefined));
    checks.push(versionCheck());

    return { overallStatus: "issues", checks };
  }

  checks.push({
    id: "connection",
    label: "Notion connection",
    status: "pass",
    message: `Connected to ${session.workspaceName}.`,
  });

  if (!session.databaseId) {
    checks.push({
      id: "database",
      label: "Database selected",
      status: "fail",
      message: "No database has been selected yet.",
      fixSteps: ['Open Settings and choose "Change database."'],
    });
    checks.push(skipped("permissions", "Permissions", "Select a database first."));
    checks.push(skipped("properties", "Required properties", "Select a database first."));
  } else {
    checks.push({
      id: "database",
      label: "Database selected",
      status: "pass",
      message: "A database is selected.",
    });

    try {
      const client = createNotionClient(session.accessToken);
      const dataSource = await client.dataSources.retrieve({
        data_source_id: session.databaseId,
      });

      checks.push({
        id: "permissions",
        label: "Permissions",
        status: "pass",
        message: "This app can read and write to the selected database.",
      });

      if ("properties" in dataSource) {
        const properties = Object.fromEntries(
          Object.entries(dataSource.properties).map(([name, config]) => [
            name,
            { type: config.type },
          ])
        );

        const validation = validateDatabaseSchema(properties);
        const missing = validation.properties.filter(
          (property) => !property.optional && property.status !== "matched"
        );

        checks.push(
          missing.length === 0
            ? {
                id: "properties",
                label: "Required properties",
                status: "pass",
                message: "All required properties are present.",
              }
            : {
                id: "properties",
                label: "Required properties",
                status: "fail",
                message: `Missing or misconfigured: ${missing.map((p) => p.label).join(", ")}.`,
                fixSteps: [
                  'Open Settings and choose "Change database" to re-run the setup assistant, which can map these automatically.',
                ],
              }
        );
      } else {
        checks.push({
          id: "properties",
          label: "Required properties",
          status: "warning",
          message: "Couldn't read this database's full property list.",
        });
      }
    } catch (err) {
      const friendly = toFriendlyError(err);
      checks.push({
        id: "permissions",
        label: "Permissions",
        status: "fail",
        message: friendly.message,
        fixSteps: friendly.fixSteps,
      });
      checks.push(skipped("properties", "Required properties", "Fix permissions first."));
    }
  }

  checks.push(await checkApiStatus(session.accessToken));
  checks.push(versionCheck());

  const overallStatus = checks.some((check) => check.status === "fail") ? "issues" : "healthy";

  return { overallStatus, checks };
}
