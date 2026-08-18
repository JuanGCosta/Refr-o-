import { CatalogSong, DifficultyMode, ResolvedSong } from "@shared/types";
import { secureShuffle } from "../utils/random";

function songLabel(song: CatalogSong): string { return `${song.title} — ${song.artist}`; }

function normalSimilarity(target: CatalogSong, candidate: CatalogSong): number {
  let score = 0;
  score += Math.abs(target.year - candidate.year) <= 8 ? 4 : 0;
  score += Math.abs(target.popularity - candidate.popularity) <= 1 ? 3 : 0;
  score += target.difficulty === candidate.difficulty ? 2 : 0;
  score += candidate.artist === target.artist ? -4 : 0;
  return score;
}

function distractorScore(target: CatalogSong, candidate: CatalogSong, mode: DifficultyMode): number {
  const normal = normalSimilarity(target, candidate);
  if (mode === "facil") {
    return (candidate.artist !== target.artist ? 5 : -8) + Math.min(Math.abs(target.year - candidate.year) / 8, 4) - normal * .25;
  }
  if (mode === "dificil") {
    return normal + (candidate.artist === target.artist ? 5 : 0);
  }
  if (mode === "misturado") {
    return target.difficulty >= 3 ? normal + (candidate.artist === target.artist ? 3 : 0) : normal * .7;
  }
  return normal;
}

export interface BuiltOptions { options: { label: string; isCorrect: boolean }[]; correctIndex: number; }

/**
 * Distratores usam o catálogo bruto do MESMO gênero, não apenas faixas com preview.
 * Assim sempre podemos mostrar 4 alternativas coerentes mesmo quando a API de áudio
 * não disponibiliza preview para todas as músicas daquele estilo.
 */
export function buildAlternatives(target: ResolvedSong, genrePool: CatalogSong[], mode: DifficultyMode): BuiltOptions {
  const candidates = genrePool.filter((s) => s.id !== target.id);
  const grouped = new Map<number, CatalogSong[]>();
  for (const candidate of candidates) {
    const score = Math.round(distractorScore(target, candidate, mode) * 10);
    const group = grouped.get(score) ?? [];
    group.push(candidate);
    grouped.set(score, group);
  }

  const ranked: CatalogSong[] = [];
  [...grouped.keys()].sort((a, b) => b - a).forEach((score) => {
    ranked.push(...secureShuffle(grouped.get(score) ?? []));
  });

  const seen = new Set([songLabel(target)]);
  const distractors: CatalogSong[] = [];
  for (const candidate of ranked) {
    if (distractors.length >= 3) break;
    const label = songLabel(candidate);
    if (seen.has(label)) continue;
    seen.add(label);
    distractors.push(candidate);
  }

  const pool = secureShuffle([target, ...distractors].map((s) => ({
    label: songLabel(s),
    isCorrect: s.id === target.id,
  })));
  return { options: pool, correctIndex: pool.findIndex((o) => o.isCorrect) };
}
