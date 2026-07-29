import { PostType, PostStatus } from "../data/post";

/** Human-readable label for each content type. Used in the grid card and the side panel. */
export const POST_TYPE_LABEL: Record<PostType, string> = {
  image: "Image",
  reel: "Reel",
  carousel: "Carousel",
};

/** Small status dot color used in the grid card's hover badge. */
export const POST_STATUS_DOT_COLOR: Record<PostStatus, string> = {
  Draft: "bg-neutral-400",
  Ready: "bg-blue-500",
  Scheduled: "bg-amber-500",
  Published: "bg-emerald-500",
};

/** Tinted pill styles used for the status badge in the side panel header. */
export const POST_STATUS_BADGE_STYLES: Record<PostStatus, string> = {
  Draft: "bg-neutral-100 text-neutral-600",
  Ready: "bg-blue-50 text-blue-600",
  Scheduled: "bg-amber-50 text-amber-600",
  Published: "bg-emerald-50 text-emerald-600",
};
