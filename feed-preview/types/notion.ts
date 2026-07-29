/**
 * Types describing a post as it will be read from the Notion database,
 * before it is transformed into the application's internal `Post`
 * model (see data/post.ts).
 *
 * These intentionally mirror the fields a Notion database row would
 * expose for this use case, already flattened to simple values
 * (rather than raw Notion API property objects), so `notionMapper.ts`
 * has a clear, stable shape to map from once the real API is wired up.
 */

export type NotionContentType = "Image" | "Reel" | "Carousel";

export type NotionStatus = "Draft" | "Ready" | "Scheduled" | "Published";

export interface NotionPost {
  /** Notion page ID (UUID string). */
  id: string;
  /** Value of the page's title property. */
  title: string;
  /** Value of the Status select property. */
  status: NotionStatus;
  /** ISO date string from the Publish Date property. */
  publishDate: string;
  /** Value of the Content Type select property. */
  contentType: NotionContentType;
  /** URL of the cover image (file or external URL). */
  coverImage: string;
  /** Plain-text caption, extracted from a rich text property. */
  caption: string;
  /** Values from a multi-select Hashtags property, without the "#". */
  hashtags: string[];
  /** URL property linking to the source Canva design, if present. */
  canvaLink?: string;
  /** Direct URL to the page in Notion. */
  notionPageUrl: string;
  /** Manual sort order for the grid, from a number property. */
  gridOrder: number;
}
