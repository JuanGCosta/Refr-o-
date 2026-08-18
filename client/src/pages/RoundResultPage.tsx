import { useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, X, Music2, Trophy } from "lucide-react";
import { AudioVisualizer } from "../components/AudioVisualizer";
import { AvatarGraphic } from "../game/avatars";
import { GENRE_LABELS } from "@shared/types";
import { formatMs } from "../utils/format";
import { GameRoomApi } from "../hooks/useGameRoom";
import { useSound } from "../hooks/useSound";

export function RoundResultPage({ game, sound }: { game: GameRoomApi; sound: ReturnType<typeof useSound> }) {
  const { state } = game;
  const result = state.roundResult;
  useEffect(() => {
    if (result?.results.some((entry) => entry.wasFastest)) sound.play("fastest");
  }, [result?.roundNumber]);
  if (!result) return null;

  const sortedResults = [...result.results].sort((a, b) => b.pointsEarned - a.pointsEarned);
  const playerById = new Map(state.players.map((p) => [p.id, p]));
  const visualizerSize = typeof window !== "undefined" && window.innerWidth < 640 ? 132 : 178;

  return (
    <div className="result-screen screen-pad min-h-screen">
      <div className="result-shell">
        <section className="result-song">
          <div className="result-kicker"><Music2 size={15}/> Resposta da rodada {result.roundNumber}</div>
          <AudioVisualizer coverUrl={result.song.coverUrl} revealed size={visualizerSize} />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="result-song-copy">
            <h1>{result.song.title}</h1>
            <p>{result.song.artist}</p>
            <div className="song-meta"><span>{GENRE_LABELS[result.song.genre]}</span>{result.song.year > 0 && <span>{result.song.year}</span>}</div>
          </motion.div>
        </section>

        <section className="result-ranking game-panel">
          <div className="result-ranking-head"><div><p className="eyebrow">Resultado</p><h2>Quem mandou bem?</h2></div><Trophy size={20}/></div>
          <div className="result-list">
            {sortedResults.map((r, i) => {
              const player = playerById.get(r.playerId);
              if (!player) return null;
              return (
                <motion.div key={r.playerId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className={`result-player ${r.correct ? "is-correct" : "is-wrong"}`}>
                  <span className="result-position">{i + 1}</span>
                  <AvatarGraphic id={player.avatarId} className="result-avatar" />
                  <div className="result-player-copy"><strong>{player.name}</strong><small>{r.answered && r.timeMs !== null ? formatMs(r.timeMs) : "Errou"}</small></div>
                  {r.wasFastest && <span className="fastest-badge"><Zap size={12} fill="currentColor"/> Mais rápido</span>}
                  <span className={`result-points ${r.correct ? "" : "is-zero"}`}>{r.correct ? `+${r.pointsEarned}` : <X size={17}/>}</span>
                </motion.div>
              );
            })}
          </div>
          <p className="result-next">A música continua tocando enquanto o próximo placar é preparado.</p>
        </section>
      </div>
    </div>
  );
}
