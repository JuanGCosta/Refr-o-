import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Volume2, Headphones, Radio, Trophy } from "lucide-react";
import { ROUND_DURATION_MS } from "@shared/types";
import { AudioVisualizer } from "../components/AudioVisualizer";
import { AnswerCard, AnswerVisualState } from "../components/AnswerCard";
import { ProgressRing } from "../components/ProgressRing";
import { AvatarGraphic } from "../game/avatars";
import { useServerCountdown } from "../hooks/useCountdown";
import { GameRoomApi } from "../hooks/useGameRoom";
import { useSound } from "../hooks/useSound";
import type { RoundMusicApi } from "../hooks/useRoundMusic";

export function RoundPage({ game, sound, music }: { game: GameRoomApi; sound: ReturnType<typeof useSound>; music: RoundMusicApi }) {
  const { state } = game;
  const round = state.roundData;
  const [selected, setSelected] = useState<number | null>(null);

  const { remainingRatio, remainingSeconds } = useServerCountdown(round?.serverStartTime ?? null, round?.durationMs ?? ROUND_DURATION_MS);

  useEffect(() => {
    setSelected(null);
    sound.play("roundStart");
  }, [round?.roundNumber]);

  useEffect(() => {
    if (state.myAnswer) sound.play(state.myAnswer.correct ? "correct" : "wrong");
  }, [state.myAnswer]);

  const visualizerSize = useMemo(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 142 : 190), []);
  if (!round) return null;

  const locked = state.myAnswer !== null || remainingSeconds <= 0;
  const handleAnswer = async (index: number) => {
    if (locked) return;
    setSelected(index);
    await game.submitAnswer(index);
  };

  const me = state.players.find((p) => p.id === state.youId);
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const myRank = ranked.findIndex((p) => p.id === state.youId) + 1;

  return (
    <div className="round-screen screen-pad min-h-screen">
      <div className="round-shell">
        <div className="round-hud game-panel">
          <div className="round-hud-left"><span className="round-index">{round.roundNumber}</span><div><small>Rodada</small><strong>{round.roundNumber} de {round.totalRounds}</strong></div></div>
          <div className="round-hud-score"><Trophy size={15}/><span>{myRank}º lugar</span><b>{me?.score ?? 0} pts</b></div>
          <ProgressRing ratio={remainingRatio} seconds={remainingSeconds} size={48} />
        </div>

        <section className="round-listening">
          <div className="listening-pill"><Radio size={14} className="animate-pulse"/> Tocando agora</div>
          <AudioVisualizer size={visualizerSize} />
          <div className="round-state-message">
            {music.state === "loading" && <span><Loader2 size={14} className="animate-spin"/> Carregando trecho...</span>}
            {music.state === "blocked" && <button type="button" onClick={music.activate}><Volume2 size={17}/> Ativar música</button>}
            {music.state === "error" && <button type="button" onClick={music.retry}><RefreshCw size={16}/> Tentar carregar novamente</button>}
            {music.state === "playing" && <span><Headphones size={14}/> Escuta bem e escolhe rápido.</span>}
          </div>
          <div className="answered-row" aria-label="Jogadores que já responderam">
            {state.players.map((p) => (
              <div key={p.id} className={`answered-avatar ${state.answeredPlayerIds.includes(p.id) ? "has-answered" : ""}`} title={`${p.name}${state.answeredPlayerIds.includes(p.id) ? " respondeu" : ""}`}>
                <AvatarGraphic id={p.avatarId} className="w-full h-full" />
              </div>
            ))}
          </div>
        </section>

        <motion.div layout className="answer-grid">
          {round.options.map((opt) => {
            let visual: AnswerVisualState = "idle";
            if (selected !== null) {
              if (opt.index === selected) visual = state.myAnswer ? (state.myAnswer.correct ? "correct" : "wrong") : "selected";
              else visual = "dim";
            } else if (locked) visual = "disabled";
            return <AnswerCard key={opt.index} index={opt.index} label={opt.label} state={visual} onClick={() => handleAnswer(opt.index)} />;
          })}
        </motion.div>
      </div>
    </div>
  );
}
