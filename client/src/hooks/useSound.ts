import { useCallback, useEffect, useRef, useState } from "react";
import { loadSoundPrefs, saveSoundPrefs } from "../services/localProfile";

export type SfxName = "click" | "tick" | "countdownGo" | "correct" | "wrong" | "fastest" | "victory" | "roundStart";

function playTone(
  ctx: AudioContext,
  master: GainNode,
  {
    freq,
    duration,
    type = "sine",
    delay = 0,
    gain = 0.22,
    glideTo,
  }: { freq: number; duration: number; type?: OscillatorType; delay?: number; gain?: number; glideTo?: number }
) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  const t0 = ctx.currentTime + delay;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(env);
  env.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function synth(ctx: AudioContext, master: GainNode, name: SfxName) {
  switch (name) {
    case "click":
      playTone(ctx, master, { freq: 720, duration: 0.055, type: "square", gain: 0.10 });
      break;
    case "tick":
      playTone(ctx, master, { freq: 760, duration: 0.09, type: "triangle", gain: 0.16 });
      playTone(ctx, master, { freq: 1140, duration: 0.045, delay: 0.018, type: "sine", gain: 0.08 });
      break;
    case "countdownGo":
      playTone(ctx, master, { freq: 523.25, duration: 0.13, type: "triangle", gain: 0.18 });
      playTone(ctx, master, { freq: 783.99, duration: 0.2, delay: 0.055, type: "triangle", gain: 0.20 });
      playTone(ctx, master, { freq: 1046.5, duration: 0.24, delay: 0.11, type: "sine", gain: 0.13 });
      break;
    case "correct":
      playTone(ctx, master, { freq: 523.25, duration: 0.14, type: "triangle" });
      playTone(ctx, master, { freq: 783.99, duration: 0.22, delay: 0.09, type: "triangle" });
      break;
    case "wrong":
      playTone(ctx, master, { freq: 180, duration: 0.28, type: "sawtooth", gain: 0.13, glideTo: 90 });
      break;
    case "fastest":
      [659.25, 830.61, 987.77, 1318.51].forEach((f, i) =>
        playTone(ctx, master, { freq: f, duration: 0.16, delay: i * 0.06, type: "triangle", gain: 0.15 })
      );
      break;
    case "victory":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        playTone(ctx, master, { freq: f, duration: 0.35, delay: i * 0.1, type: "triangle", gain: 0.17 })
      );
      break;
    case "roundStart":
      playTone(ctx, master, { freq: 240, duration: 0.24, type: "sine", gain: 0.12, glideTo: 620 });
      break;
  }
}

export function useSound() {
  const prefsRef = useRef(loadSoundPrefs());
  const [enabled, setEnabled] = useState(prefsRef.current.enabled);
  const [volume, setVolume] = useState(prefsRef.current.volume);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  const ensureContext = useCallback(() => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = enabled ? volume : 0;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return { ctx: ctxRef.current, master: masterRef.current! };
  }, [enabled, volume]);

  // Unlock Web Audio on the first real user interaction, especially important on iOS/Safari.
  useEffect(() => {
    const unlock = () => {
      try { ensureContext(); } catch {}
    };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [ensureContext]);

  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = enabled ? volume : 0;
  }, [enabled, volume]);

  useEffect(() => { saveSoundPrefs({ enabled, volume }); }, [enabled, volume]);

  const play = useCallback((name: SfxName) => {
    if (!enabled) return;
    try {
      const { ctx, master } = ensureContext();
      synth(ctx, master, name);
    } catch {}
  }, [enabled, ensureContext]);

  return { play, enabled, setEnabled, volume, setVolume };
}
