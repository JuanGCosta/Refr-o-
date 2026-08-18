import React from "react";
import { motion } from "framer-motion";
import { Flame, Sparkles, Guitar, Wheat, Mic2, Zap, Music, Headphones, Shuffle, LucideIcon, Check } from "lucide-react";
import { GenreChoice, GENRE_CHOICE_LABELS } from "@shared/types";

const ICONS: Record<GenreChoice, LucideIcon> = {
  funk: Flame, pop: Sparkles, sertanejo: Guitar, modao: Wheat, rap: Mic2,
  trap: Zap, mpb: Music, acustico: Headphones, misturadao: Shuffle,
};
const SUB: Record<GenreChoice, string> = {
  funk: "Baile, mandelão e clássicos",
  pop: "Hits brasileiros de várias épocas",
  sertanejo: "Universitário, romântico e atual",
  modao: "Raiz, viola e clássicos",
  rap: "Rap nacional de várias gerações",
  trap: "Matuê, Teto, WIU, Veigh e mais",
  mpb: "Clássicos e nova MPB",
  acustico: "Poesia, 1Kilo, Oriente e vibe acústica",
  misturadao: "Todas as categorias no mesmo jogo",
};

export function GenreCard({ genre, votes, selected, onSelect }: { genre: GenreChoice; votes: number; selected: boolean; onSelect: () => void; }) {
  const Icon = ICONS[genre];
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: .975 }}
      whileHover={{ y: -2 }}
      className={`genre-card genre-${genre} ${selected ? "is-selected" : ""}`}
    >
      <span className="genre-card-icon"><Icon size={21} strokeWidth={2.1} /></span>
      <span className="min-w-0 text-left">
        <strong>{GENRE_CHOICE_LABELS[genre]}</strong>
        <small>{SUB[genre]}</small>
      </span>
      <span className="genre-votes">{selected ? <Check size={14} strokeWidth={3}/> : votes}</span>
    </motion.button>
  );
}
