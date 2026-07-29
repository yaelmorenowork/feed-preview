export type PostType = "image" | "reel" | "carousel";
export type PostStatus = "Draft" | "Ready" | "Scheduled" | "Published";

export interface Post {
  /** A Notion page ID. */
  id: number | string;
  type: PostType;
  imageUrl: string;
  status: PostStatus;
  /** ISO date (YYYY-MM-DD), matching Notion's date property format. */
  scheduledDate: string;
  title: string;
  caption: string;
  hashtags: string[];
  canvaLink?: string;
  notionPageUrl?: string;
  gridOrder?: number;
}

/**
 * The subset of Post fields the Side Panel lets a user edit, which
 * sync back to the underlying Notion page. Keeping this as an
 * explicit list (rather than "all of Post") makes it a compile-time
 * error to forget wiring a new editable field through the autosave
 * hook and the Notion update service.
 */
export type EditableField =
  | "title"
  | "caption"
  | "scheduledDate"
  | "status"
  | "hashtags"
  | "canvaLink"
  | "gridOrder";

export type EditableFields = Pick<Post, EditableField>;
