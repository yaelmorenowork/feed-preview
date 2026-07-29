/**
 * Central configuration for the Feed Preview widget.
 *
 * Every component reads its display behaviour from here instead of
 * hardcoding values, so the widget can be made fully configurable later
 * (e.g. driven by user preferences or a Notion database) without
 * touching component code.
 *
 * The values below reproduce the current default design exactly.
 */

export interface WidgetConfig {
  /** Number of columns in the post grid. */
  readonly gridColumns: 2 | 3 | 4;
  /** Show the status badge (Draft/Ready/Scheduled/Published) on hover. */
  readonly showStatus: boolean;
  /** Show the scheduled/publish date on hover. */
  readonly showPublishDate: boolean;
  /** Show the "Feed Preview" header above the grid. */
  readonly showHeader: boolean;
  /** Allow clicking a post to open the side panel. */
  readonly showSidePanel: boolean;
  /** Enable the hover scale/lift/shadow microinteraction on cards. */
  readonly hoverAnimation: boolean;
  /** Corner radius of each post card, in pixels. */
  readonly cardRadius: number;
  /** Gap between post cards, in pixels. */
  readonly cardGap: number;
}

export const widgetConfig: WidgetConfig = Object.freeze({
  gridColumns: 3,
  showStatus: true,
  showPublishDate: true,
  showHeader: true,
  showSidePanel: true,
  hoverAnimation: true,
  cardRadius: 16,
  cardGap: 16,
});
