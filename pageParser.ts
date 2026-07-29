import type { PageObjectResponse } from "@notionhq/client";
import { NotionPost, NotionStatus, NotionContentType } from "../../types/notion";
import { resolvePropertyName } from "./schema";

/**
 * Parses a raw Notion page (as returned by dataSources.query) into
 * the flattened NotionPost shape used by the rest of the app.
 *
 * Property *names* are resolved through the workspace's saved
 * propertyMap (see server/notion/schema.ts and the setup assistant),
 * so this works whether a database uses our exact default names
 * ("Title", "Status", ...) or the user mapped different existing
 * properties during setup.
 *
 * If a property is missing or of an unexpected type, a safe default
 * is returned rather than throwing, so a partially-filled database
 * row still renders instead of breaking the whole feed.
 */

type NotionProperties = PageObjectResponse["properties"];

function getTitle(properties: NotionProperties, name: string): string {
  const property = properties[name];
  if (property?.type === "title") {
    return property.title.map((t) => t.plain_text).join("");
  }
  return "";
}

function getSelectName(properties: NotionProperties, name: string): string {
  const property = properties[name];
  if (property?.type === "select" && property.select) {
    return property.select.name;
  }
  return "";
}

function getDate(properties: NotionProperties, name: string): string {
  const property = properties[name];
  if (property?.type === "date" && property.date) {
    return property.date.start;
  }
  return "";
}

function getRichText(properties: NotionProperties, name: string): string {
  const property = properties[name];
  if (property?.type === "rich_text") {
    return property.rich_text.map((t) => t.plain_text).join("");
  }
  return "";
}

function getFileUrl(properties: NotionProperties, name: string): string {
  const property = properties[name];
  if (property?.type === "files" && property.files.length > 0) {
    const file = property.files[0];
    if (file.type === "file") return file.file.url;
    if (file.type === "external") return file.external.url;
  }
  return "";
}

function getMultiSelectNames(properties: NotionProperties, name: string): string[] {
  const property = properties[name];
  if (property?.type === "multi_select") {
    return property.multi_select.map((option) => option.name);
  }
  return [];
}

function getUrl(properties: NotionProperties, name: string): string | undefined {
  const property = properties[name];
  if (property?.type === "url") {
    return property.url ?? undefined;
  }
  return undefined;
}

function getNumber(properties: NotionProperties, name: string): number {
  const property = properties[name];
  if (property?.type === "number") {
    return property.number ?? 0;
  }
  return 0;
}

const NOTION_STATUSES: readonly NotionStatus[] = [
  "Draft",
  "Ready",
  "Scheduled",
  "Published",
];
const NOTION_CONTENT_TYPES: readonly NotionContentType[] = [
  "Image",
  "Reel",
  "Carousel",
];

/**
 * Validates a raw select value against a known set of options,
 * falling back to `fallback` if it doesn't match. Notion select
 * properties are free text on the Notion side (a database author can
 * rename or mistype an option), so this is a real runtime boundary,
 * not just a type-level formality.
 */
function toKnownValue<T extends string>(
  value: string,
  knownValues: readonly T[],
  fallback: T
): T {
  return (knownValues as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseNotionPage(
  page: PageObjectResponse,
  propertyMap: Record<string, string> | undefined
): NotionPost {
  const { properties } = page;
  const resolve = (name: string) => resolvePropertyName(name, propertyMap);

  return {
    id: page.id,
    title: getTitle(properties, resolve("Title")),
    status: toKnownValue(
      getSelectName(properties, resolve("Status")),
      NOTION_STATUSES,
      "Draft"
    ),
    publishDate: getDate(properties, resolve("Publish Date")),
    contentType: toKnownValue(
      getSelectName(properties, resolve("Content Type")),
      NOTION_CONTENT_TYPES,
      "Image"
    ),
    coverImage: getFileUrl(properties, resolve("Cover Image")),
    caption: getRichText(properties, resolve("Caption")),
    hashtags: getMultiSelectNames(properties, resolve("Hashtags")),
    canvaLink: getUrl(properties, resolve("Canva Link")),
    notionPageUrl: page.url,
    gridOrder: getNumber(properties, resolve("Grid Order")),
  };
}
