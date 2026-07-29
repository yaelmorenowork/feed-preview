import type { PageObjectResponse } from "@notionhq/client";
import type { UpdatePageParameters } from "@notionhq/client";
import { createNotionClient } from "./client";
import { withNotionErrorHandling } from "./request";
import { parseNotionPage } from "./pageParser";
import { mapNotionPostsToPosts } from "./mapper";
import { resolvePropertyName } from "./schema";
import type { NotionSession } from "../session";
import { EditableFields, Post } from "../../data/post";
import { NotionIntegrationError } from "../../lib/errors";

type NotionProperties = NonNullable<UpdatePageParameters["properties"]>;

function isFullPage(
  result: PageObjectResponse | { object: string }
): result is PageObjectResponse {
  return "properties" in result;
}

function requireDatabase(session: NotionSession): string {
  if (!session.databaseId) {
    throw new NotionIntegrationError(
      "No database is selected yet. Finish setup to choose one."
    );
  }
  return session.databaseId;
}

/**
 * Fetches every post from the connected workspace's selected
 * database, following pagination until all pages have been
 * retrieved, then maps them into the app's Post model.
 */
export async function fetchPosts(session: NotionSession): Promise<Post[]> {
  const dataSourceId = requireDatabase(session);
  const client = createNotionClient(session.accessToken);

  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await withNotionErrorHandling(
      () =>
        client.dataSources.query({
          data_source_id: dataSourceId,
          start_cursor: cursor,
        }),
      "We couldn't load posts from your Notion database. Please try again."
    );

    pages.push(...response.results.filter(isFullPage));
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  const notionPosts = pages.map((page) => parseNotionPage(page, session.propertyMap));
  return mapNotionPostsToPosts(notionPosts);
}

/**
 * Writes each post's new gridOrder back to its Notion page. Callers
 * should pass only the posts whose order actually changed — Notion
 * enforces API rate limits, so writing every row on every reorder
 * doesn't scale as a board grows.
 */
export async function updatePostOrder(
  session: NotionSession,
  changedPosts: Post[]
): Promise<void> {
  if (changedPosts.length === 0) return;

  const client = createNotionClient(session.accessToken);
  const gridOrderProperty = resolvePropertyName("Grid Order", session.propertyMap);

  await withNotionErrorHandling(
    () =>
      Promise.all(
        changedPosts.map((post) =>
          client.pages.update({
            page_id: String(post.id),
            properties: {
              [gridOrderProperty]: { number: post.gridOrder ?? 0 },
            } as NotionProperties,
          })
        )
      ),
    "We couldn't save the new post order to Notion. Please try again."
  );
}

/**
 * Builds the Notion property payload for a single changed field,
 * resolved through the workspace's propertyMap. The exhaustiveness
 * check means adding a new EditableFields key without a case here
 * fails to compile.
 */
function buildPropertyPatch<K extends keyof EditableFields>(
  field: K,
  value: EditableFields[K],
  propertyMap: Record<string, string> | undefined
): NotionProperties {
  const name = (defaultName: string) => resolvePropertyName(defaultName, propertyMap);

  switch (field) {
    case "title":
      return { [name("Title")]: { title: [{ text: { content: value as string } }] } } as NotionProperties;
    case "caption":
      return { [name("Caption")]: { rich_text: [{ text: { content: value as string } }] } } as NotionProperties;
    case "scheduledDate":
      return {
        [name("Publish Date")]: { date: value ? { start: value as string } : null },
      } as NotionProperties;
    case "status":
      return { [name("Status")]: { select: { name: value as string } } } as NotionProperties;
    case "hashtags":
      return {
        [name("Hashtags")]: {
          multi_select: (value as string[]).map((tag) => ({ name: tag })),
        },
      } as NotionProperties;
    case "canvaLink":
      return { [name("Canva Link")]: { url: (value as string) || null } } as NotionProperties;
    case "gridOrder":
      return { [name("Grid Order")]: { number: (value as number) ?? 0 } } as NotionProperties;
    default: {
      const exhaustiveCheck: never = field;
      throw new Error(`Unhandled editable field: ${String(exhaustiveCheck)}`);
    }
  }
}

/**
 * Writes only the changed fields of a single post back to its Notion
 * page. This is the server-side counterpart of the widget's autosave
 * — feedService.updatePost() calls the /api/notion/posts/[id] route,
 * which calls this.
 */
export async function updatePostFields(
  session: NotionSession,
  pageId: Post["id"],
  changes: Partial<EditableFields>
): Promise<void> {
  const fields = Object.keys(changes) as (keyof EditableFields)[];
  if (fields.length === 0) return;

  const properties = fields.reduce<NotionProperties>((acc, field) => {
    return { ...acc, ...buildPropertyPatch(field, changes[field]!, session.propertyMap) };
  }, {} as NotionProperties);

  const client = createNotionClient(session.accessToken);

  await withNotionErrorHandling(
    () => client.pages.update({ page_id: String(pageId), properties }),
    "We couldn't save your changes to Notion. Please try again."
  );
}
