import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Headphones, Loader2, Zap } from "lucide-react";
import { useSound } from "../hooks/useSound";

export function CountdownOverlay({
  value,
  roundNumber,
  totalRounds,
  sound,
}: {
  value: number | null;
  roundNumber: number;
  totalRounds: number;
  sound: ReturnType<typeof useSound>;
}) {
  const lastPlayed = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (value === null || lastPlayed.current === value) return;
    lastPlayed.current = value;
    if (value > 0) sound.play("tick");
    else sound.play("countdownGo");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(value > 0 ? 25 : [35, 25, 55]); } catch {}
    }
  }, [value, sound]);

  return (
    <div className="countdown-screen screen-pad min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="countdown-top text-center">
        <div className="countdown-kicker"><Headphones size={15}/> Próxima música</div>
        <p className="eyebrow mt-4">Rodada {roundNumber} de {totalRounds}</p>
        <h1 className="hero-title text-2xl sm:text-3xl mt-2">Prepara o ouvido</h1>
        <p className="text-sm text-mist-400 mt-2">
          {value === null ? "Confirmando a próxima faixa antes de liberar a rodada." : "Reconheceu? Responde sem pensar duas vezes."}
        </p>
      </div>

      <div className="countdown-core">
        <span className="countdown-wave wave-one" />
        <span className="countdown-wave wave-two" />
        <span className="countdown-wave wave-three" />
        <div className="countdown-disc-ring">
          <AnimatePresence mode="wait">
            <motion.span
              key={value}
              initial={{ opacity: 0, scale: .55, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.35, y: -8 }}
              transition={{ duration: .26, ease: "easeOut" }}
              className="countdown-number"
            >
              {value === null
                ? <span className="inline-flex items-center gap-2 text-base sm:text-lg"><Loader2 size={30} className="animate-spin"/> Preparando áudio</span>
                : value === 0
                  ? <span className="inline-flex items-center gap-2"><Zap size={38} fill="currentColor"/>JÁ</span>
                  : value}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
