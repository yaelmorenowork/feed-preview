export type RequiredPropertyType =
  | "title"
  | "select"
  | "date"
  | "rich_text"
  | "files"
  | "multi_select"
  | "url"
  | "number";

export interface RequiredProperty {
  /** The property name this app looks for by default. */
  name: string;
  type: RequiredPropertyType;
  label: string;
  description: string;
  /** The feed still works without this — it degrades gracefully. */
  optional?: boolean;
}

/**
 * The property schema this app expects a connected database to have.
 * Mirrors exactly what server/notion/pageParser.ts reads and
 * server/notion/fieldUpdater.ts writes — this file is the single
 * source of truth both of those are built against.
 */
export const REQUIRED_PROPERTIES: RequiredProperty[] = [
  {
    name: "Title",
    type: "title",
    label: "Title",
    description: "The post's title. Every Notion database already has one of these.",
  },
  {
    name: "Status",
    type: "select",
    label: "Status",
    description: 'A select property with options like "Draft", "Ready", "Scheduled", "Published".',
  },
  {
    name: "Publish Date",
    type: "date",
    label: "Publish date",
    description: "A date property for when the post is scheduled to go out.",
  },
  {
    name: "Content Type",
    type: "select",
    label: "Content type",
    description: 'A select property with options like "Image", "Reel", "Carousel".',
  },
  {
    name: "Cover Image",
    type: "files",
    label: "Cover image",
    description: "A files property holding the post's thumbnail image.",
  },
  {
    name: "Caption",
    type: "rich_text",
    label: "Caption",
    description: "A text property for the post's caption.",
  },
  {
    name: "Hashtags",
    type: "multi_select",
    label: "Hashtags",
    description: "A multi-select property listing the post's hashtags.",
  },
  {
    name: "Canva Link",
    type: "url",
    label: "Canva link",
    description: "A URL property linking to the design file.",
    optional: true,
  },
  {
    name: "Grid Order",
    type: "number",
    label: "Grid order",
    description: "A number property controlling manual ordering in the grid.",
    optional: true,
  },
];

export interface ExistingProperty {
  type: string;
}

export type PropertyValidationStatus = "matched" | "type_mismatch" | "missing";

export interface PropertyValidationResult {
  /** This app's expected property name (also the propertyMap key). */
  name: string;
  label: string;
  description: string;
  type: RequiredPropertyType;
  optional: boolean;
  status: PropertyValidationStatus;
  /** An existing property on the database that could be mapped
   *  instead, when one of a matching type exists. */
  suggestion?: { propertyName: string; propertyType: string };
}

export interface SchemaValidationResult {
  /** True once every *required* (non-optional) property is matched or mapped. */
  isReady: boolean;
  properties: PropertyValidationResult[];
}

/**
 * Compares a Notion data source's actual properties against what this
 * app requires, and — for anything missing or the wrong type — looks
 * for a same-type property with a plausibly similar name to suggest
 * as an automatic mapping. This is what powers the setup assistant's
 * "we found a property that might work" suggestions.
 */
export function validateDatabaseSchema(
  properties: Record<string, ExistingProperty>
): SchemaValidationResult {
  const entries = Object.entries(properties);

  const results: PropertyValidationResult[] = REQUIRED_PROPERTIES.map((required) => {
    const exact = properties[required.name];

    if (exact && exact.type === required.type) {
      return {
        name: required.name,
        label: required.label,
        description: required.description,
        type: required.type,
        optional: Boolean(required.optional),
        status: "matched",
      };
    }

    const sameTypeCandidates = entries.filter(([, prop]) => prop.type === required.type);
    const nameHint = required.label.toLowerCase().split(" ")[0];
    const bestMatch =
      sameTypeCandidates.find(([propName]) => propName.toLowerCase().includes(nameHint)) ??
      sameTypeCandidates[0];

    return {
      name: required.name,
      label: required.label,
      description: required.description,
      type: required.type,
      optional: Boolean(required.optional),
      status: exact ? "type_mismatch" : "missing",
      suggestion: bestMatch
        ? { propertyName: bestMatch[0], propertyType: bestMatch[1].type }
        : undefined,
    };
  });

const isReady = results.every((result) => result.optional || result.status === "matched" || Boolean(result.suggestion));
  return { isReady, properties: results };
}

/**
 * Resolves the actual Notion property name to read/write for a given
 * required field, honoring a saved propertyMap override (from the
 * setup assistant) when present, falling back to the default name.
 */
export function resolvePropertyName(
  requiredName: string,
  propertyMap: Record<string, string> | undefined
): string {
  return propertyMap?.[requiredName] ?? requiredName;
}
