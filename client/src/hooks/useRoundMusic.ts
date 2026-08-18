import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomStatus, RoundStartPayload } from "@shared/types";
import { resolveServerAssetUrl } from "../services/serverUrl";

export type RoundMusicState = "idle" | "loading" | "playing" | "blocked" | "error";

function waitForReady(audio: HTMLAudioElement, timeoutMs = 8_000): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo excedido ao carregar o áudio."));
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Falha ao carregar o áudio."));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      audio.removeEventListener("loadeddata", onReady);
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onError);
    };
    audio.addEventListener("loadeddata", onReady, { once: true });
    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
  });
}

/**
 * Reprodutor persistente da rodada.
 *
 * Ele vive no App, não dentro da tela PLAYING. Assim, quando a UI troca para
 * ROUND_RESULT, o mesmo elemento de áudio continua tocando sem reiniciar ou
 * cortar a música. O áudio só é parado quando o placar/contagem/próxima fase
 * começa, ou quando o usuário sai da sala.
 */
export function useRoundMusic(
  round: RoundStartPayload | null,
  status: RoomStatus | null,
  enabled: boolean,
  volume: number
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicState, setMusicState] = useState<RoundMusicState>("idle");
  const loadedRoundKeyRef = useRef<string | null>(null);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.setAttribute("playsinline", "true");
      audio.addEventListener("playing", () => setMusicState("playing"));
      audio.addEventListener("waiting", () => setMusicState("loading"));
      audio.addEventListener("stalled", () => setMusicState("loading"));
      audio.addEventListener("error", () => setMusicState("error"));
      audio.addEventListener("ended", () => setMusicState("idle"));
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const startMusic = useCallback(
    async (forceRefresh = false) => {
      if (!round?.previewUrl) return;
      const audio = getAudio();
      const baseUrl = resolveServerAssetUrl(round.previewUrl);
      const separator = baseUrl.includes("?") ? "&" : "?";
      const roundUrl = `${baseUrl}${separator}round=${round.roundNumber}&started=${round.serverStartTime}`;
      const maxAttempts = 2;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        setMusicState("loading");
        const mustRefresh = forceRefresh || attempt > 0;
        const source = mustRefresh ? `${roundUrl}&retry=${Date.now()}-${attempt}` : roundUrl;

        try {
          const absoluteSource = new URL(source, window.location.href).href;
          if (audio.src !== absoluteSource || mustRefresh) {
            audio.src = source;
            audio.load();
          }

          await waitForReady(audio);

          // Align playback with the official server clock. Reconnecting players
          // join roughly at the same point instead of hearing the preview from 0s.
          const elapsedSeconds = Math.max(0, (Date.now() - round.serverStartTime) / 1000);
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = Math.min(elapsedSeconds, Math.max(0, audio.duration - 0.25));
          } else if (elapsedSeconds > 0) {
            try {
              audio.currentTime = elapsedSeconds;
            } catch {
              // Some browsers only allow seeking after more audio data arrives.
            }
          }

          await audio.play();
          setMusicState("playing");
          return;
        } catch (error) {
          const name = error instanceof DOMException ? error.name : "";
          if (name === "NotAllowedError") {
            setMusicState("blocked");
            return;
          }

          if (attempt + 1 < maxAttempts) {
            await new Promise((resolve) => window.setTimeout(resolve, 450));
            continue;
          }
          setMusicState("error");
        }
      }
    },
    [getAudio, round]
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // ignore
    }
    setMusicState("idle");
  }, []);

  useEffect(() => {
    const audio = getAudio();
    audio.muted = !enabled;
    audio.volume = Math.max(0, Math.min(1, volume));
  }, [enabled, getAudio, volume]);

  useEffect(() => {
    if (!round) return;
    const key = `${round.roundNumber}:${round.previewUrl}:${round.serverStartTime}`;
    if (loadedRoundKeyRef.current === key) return;
    loadedRoundKeyRef.current = key;
    void startMusic(false);
  }, [round, startMusic]);

  useEffect(() => {
    // PLAYING -> ROUND_RESULT deve manter exatamente o mesmo áudio.
    if (status === "PLAYING" || status === "ROUND_RESULT") return;
    if (status === "SCOREBOARD" || status === "COUNTDOWN" || status === "FINISHED" || status === "LOBBY" || status === "GENRE_VOTING" || status === null) {
      stop();
    }
  }, [status, stop]);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
  }, []);

  return {
    state: musicState,
    activate: () => startMusic(false),
    retry: () => startMusic(true),
    stop,
  };
}

export type RoundMusicApi = ReturnType<typeof useRoundMusic>;
