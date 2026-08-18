import { DifficultyMode, Genre, GenreChoice, GENRES, ResolvedSong } from "@shared/types";
import { secureShuffle } from "../utils/random";

/**
 * Votos normais entram somente no próprio gênero. O Misturadão distribui
 * aquele voto igualmente por todos os gêneros reais, sem reclassificar faixas.
 */
export function computeGenreWeights(votes: Partial<Record<GenreChoice, number>>): Record<Genre, number> {
  const weights = Object.fromEntries(GENRES.map((g) => [g, 0])) as Record<Genre, number>;
  const directTotal = GENRES.reduce((sum, genre) => sum + Math.max(0, votes[genre] ?? 0), 0);
  const mixedVotes = Math.max(0, votes.misturadao ?? 0);
  const totalVotes = directTotal + mixedVotes;

  if (totalVotes === 0) {
    GENRES.forEach((g) => (weights[g] = 1 / GENRES.length));
    return weights;
  }

  const mixedShare = mixedVotes / GENRES.length;
  GENRES.forEach((genre) => {
    weights[genre] = (Math.max(0, votes[genre] ?? 0) + mixedShare) / totalVotes;
  });
  return weights;
}

function weightsToCounts(weights: Record<Genre, number>, roundCount: number): Record<Genre, number> {
  const raw = GENRES.map((g) => ({ genre: g, exact: weights[g] * roundCount }));
  const counts = Object.fromEntries(GENRES.map((g) => [g, 0])) as Record<Genre, number>;
  let assigned = 0;
  raw.forEach(({ genre, exact }) => {
    const n = Math.floor(exact);
    counts[genre] = n;
    assigned += n;
  });
  let remainder = roundCount - assigned;
  const byFraction = secureShuffle(raw).sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (let i = 0; remainder > 0; i++, remainder--) {
    counts[byFraction[i % byFraction.length].genre] += 1;
  }
  return counts;
}

function preferredPool(pool: ResolvedSong[], mode: DifficultyMode): ResolvedSong[] {
  if (mode === "facil") {
    const preferred = pool.filter((s) => s.difficulty <= 2 && s.popularity >= 4);
    if (preferred.length >= 4) return preferred;
    const broad = pool.filter((s) => s.difficulty <= 2);
    return broad.length ? broad : pool;
  }
  if (mode === "dificil") {
    const preferred = pool.filter((s) => s.difficulty >= 3 || (s.difficulty === 2 && s.popularity <= 4));
    return preferred.length >= 4 ? preferred : pool;
  }
  if (mode === "equilibrado") {
    const accessible = pool.filter((s) => s.difficulty <= 3);
    return accessible.length >= 4 ? accessible : pool;
  }
  return pool;
}

export interface BuildQueueOptions {
  catalogByGenre: Record<Genre, ResolvedSong[]>;
  genreVotes: Partial<Record<GenreChoice, number>>;
  roundCount: number;
  difficultyMode: DifficultyMode;
  recentlyPlayedIds?: Set<string>;
}

export function buildSongQueue(options: BuildQueueOptions): ResolvedSong[] {
  const { catalogByGenre, genreVotes, roundCount, difficultyMode, recentlyPlayedIds } = options;
  const weights = computeGenreWeights(genreVotes);
  const counts = weightsToCounts(weights, roundCount);
  const usedIds = new Set<string>();
  const queue: ResolvedSong[] = [];
  const effectiveGenres = GENRES.filter((g) => weights[g] > 0 && (catalogByGenre[g] ?? []).length > 0);

  const appendUnique = (genre: Genre, need: number): number => {
    if (need <= 0) return 0;
    const fullGenrePool = catalogByGenre[genre] ?? [];
    const preferred = preferredPool(fullGenrePool, difficultyMode);

    // 1) prioriza a dificuldade escolhida + faixas ainda não vistas
    // 2) se faltar, amplia para TODO o gênero antes de repetir qualquer música
    const stages = [
      preferred.filter((s) => !usedIds.has(s.id) && !recentlyPlayedIds?.has(s.id)),
      preferred.filter((s) => !usedIds.has(s.id)),
      fullGenrePool.filter((s) => !usedIds.has(s.id) && !recentlyPlayedIds?.has(s.id)),
      fullGenrePool.filter((s) => !usedIds.has(s.id)),
    ];

    let left = need;
    for (const stage of stages) {
      if (left <= 0) break;
      const available = stage.filter((s) => !usedIds.has(s.id));
      for (const song of secureShuffle(available).slice(0, left)) {
        usedIds.add(song.id);
        queue.push(song);
        left--;
      }
    }
    return need - left;
  };

  const appendRepeats = (genre: Genre, need: number): number => {
    const pool = catalogByGenre[genre] ?? [];
    if (need <= 0 || pool.length === 0) return 0;
    let left = need;
    let cycle = secureShuffle(pool);
    while (left > 0) {
      if (!cycle.length) cycle = secureShuffle(pool);
      const song = cycle.shift();
      if (!song) break;
      queue.push(song);
      left--;
    }
    return need - left;
  };

  const shortage = new Map<Genre, number>();
  for (const genre of effectiveGenres) {
    const need = counts[genre];
    const got = appendUnique(genre, need);
    if (got < need) shortage.set(genre, need - got);
  }
  shortage.forEach((n, g) => appendRepeats(g, n));

  while (queue.length < roundCount && effectiveGenres.length) {
    const genre = effectiveGenres[queue.length % effectiveGenres.length];
    if (!appendRepeats(genre, 1)) break;
  }

  // A ordem final é embaralhada no servidor com RNG criptográfico.
  // Nenhuma música repete enquanto ainda houver outra faixa disponível no pool habilitado.
  let ordered = secureShuffle(queue.slice(0, roundCount));
  ordered = breakArtistClusters(ordered);
  ordered = breakSongRepeats(ordered);
  return ordered;
}

function breakArtistClusters(queue: ResolvedSong[]): ResolvedSong[] {
  const result = [...queue];
  for (let i = 1; i < result.length; i++) {
    if (result[i].artist !== result[i - 1].artist) continue;
    const swap = result.findIndex((s, idx) => idx > i && s.artist !== result[i - 1].artist);
    if (swap !== -1) [result[i], result[swap]] = [result[swap], result[i]];
  }
  return result;
}

function breakSongRepeats(queue: ResolvedSong[]): ResolvedSong[] {
  const result = [...queue];
  for (let i = 1; i < result.length; i++) {
    if (result[i].id !== result[i - 1].id) continue;
    const swap = result.findIndex((s, idx) => idx > i && s.id !== result[i - 1].id);
    if (swap !== -1) [result[i], result[swap]] = [result[swap], result[i]];
  }
  return result;
}
