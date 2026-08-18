import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { RefreshCw, Home, Award as AwardIcon, Sparkles } from "lucide-react";
import { Logo } from "../components/Logo";
import { Podium } from "../components/Podium";
import { Button } from "../components/Button";
import { AvatarGraphic } from "../game/avatars";
import { GameRoomApi } from "../hooks/useGameRoom";
import { formatMs } from "../utils/format";
import { useSound } from "../hooks/useSound";

export function FinalResultsPage({ game, sound, onExit }: { game: GameRoomApi; sound: ReturnType<typeof useSound>; onExit: () => void; }) {
  const { state } = game;
  const finished = state.finished;
  const me = state.players.find((p) => p.id === state.youId);
  const isHost = !!me?.isHost;

  useEffect(() => {
    if (!finished) return;
    sound.play("victory");
    const duration = 2200;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: ["#16c7b7", "#78c942", "#F5B93E"] });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: ["#16c7b7", "#78c942", "#F5B93E"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [!!finished]);

  if (!finished) return null;
  const statsByPlayer = new Map(finished.stats.map((s) => [s.playerId, s]));
  const myStats = me ? statsByPlayer.get(me.id) : undefined;

  return (
    <div className="final-screen screen-pad min-h-screen">
      <div className="final-shell">
        <Logo size="sm" />
        <div className="final-head"><div className="final-kicker"><Sparkles size={14}/> Partida encerrada</div><h1>Fim de partida</h1><p>Hora de descobrir quem tem o ouvido mais rápido da sala.</p></div>
        <div className="podium-card"><Podium ranking={finished.ranking} /></div>

        {finished.awards.length > 0 && (
          <section className="final-section">
            <h2><AwardIcon size={18}/> Destaques da partida</h2>
            <div className="awards-grid">
              {finished.awards.map((award) => (
                <motion.div key={award.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="award-card">
                  <AvatarGraphic id={award.avatarId} className="award-avatar" />
                  <div><strong>{award.title}</strong><span>{award.playerName}</span><small>{award.value}</small></div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {me && myStats && (
          <section className="final-section">
            <h2>Suas estatísticas</h2>
            <div className="stats-grid">
              <div><strong>{myStats.totalScore}</strong><span>Pontos</span></div>
              <div><strong>{myStats.correctAnswers}/{myStats.totalRounds}</strong><span>Acertos</span></div>
              <div><strong>{Math.round(myStats.accuracy * 100)}%</strong><span>Precisão</span></div>
              <div><strong>{myStats.fastestAnswerMs === null ? "—" : formatMs(myStats.fastestAnswerMs)}</strong><span>Mais rápida</span></div>
              <div><strong>{myStats.bestStreak}</strong><span>Melhor sequência</span></div>
            </div>
          </section>
        )}

        <div className="final-actions">
          <Button variant="ghost" onClick={onExit} className="final-home"><Home size={18}/><span>Menu</span></Button>
          {isHost ? <Button size="lg" onClick={game.playAgain} className="flex-1"><RefreshCw size={20}/> Jogar novamente</Button> : <p className="waiting-host">Aguardando o host iniciar a revanche...</p>}
        </div>
      </div>
    </div>
  );
}
