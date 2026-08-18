export function resolveServerUrl(): string {
  const configured = import.meta.env.VITE_SERVER_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  // Development uses the dedicated API port, including when accessed by phone on LAN.
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:4010`;
  }

  // Production default: frontend and Socket.IO are served by the same Render service.
  return window.location.origin;
}

export function resolveServerAssetUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${resolveServerUrl()}${path}`;
}
