/**
 * Single source of truth for the widget's version. The update
 * checker (see app/api/version/route.ts) compares this against an
 * optional external manifest to tell the user when a new version is
 * available.
 *
 * Bump this on every release.
 */
export const WIDGET_VERSION = "1.0.0";
