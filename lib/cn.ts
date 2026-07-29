type ClassValue = string | false | null | undefined;

/**
 * Minimal classnames combinator — joins truthy class strings.
 * Kept dependency-free rather than pulling in clsx for a handful of
 * conditional-class call sites across the widget.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
