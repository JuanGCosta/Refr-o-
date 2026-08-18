import { useEffect, useRef, useState } from "react";

/**
 * Tracks remaining time against a server-authoritative start timestamp.
 * Ticks locally via rAF so the UI is smooth, but the numbers are always
 * derived from the server's clock, not accumulated client-side.
 */
export function useServerCountdown(serverStartTime: number | null, durationMs: number) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (serverStartTime === null) {
      setRemainingMs(durationMs);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - serverStartTime;
      const remaining = Math.max(0, durationMs - elapsed);
      setRemainingMs(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    tick();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [serverStartTime, durationMs]);

  return {
    remainingMs,
    remainingRatio: durationMs > 0 ? remainingMs / durationMs : 0,
    remainingSeconds: Math.ceil(remainingMs / 1000),
  };
}
