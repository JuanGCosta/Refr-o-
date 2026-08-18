import {
  ARTIST_CHOICES,
  ArtistChoice,
  DifficultyMode,
  DirectMusicChoice,
  DIRECT_MUSIC_CHOICES,
  Genre,
  GenreChoice,
  GENRES,
  ResolvedSong,
} from "@shared/types";
import { secureShuffle } from "../utils/random";

export interface QueuedSong extends ResolvedSong {
  selectionChoice: DirectMusicChoice;
}

/**
 * Votos de gênero entram no próprio gênero. Votos de artista entram somente
 * no catálogo daquele artista. O Misturadão distribui seu peso entre todos os
 * gêneros reais e nunca injeta automaticamente um Modo Artista.
 */
export function computeChoiceWeights(votes: Partial<Record<GenreChoice, number>>): Record<DirectMusicChoice, number> {
  const weights = Object.fromEntries(DIRECT_MUSIC_CHOICES.map((choice) => [choice, 0])) as Record<DirectMusicChoice, number>;
  const directTotal = DIRECT_MUSIC_CHOICES.reduce((sum, choice) => sum + Math.max(0, votes[choice] ?? 0), 0);
  const mixedVotes = Math.max(0, votes.misturadao ?? 0);
  const totalVotes = directTotal + mixedVotes;

  if (totalVotes === 0) {
    GENRES.forEach((genre) => (weights[genre] = 1 / GENRES.length));
    return weights;
  }

  const mixedShare = mixedVotes / GENRES.length;
  GENRES.forEach((genre) => {
    weights[genre] = (Math.max(0, votes[genre] ?? 0) + mixedShare) / totalVotes;
  });
  ARTIST_CHOICES.forEach((choice) => {
    weights[choice] = Math.max(0, votes[choice] ?? 0) / totalVotes;
  });
  return weights;
}

function weightsToCounts(weights: Record<DirectMusicChoice, number>, roundCount: number): Record<DirectMusicChoice, number> {
  const raw = DIRECT_MUSIC_CHOICES.map((choice) => ({ choice, exact: weights[choice] * roundCount }));
  const counts = Object.fromEntries(DIRECT_MUSIC_CHOICES.map((choice) => [choice, 0])) as Record<DirectMusicChoice, number>;
  let assigned = 0;
  raw.forEach(({ choice, exact }) => {
    const n = Math.floor(exact);
    counts[choice] = n;
    assigned += n;
  });
  let remainder = roundCount - assigned;
  const byFraction = secureShuffle(raw).sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (let i = 0; remainder > 0 && byFraction.length > 0; i++, remainder--) {
    counts[byFraction[i % byFraction.length].choice] += 1;
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
  catalogByArtist: Record<ArtistChoice, ResolvedSong[]>;
  genreVotes: Partial<Record<GenreChoice, number>>;
  roundCount: number;
  difficultyMode: DifficultyMode;
  recentlyPlayedIds?: Set<string>;
}

export function buildSongQueue(options: BuildQueueOptions): QueuedSong[] {
  const { catalogByGenre, catalogByArtist, genreVotes, roundCount, difficultyMode, recentlyPlayedIds } = options;
  const weights = computeChoiceWeights(genreVotes);
  const counts = weightsToCounts(weights, roundCount);
  const usedIds = new Set<string>();
  const queue: QueuedSong[] = [];

  const poolFor = (choice: DirectMusicChoice): ResolvedSong[] =>
    ARTIST_CHOICES.includes(choice as ArtistChoice)
      ? (catalogByArtist[choice as ArtistChoice] ?? [])
      : (catalogByGenre[choice as Genre] ?? []);

  const effectiveChoices = DIRECT_MUSIC_CHOICES.filter((choice) => weights[choice] > 0 && poolFor(choice).length > 0);

  const appendUnique = (choice: DirectMusicChoice, need: number): number => {
    if (need <= 0) return 0;
    const fullPool = poolFor(choice);
    const preferred = preferredPool(fullPool, difficultyMode);
    const stages = [
      preferred.filter((s) => !usedIds.has(s.id) && !recentlyPlayedIds?.has(s.id)),
      preferred.filter((s) => !usedIds.has(s.id)),
      fullPool.filter((s) => !usedIds.has(s.id) && !recentlyPlayedIds?.has(s.id)),
      fullPool.filter((s) => !usedIds.has(s.id)),
    ];

    let left = need;
    for (const stage of stages) {
      if (left <= 0) break;
      const available = stage.filter((s) => !usedIds.has(s.id));
      for (const song of secureShuffle(available).slice(0, left)) {
        usedIds.add(song.id);
        queue.push({ ...song, selectionChoice: choice });
        left--;
      }
    }
    return need - left;
  };

  const appendRepeats = (choice: DirectMusicChoice, need: number): number => {
    const pool = poolFor(choice);
    if (need <= 0 || pool.length === 0) return 0;
    let left = need;
    let cycle = secureShuffle(pool);
    while (left > 0) {
      if (!cycle.length) cycle = secureShuffle(pool);
      const song = cycle.shift();
      if (!song) break;
      queue.push({ ...song, selectionChoice: choice });
      left--;
    }
    return need - left;
  };

  const shortage = new Map<DirectMusicChoice, number>();
  for (const choice of effectiveChoices) {
    const need = counts[choice];
    const got = appendUnique(choice, need);
    if (got < need) shortage.set(choice, need - got);
  }
  shortage.forEach((n, choice) => appendRepeats(choice, n));

  while (queue.length < roundCount && effectiveChoices.length) {
    const choice = effectiveChoices[queue.length % effectiveChoices.length];
    if (!appendRepeats(choice, 1)) break;
  }

  let ordered = secureShuffle(queue.slice(0, roundCount));
  ordered = breakArtistClusters(ordered);
  ordered = breakSongRepeats(ordered);
  return ordered;
}

function breakArtistClusters(queue: QueuedSong[]): QueuedSong[] {
  const result = [...queue];
  for (let i = 1; i < result.length; i++) {
    // Em modo de artista exclusivo, repetir o artista é justamente a regra.
    if (result[i].selectionChoice.startsWith("artist-") && result[i - 1].selectionChoice === result[i].selectionChoice) continue;
    if (result[i].artist !== result[i - 1].artist) continue;
    const swap = result.findIndex((s, idx) => idx > i && s.artist !== result[i - 1].artist);
    if (swap !== -1) [result[i], result[swap]] = [result[swap], result[i]];
  }
  return result;
}

function breakSongRepeats(queue: QueuedSong[]): QueuedSong[] {
  const result = [...queue];
  for (let i = 1; i < result.length; i++) {
    if (result[i].id !== result[i - 1].id) continue;
    const swap = result.findIndex((s, idx) => idx > i && s.id !== result[i - 1].id);
    if (swap !== -1) [result[i], result[swap]] = [result[swap], result[i]];
  }
  return result;
}
