import type { CSSProperties } from "react";
import { widgetConfig } from "../config/widgetConfig";

/**
 * Grid-level loading state shown while useFeed() is fetching (e.g.
 * the initial Notion request). Reuses the exact same skeleton visual
 * (rounded tile, soft ring, pulse) that PostCard already shows for an
 * individual image while it loads — just applied to a full grid of
 * placeholders before any post data exists yet.
 *
 * The grid style and placeholder count only depend on widgetConfig,
 * which is a frozen, module-level constant — so both are computed
 * once here instead of being recreated on every render.
 */
const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: `repeat(${widgetConfig.gridColumns}, minmax(0, 1fr))`,
  gap: `${widgetConfig.cardGap}px`,
};

const PLACEHOLDER_COUNT = widgetConfig.gridColumns * 3;

export default function FeedSkeletonGrid() {
  return (
    <div style={gridStyle}>
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
        <div
          key={index}
          className="aspect-square animate-pulse bg-neutral-200/70 ring-1 ring-[#F2F2F2]"
          style={{ borderRadius: `${widgetConfig.cardRadius}px` }}
        />
      ))}
    </div>
  );
}
