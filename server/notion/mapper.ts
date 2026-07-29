import { Post, PostType } from "../../data/post";
import { NotionPost, NotionContentType } from "../../types/notion";

/**
 * Maps the Notion content-type vocabulary onto the app's internal
 * PostType vocabulary.
 */
const contentTypeToPostType: Record<NotionContentType, PostType> = {
  Image: "image",
  Reel: "reel",
  Carousel: "carousel",
};

const DEFAULT_POST_TYPE: PostType = "image";

/**
 * Transforms a single Notion post (already flattened from the raw
 * Notion API response, see types/notion.ts) into the application's
 * internal Post model.
 *
 * This is the single seam where Notion's data shape and vocabulary
 * get translated into the shape every component already renders.
 * Nothing else in the app needs to know Notion exists.
 */
export function mapNotionPostToPost(notionPost: NotionPost): Post {
  // pageParser.ts already validates contentType against the known
  // union, but that guarantee only holds for data that went through
  // it — defend here too in case this mapper is ever called with
  // data from a different source.
  const type = contentTypeToPostType[notionPost.contentType] ?? DEFAULT_POST_TYPE;

  return {
    id: notionPost.id,
    type,
    imageUrl: notionPost.coverImage,
    status: notionPost.status,
    scheduledDate: notionPost.publishDate,
    title: notionPost.title,
    caption: notionPost.caption,
    hashtags: notionPost.hashtags,
    canvaLink: notionPost.canvaLink,
    notionPageUrl: notionPost.notionPageUrl,
    gridOrder: notionPost.gridOrder,
  };
}

/**
 * Convenience helper for mapping a full list of Notion posts at once,
 * e.g. the result of querying a Notion database.
 */
export function mapNotionPostsToPosts(notionPosts: NotionPost[]): Post[] {
  return notionPosts.map(mapNotionPostToPost);
}
