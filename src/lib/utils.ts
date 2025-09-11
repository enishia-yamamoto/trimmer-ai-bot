/**
 * Convert UTC date to JST (Japan Standard Time) ISO string
 * JST = UTC + 9 hours
 */
export function toJSTString(date: Date = new Date()): string {
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  return jstDate.toISOString().replace('Z', '+09:00');
}

/**
 * Get current time in JST as ISO string
 */
export function getCurrentJSTString(): string {
  return toJSTString(new Date());
}