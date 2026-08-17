/**
 * Parse a comma-separated CLI option value into a trimmed, non-empty list.
 * Returns undefined when there's nothing usable, so callers can treat it as "not provided".
 */
export function parseCsvOption(input?: string): string[] | undefined {
  if (!input) {
    return undefined;
  }
  const values = input
    .split(',')
    .map((item: string) => item.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}
