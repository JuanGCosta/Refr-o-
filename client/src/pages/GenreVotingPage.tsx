import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Music2, Vote } from "lucide-react";
import { GENRE_CHOICES } from "@shared/types";
import { GenreCard } from "../components/GenreCard";
import { GameRoomApi } from "../hooks/useGameRoom";

export function GenreVotingPage({ game }: { game: GameRoomApi }) {
  const { state } = game;
  const [secondsLeft, setSecondsLeft] = useState(12);
  useEffect(() => {
    if (!state.votingDeadline) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((state.votingDeadline! - Date.now()) / 1000)));
    tick(); const id = setInterval(tick, 250); return () => clearInterval(id);
  }, [state.votingDeadline]);

  return (
    <div className="voting-screen screen-pad min-h-screen">
      <div className="page-container voting-wrap">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="voting-head">
          <span className="section-icon large"><Music2 size={23}/></span>
          <p className="eyebrow">Escolha a trilha da partida</p>
          <h1>O que vai tocar?</h1>
          <p>Cada voto vale de verdade. Só entram gêneros escolhidos, a menos que alguém vote no Misturadão.</p>
          <div className="vote-timer"><Vote size={14}/><span>{secondsLeft}</span> segundos para votar</div>
        </motion.div>
        <div className="genre-grid">
          {GENRE_CHOICES.map((genre) => <GenreCard key={genre} genre={genre} votes={state.genreVotes[genre] ?? 0} selected={state.myVote === genre} onSelect={() => game.voteGenre(genre)} />)}
        </div>
        <p className="voting-note">Seu voto pode ser alterado até o tempo acabar.</p>
      </div>
    </div>
  );
}
