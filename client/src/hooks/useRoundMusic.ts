import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomStatus, RoundStartPayload } from "@shared/types";
import { resolveServerAssetUrl } from "../services/serverUrl";

export type RoundMusicState = "idle" | "loading" | "playing" | "blocked" | "error";

function waitForReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Falha ao carregar o áudio."));
    };
    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", onReady);
      audio.removeEventListener("error", onError);
    };
    audio.addEventListener("loadedmetadata", onReady, { once: true });
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
      setMusicState("loading");

      try {
        const baseUrl = resolveServerAssetUrl(round.previewUrl);
        const separator = baseUrl.includes("?") ? "&" : "?";
        const roundUrl = `${baseUrl}${separator}round=${round.roundNumber}&started=${round.serverStartTime}`;
        const source = forceRefresh ? `${roundUrl}&retry=${Date.now()}` : roundUrl;

        if (audio.src !== new URL(source, window.location.href).href || forceRefresh) {
          audio.src = source;
          audio.load();
          await waitForReady(audio);
        }

        // Aproxima o ponto de reprodução do relógio oficial do servidor.
        // Isso também ajuda quem reconecta no meio da rodada.
        const elapsedSeconds = Math.max(0, (Date.now() - round.serverStartTime) / 1000);
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          audio.currentTime = Math.min(elapsedSeconds, Math.max(0, audio.duration - 0.25));
        } else if (elapsedSeconds > 0) {
          try {
            audio.currentTime = elapsedSeconds;
          } catch {
            // Alguns navegadores só permitem seek depois de mais dados carregados.
          }
        }

        await audio.play();
        setMusicState("playing");
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setMusicState(name === "NotAllowedError" ? "blocked" : "error");
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
