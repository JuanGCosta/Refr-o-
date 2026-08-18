import { memo } from "react";
import {
  Flame, Sparkles, Guitar, Wheat, Mic2, Zap, Music, Headphones,
  Shuffle, LucideIcon, Check, Globe2, UserRound, Waves,
} from "lucide-react";
import {
  ARTIST_CHOICES,
  ARTIST_META,
  ArtistChoice,
  GenreChoice,
  GENRE_CHOICE_LABELS,
} from "@shared/types";

const GENRE_ICONS: Partial<Record<GenreChoice, LucideIcon>> = {
  funk: Flame,
  pop: Sparkles,
  pop_internacional: Globe2,
  sertanejo: Guitar,
  modao: Wheat,
  rap: Mic2,
  trap: Zap,
  mpb: Music,
  acustico: Headphones,
  samba: Music,
  reggae: Waves,
  misturadao: Shuffle,
};

const SUB: Partial<Record<GenreChoice, string>> = {
  funk: "Baile, mandelão e clássicos",
  pop: "Hits brasileiros de várias épocas",
  pop_internacional: "Hits mundiais, atuais e clássicos",
  sertanejo: "Universitário, romântico e atual",
  modao: "Raiz, viola e clássicos",
  rap: "Rap nacional de várias gerações",
  trap: "Matuê, Teto, WIU, Veigh e mais",
  mpb: "Clássicos e nova MPB",
  acustico: "Poesia, 1Kilo, Oriente e vibe acústica",
  samba: "Samba, pagode e clássicos brasileiros",
  reggae: "Natiruts, Cidade Negra, Armandinho e mais",
  misturadao: "Todas as categorias no mesmo jogo",
};

function isArtistChoice(choice: GenreChoice): choice is ArtistChoice {
  return ARTIST_CHOICES.includes(choice as ArtistChoice);
}

interface GenreCardProps {
  genre: GenreChoice;
  votes: number;
  selected: boolean;
  onSelect: (genre: GenreChoice) => void;
}

/**
 * Kept intentionally free of Framer Motion. This screen can render many cards
 * on mobile, and CSS transforms are much cheaper than creating an animation
 * controller for every genre/artist option.
 */
export const GenreCard = memo(function GenreCard({ genre, votes, selected, onSelect }: GenreCardProps) {
  const artistMode = isArtistChoice(genre);
  const Icon = artistMode ? UserRound : (GENRE_ICONS[genre] ?? Music);
  const subtitle = artistMode
    ? `Só músicas de ${ARTIST_META[genre].label}`
    : (SUB[genre] ?? "Categoria musical");

  return (
    <button
      type="button"
      onClick={() => onSelect(genre)}
      className={`genre-card ${artistMode ? "genre-artist" : `genre-${genre}`} ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
    >
      <span className="genre-card-icon"><Icon size={21} strokeWidth={2.1} /></span>
      <span className="min-w-0 text-left">
        <strong>{GENRE_CHOICE_LABELS[genre]}</strong>
        <small>{subtitle}</small>
      </span>
      <span className="genre-votes">{selected ? <Check size={14} strokeWidth={3}/> : votes}</span>
    </button>
  );
});
