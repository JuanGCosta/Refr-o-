import { useEffect, useState } from "react";
import { resolveServerUrl } from "../services/serverUrl";

type HealthState = "checking" | "warming" | "ready" | "offline";

interface HealthPayload {
  ok?: boolean;
  ready?: boolean;
  warmingUp?: boolean;
}

export function useBackendHealth() {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`${resolveServerUrl()}/health`, {
          cache: "no-store",
          signal: controller.signal,
        });
        window.clearTimeout(timeout);
        if (!response.ok) throw new Error("health unavailable");
        const data = (await response.json()) as HealthPayload;
        if (!cancelled) setState(data.ready ? "ready" : (data as HealthPayload & { error?: string | null }).error ? "offline" : "warming");
      } catch {
        if (!cancelled) setState("offline");
      }
      if (!cancelled) timer = window.setTimeout(check, 2500);
    };

    void check();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return state;
}
