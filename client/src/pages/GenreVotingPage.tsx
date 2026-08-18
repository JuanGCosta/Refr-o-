import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Music2, UserRound, Vote } from "lucide-react";
import { ARTIST_CHOICES, ArtistChoice, GENRE_VOTE_CHOICES } from "@shared/types";
import { GenreCard } from "../components/GenreCard";
import { GameRoomApi } from "../hooks/useGameRoom";

export function GenreVotingPage({ game }: { game: GameRoomApi }) {
  const { state } = game;
  const selectedArtist = ARTIST_CHOICES.includes(state.myVote as ArtistChoice);
  const [tab, setTab] = useState<"generos" | "artistas">(selectedArtist ? "artistas" : "generos");
  const [secondsLeft, setSecondsLeft] = useState(12);

  useEffect(() => {
    if (!state.votingDeadline) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((state.votingDeadline! - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state.votingDeadline]);

  const choices = useMemo(() => tab === "generos" ? GENRE_VOTE_CHOICES : ARTIST_CHOICES, [tab]);

  return (
    <div className="voting-screen screen-pad min-h-screen">
      <div className="page-container voting-wrap">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="voting-head">
          <span className="section-icon large">{tab === "generos" ? <Music2 size={23}/> : <UserRound size={23}/>}</span>
          <p className="eyebrow">Escolha a trilha da partida</p>
          <h1>{tab === "generos" ? "Qual estilo vai tocar?" : "Modo Artista"}</h1>
          <p>
            {tab === "generos"
              ? "Escolha um gênero. Pop Internacional agora entra como categoria própria e o Misturadão mistura todas."
              : "Escolha um artista e as rodadas destinadas ao seu voto terão somente músicas daquele artista."}
          </p>
          <div className="vote-timer"><Vote size={14}/><span>{secondsLeft}</span> segundos para votar</div>
        </motion.div>

        <div className="vote-tabs" role="tablist" aria-label="Tipo de votação">
          <button type="button" className={tab === "generos" ? "is-active" : ""} onClick={() => setTab("generos")}>
            <Music2 size={15}/> Gêneros
          </button>
          <button type="button" className={tab === "artistas" ? "is-active" : ""} onClick={() => setTab("artistas")}>
            <UserRound size={15}/> Artistas
          </button>
        </div>

        <div className="genre-grid">
          {choices.map((choice) => (
            <GenreCard
              key={choice}
              genre={choice}
              votes={state.genreVotes[choice] ?? 0}
              selected={state.myVote === choice}
              onSelect={() => game.voteGenre(choice)}
            />
          ))}
        </div>
        <p className="voting-note">Seu voto pode ser alterado até o tempo acabar.</p>
      </div>
    </div>
  );
}
