import { NextResponse } from "next/server";
import { WIDGET_VERSION } from "../../../lib/version";

interface UpdateManifest {
  latestVersion?: string;
  releaseNotesUrl?: string;
}

/**
 * Reports the widget's current version and, if UPDATE_MANIFEST_URL is
 * configured, checks it against a hosted manifest for a newer release.
 *
 * This is intentionally optional and best-effort: without a manifest
 * URL configured, there's no real update infrastructure to check
 * against yet, so this honestly reports "not checked" rather than
 * fabricating an "up to date" result. Wiring UPDATE_MANIFEST_URL up
 * to a simple hosted JSON file (e.g. { "latestVersion": "1.1.0",
 * "releaseNotesUrl": "..." }) is all that's needed to turn this on.
 */
export async function GET() {
  const manifestUrl = process.env.UPDATE_MANIFEST_URL;

  if (!manifestUrl) {
    return NextResponse.json({
      currentVersion: WIDGET_VERSION,
      latestVersion: WIDGET_VERSION,
      updateAvailable: false,
      releaseNotesUrl: null,
      checked: false,
    });
  }

  try {
    const response = await fetch(manifestUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Manifest responded with ${response.status}`);

    const manifest = (await response.json()) as UpdateManifest;
    const latestVersion =
      typeof manifest.latestVersion === "string" ? manifest.latestVersion : WIDGET_VERSION;

    return NextResponse.json({
      currentVersion: WIDGET_VERSION,
      latestVersion,
      updateAvailable: latestVersion !== WIDGET_VERSION,
      releaseNotesUrl:
        typeof manifest.releaseNotesUrl === "string" ? manifest.releaseNotesUrl : null,
      checked: true,
    });
  } catch (err) {
    console.error("[version check]", err instanceof Error ? err.message : err);
    // Best-effort: if the manifest can't be reached, report the
    // current version without claiming to know whether it's current.
    return NextResponse.json({
      currentVersion: WIDGET_VERSION,
      latestVersion: WIDGET_VERSION,
      updateAvailable: false,
      releaseNotesUrl: null,
      checked: false,
    });
  }
}
