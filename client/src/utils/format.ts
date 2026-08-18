export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

export function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}
