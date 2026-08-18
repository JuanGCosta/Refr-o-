import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Music2, UserRound, Play, CheckCircle2, Search } from "lucide-react";
import { ARTIST_CHOICES, ARTIST_META, ArtistChoice, GENRE_LABELS, GENRE_VOTE_CHOICES, Genre } from "@shared/types";
import { GenreCard } from "../components/GenreCard";
import { Button } from "../components/Button";
import { GameRoomApi } from "../hooks/useGameRoom";

const ARTIST_GROUP_ORDER: Genre[] = ["sertanejo", "modao", "trap", "funk", "pop_internacional", "rap", "samba", "reggae", "pop", "mpb", "acustico"];

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function GenreVotingPage({ game }: { game: GameRoomApi }) {
  const { state } = game;
  const selectedArtist = ARTIST_CHOICES.includes(state.myVote as ArtistChoice);
  const [tab, setTab] = useState<"generos" | "artistas">(selectedArtist ? "artistas" : "generos");
  const [artistQuery, setArtistQuery] = useState("");

  const me = state.players.find((p) => p.id === state.youId);
  const isHost = !!me?.isHost;
  const connectedCount = state.players.filter((p) => p.connected).length;
  const totalVotes = Object.values(state.genreVotes).reduce((sum, n) => sum + (n ?? 0), 0);
  const allVoted = connectedCount > 0 && totalVotes >= connectedCount;

  const artistGroups = useMemo(() => {
    const query = normalizeSearch(artistQuery);
    return ARTIST_GROUP_ORDER
      .map((genre) => ({
        genre,
        choices: ARTIST_CHOICES.filter((choice) => {
          if (ARTIST_META[choice].genre !== genre) return false;
          if (!query) return true;
          return normalizeSearch(ARTIST_META[choice].label).includes(query);
        }),
      }))
      .filter((group) => group.choices.length > 0);
  }, [artistQuery]);

  return (
    <div className="voting-screen screen-pad min-h-screen">
      <div className="page-container voting-wrap">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="voting-head">
          <span className="section-icon large">{tab === "generos" ? <Music2 size={23}/> : <UserRound size={23}/>}</span>
          <p className="eyebrow">Escolha a trilha da partida</p>
          <h1>{tab === "generos" ? "Qual estilo vai tocar?" : "Escolha por artista"}</h1>
          <p>
            {tab === "generos"
              ? "Escolha um gênero ou vá de Misturadão para combinar estilos na mesma partida."
              : "Escolha um artista e jogue uma partida focada nas músicas dele."}
          </p>
        </motion.div>

        <div className="vote-tabs" role="tablist" aria-label="Tipo de votação">
          <button type="button" className={tab === "generos" ? "is-active" : ""} onClick={() => setTab("generos")}>
            <Music2 size={15}/> Gêneros
          </button>
          <button type="button" className={tab === "artistas" ? "is-active" : ""} onClick={() => setTab("artistas")}>
            <UserRound size={15}/> Artistas
          </button>
        </div>

        {tab === "artistas" && (
          <label className="artist-search">
            <Search size={16}/>
            <input
              type="search"
              value={artistQuery}
              onChange={(event) => setArtistQuery(event.target.value)}
              placeholder="Buscar artista"
              autoComplete="off"
              aria-label="Buscar artista"
            />
          </label>
        )}

        {tab === "generos" ? (
          <div className="genre-grid">
            {GENRE_VOTE_CHOICES.map((choice) => (
              <GenreCard key={choice} genre={choice} votes={state.genreVotes[choice] ?? 0} selected={state.myVote === choice} onSelect={game.voteGenre} />
            ))}
          </div>
        ) : (
          <div className="artist-groups">
            {artistGroups.length === 0 && <div className="artist-empty">Nenhum artista encontrado.</div>}
            {artistGroups.map((group) => (
              <section key={group.genre} className="artist-group">
                <div className="artist-group-head">
                  <span>{GENRE_LABELS[group.genre]}</span>
                  <small>{group.choices.length} {group.choices.length === 1 ? "artista" : "artistas"}</small>
                </div>
                <div className="genre-grid artist-grid">
                  {group.choices.map((choice) => (
                    <GenreCard key={choice} genre={choice} votes={state.genreVotes[choice] ?? 0} selected={state.myVote === choice} onSelect={game.voteGenre} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="voting-footer">
          <div className={`vote-progress ${allVoted ? "is-ready" : ""}`}>
            <CheckCircle2 size={15}/>
            <span>{totalVotes}/{connectedCount} jogadores escolheram</span>
          </div>
          {isHost ? (
            <Button size="lg" onClick={game.finishVoting} disabled={!allVoted} className="voting-start-button">
              <Play size={19}/> Começar partida
            </Button>
          ) : (
            <p className="voting-note">Você pode trocar sua escolha até o host começar a partida.</p>
          )}
        </div>
      </div>
    </div>
  );
}
