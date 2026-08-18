import fs from "fs";
import path from "path";
import { CatalogSong, Genre, GENRES, ResolvedSong } from "@shared/types";

import funkRaw from "./genres/funk.json";
import popRaw from "./genres/pop.json";
import sertanejoRaw from "./genres/sertanejo.json";
import modaoRaw from "./genres/modao.json";
import rapRaw from "./genres/rap.json";
import trapRaw from "./genres/trap.json";
import mpbRaw from "./genres/mpb.json";
import acusticoRaw from "./genres/acustico.json";

const BASE_RAW_BY_GENRE: Record<Genre, Omit<CatalogSong, "genre">[]> = {
  funk: funkRaw as Omit<CatalogSong, "genre">[],
  pop: popRaw as Omit<CatalogSong, "genre">[],
  sertanejo: sertanejoRaw as Omit<CatalogSong, "genre">[],
  modao: modaoRaw as Omit<CatalogSong, "genre">[],
  rap: rapRaw as Omit<CatalogSong, "genre">[],
  trap: trapRaw as Omit<CatalogSong, "genre">[],
  mpb: mpbRaw as Omit<CatalogSong, "genre">[],
  acustico: acusticoRaw as Omit<CatalogSong, "genre">[],
};

const CACHE_PATH = path.join(__dirname, "..", "..", "data", "previewCache.json");
const CONCURRENCY = 10;
const DELAY_BETWEEN_BATCHES_MS = 90;
const PREVIEW_MIN_REMAINING_MS = 90_000;
const FALLBACK_PREVIEW_TTL_MS = 7 * 60_000;
const EXPANSION_TRACKS_PER_ARTIST = 14;
const EXPANSION_FETCH_LIMIT = 35;

/**
 * V7: meta de catálogo. As categorias pedidas recebem prioridade e chegam a
 * ~1.050 faixas no total quando a API da Deezer está disponível.
 */
const EXPANSION_TARGETS: Partial<Record<Genre, number>> = {
  sertanejo: 190,
  acustico: 150,
  trap: 170,
  funk: 170,
  modao: 160,
};

/**
 * Cada artista pertence somente a um pool nesta expansão. Isso evita que o
 * catálogo automático jogue, por exemplo, sertanejo dentro de Trap.
 */
const EXPANSION_ARTISTS: Partial<Record<Genre, string[]>> = {
  sertanejo: [
    "Jorge & Mateus", "Henrique & Juliano", "Marília Mendonça", "Gusttavo Lima",
    "Luan Santana", "Zé Neto & Cristiano", "Maiara & Maraisa", "Matheus & Kauan",
    "Hugo & Guilherme", "Guilherme & Benuto", "Murilo Huff", "Ana Castela",
    "Simone Mendes", "Israel & Rodolffo", "Diego & Victor Hugo", "Clayton & Romário",
    "Felipe Araújo", "Naiara Azevedo", "Lauana Prado", "César Menotti & Fabiano",
    "João Bosco & Vinícius", "Fernando & Sorocaba", "Marcos & Belutti", "Edson & Hudson",
  ],
  acustico: [
    "Pineapple StormTv", "1Kilo", "Oriente", "3030", "Delacruz", "Luiz Lins",
    "Luccas Carlos", "Cynthia Luz", "Lourena", "Budah", "Gaab", "Maria", "Kayuá",
  ],
  trap: [
    "Matuê", "Teto", "WIU", "Veigh", "Kayblack", "Ryu, the Runner", "Yunk Vino",
    "Tz da Coronel", "Oruam", "Chefin", "Borges", "Vulgo FK", "Orochi", "Sidoka",
    "Derek", "Recayd Mob", "Kyan", "Leviano", "Alee", "Brandão85", "Duzz",
  ],
  funk: [
    "MC Kevin o Chris", "MC Hariel", "MC Ryan SP", "MC IG", "MC Don Juan", "MC Livinho",
    "MC Kevinho", "MC PH", "MC Paiva ZS", "MC Tuto", "MC GP", "MC Davi", "MC Pedrinho",
    "MC Dricka", "MC Carol", "MC Bin Laden", "MC Lan", "MC GW", "MC Negão Original",
    "MC João", "MC Fioti", "MC WM", "MC Zaac", "Bonde do Tigrão",
  ],
  modao: [
    "Chitãozinho & Xororó", "Zezé Di Camargo & Luciano", "Leandro & Leonardo",
    "Milionário & José Rico", "Trio Parada Dura", "Tião Carreiro & Pardinho",
    "João Mineiro & Marciano", "Chrystian & Ralf", "Bruno & Marrone", "Daniel",
    "Sérgio Reis", "Teodoro & Sampaio", "Rionegro & Solimões", "Matogrosso & Mathias",
    "Duduca & Dalvan", "Lourenço & Lourival", "Cezar & Paulinho", "Gino & Geno",
    "Liu & Léu", "Tonico & Tinoco", "Pena Branca & Xavantinho", "João Paulo & Daniel",
    "Almir Sater", "Renato Teixeira", "Roberta Miranda",
  ],
};

interface CacheEntry {
  previewUrl: string;
  coverUrl: string;
  resolvedAt: number;
  title: string;
  artist: string;
}

type Cache = Record<string, CacheEntry>;

function loadCache(): Cache {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf8");
    return JSON.parse(raw) as Cache;
  } catch {
    return {};
  }
}

function saveCache(cache: Cache): void {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  rank?: number;
  artist: { id?: number; name: string };
  album: { cover_medium: string; cover_big: string };
}

interface DeezerArtist {
  id: number;
  name: string;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(feat|ft|part|participacao)\.?\b.*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function primaryArtist(value: string): string {
  return value
    .split(/\s+(?:feat\.?|ft\.?|part\.?|participacao\.?)\s+/i)[0]
    .trim();
}

function titleMatchScore(expected: string, actual: string): number {
  const a = normalizeText(expected);
  const b = normalizeText(actual);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.startsWith(`${a} `) || a.startsWith(`${b} `)) return 85;
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const common = [...aTokens].filter((token) => bTokens.has(token)).length;
  const ratio = common / Math.max(aTokens.size, bTokens.size, 1);
  return ratio >= 0.8 ? Math.round(ratio * 70) : 0;
}

function artistMatchScore(expected: string, actual: string): number {
  const a = normalizeText(primaryArtist(expected));
  const b = normalizeText(actual);
  if (!a || !b) return 0;
  if (a === b) return 70;
  if (b.includes(a) || a.includes(b)) return 60;
  const pieces = expected.split(/,|&|\se\s/gi).map((part) => normalizeText(part)).filter((part) => part.length >= 3);
  if (pieces.some((part) => b.includes(part) || part.includes(b))) return 55;
  return 0;
}

function isTrackMatch(song: { title: string; artist: string }, track: { title: string; artist: string }): boolean {
  return titleMatchScore(song.title, track.title) >= 70 && artistMatchScore(song.artist, track.artist) >= 60;
}

async function searchDeezer(title: string, artist: string): Promise<DeezerTrack | null> {
  const query = encodeURIComponent(`${title} ${primaryArtist(artist)}`);
  const url = `https://api.deezer.com/search?q=${query}&limit=10`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { data: DeezerTrack[] };
    const ranked = (json.data ?? [])
      .map((track) => ({
        track,
        score: titleMatchScore(title, track.title) + artistMatchScore(artist, track.artist?.name ?? ""),
      }))
      .filter(({ track }) => isTrackMatch(
        { title, artist },
        { title: track.title, artist: track.artist?.name ?? "" }
      ))
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.track ?? null;
  } catch {
    return null;
  }
}

let cacheState: Cache = loadCache();
let rawByGenre: Record<Genre, Omit<CatalogSong, "genre">[]> = Object.fromEntries(
  GENRES.map((genre) => [genre, BASE_RAW_BY_GENRE[genre].map((song) => ({ ...song }))])
) as Record<Genre, Omit<CatalogSong, "genre">[]>;
let allSongs: CatalogSong[] = [];
const catalogById = new Map<string, CatalogSong>();

function rebuildCatalogIndexes(): void {
  allSongs = GENRES.flatMap((genre) =>
    rawByGenre[genre].map((s) => ({ ...s, genre }) as CatalogSong)
  );
  catalogById.clear();
  allSongs.forEach((song) => catalogById.set(song.id, song));
}

rebuildCatalogIndexes();

function cleanTitleForIdentity(title: string): string {
  return normalizeText(title)
    .replace(/\b(ao vivo|live|acustico|acoustic|remaster|remastered|radio edit|versao|version)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function songIdentity(title: string, artist: string): string {
  return `${cleanTitleForIdentity(title)}::${normalizeText(primaryArtist(artist))}`;
}

function difficultyForArtistRank(index: number): 1 | 2 | 3 | 4 {
  if (index < 4) return 1;
  if (index < 8) return 2;
  if (index < 12) return 3;
  return 4;
}

function popularityForArtistRank(index: number): 1 | 2 | 3 | 4 | 5 {
  if (index < 4) return 5;
  if (index < 8) return 4;
  if (index < 12) return 3;
  return 2;
}

async function findDeezerArtist(name: string): Promise<DeezerArtist | null> {
  try {
    const query = encodeURIComponent(name);
    const res = await fetch(`https://api.deezer.com/search/artist?q=${query}&limit=8`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: DeezerArtist[] };
    const expected = normalizeText(name);
    const candidates = json.data ?? [];
    return candidates.find((artist) => normalizeText(artist.name) === expected)
      ?? candidates.find((artist) => {
        const actual = normalizeText(artist.name);
        return actual.includes(expected) || expected.includes(actual);
      })
      ?? null;
  } catch {
    return null;
  }
}

async function fetchArtistTopTracks(artistId: number): Promise<DeezerTrack[]> {
  try {
    const res = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=${EXPANSION_FETCH_LIMIT}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: DeezerTrack[] };
    return (json.data ?? []).filter((track) => !!track.preview && !!track.title && !!track.artist?.name);
  } catch {
    return [];
  }
}

async function expandPriorityGenresFromDeezer(): Promise<void> {
  const initialTotal = GENRES.reduce((sum, genre) => sum + rawByGenre[genre].length, 0);
  let addedTotal = 0;

  console.log(`[catalog] expansão V7 iniciada: base local com ${initialTotal} músicas`);

  for (const genre of GENRES) {
    const target = EXPANSION_TARGETS[genre];
    const artists = EXPANSION_ARTISTS[genre] ?? [];
    if (!target || rawByGenre[genre].length >= target || artists.length === 0) continue;

    const existing = new Set(rawByGenre[genre].map((song) => songIdentity(song.title, song.artist)));
    let addedGenre = 0;

    for (const artistName of artists) {
      if (rawByGenre[genre].length >= target) break;
      const artist = await findDeezerArtist(artistName);
      if (!artist) continue;

      const tracks = await fetchArtistTopTracks(artist.id);
      let addedFromArtist = 0;

      for (let index = 0; index < tracks.length; index++) {
        if (rawByGenre[genre].length >= target || addedFromArtist >= EXPANSION_TRACKS_PER_ARTIST) break;
        const track = tracks[index];

        // Exige que a faixa seja creditada ao artista do pool escolhido. Isso reduz
        // resultados de busca de outros gêneros com nomes semelhantes.
        if (normalizeText(track.artist.name) !== normalizeText(artist.name)) continue;

        const identity = songIdentity(track.title, track.artist.name);
        if (!identity.split("::")[0] || existing.has(identity)) continue;

        const id = `dz-${genre}-${track.id}`;
        const song: Omit<CatalogSong, "genre"> = {
          id,
          title: track.title,
          artist: track.artist.name,
          year: 0,
          difficulty: difficultyForArtistRank(addedFromArtist),
          popularity: popularityForArtistRank(addedFromArtist),
        };

        rawByGenre[genre].push(song);
        existing.add(identity);
        cacheState[id] = {
          previewUrl: track.preview,
          coverUrl: track.album?.cover_big || track.album?.cover_medium || "",
          resolvedAt: Date.now(),
          title: track.title,
          artist: track.artist.name,
        };
        addedFromArtist += 1;
        addedGenre += 1;
        addedTotal += 1;
      }
    }

    console.log(`[catalog]   ${genre}: +${addedGenre} -> ${rawByGenre[genre].length}/${target}`);
  }

  if (addedTotal > 0) saveCache(cacheState);
  rebuildCatalogIndexes();
  console.log(`[catalog] expansão V7 concluída: ${allSongs.length} músicas cadastradas nesta sessão`);
}

function extractPreviewExpiryMs(previewUrl: string): number | null {
  try {
    const decoded = decodeURIComponent(previewUrl);
    const match = decoded.match(/(?:^|[?~&])exp=(\d{9,13})(?:[~&]|$)/);
    if (!match) return null;
    const raw = Number(match[1]);
    if (!Number.isFinite(raw)) return null;
    return raw < 10_000_000_000 ? raw * 1000 : raw;
  } catch {
    return null;
  }
}

function isFreshPreview(entry: CacheEntry | undefined): entry is CacheEntry {
  if (!entry?.previewUrl) return false;
  const now = Date.now();
  const signedExpiry = extractPreviewExpiryMs(entry.previewUrl);
  if (signedExpiry !== null) return signedExpiry - now > PREVIEW_MIN_REMAINING_MS;
  return now - entry.resolvedAt < FALLBACK_PREVIEW_TTL_MS;
}

async function refreshSong(song: CatalogSong): Promise<CacheEntry | null> {
  const track = await searchDeezer(song.title, song.artist);
  if (!track || !track.preview) return null;

  const entry: CacheEntry = {
    previewUrl: track.preview,
    coverUrl: track.album?.cover_big || track.album?.cover_medium || "",
    resolvedAt: Date.now(),
    title: track.title,
    artist: track.artist?.name ?? song.artist,
  };
  cacheState[song.id] = entry;
  saveCache(cacheState);
  return entry;
}

let resolvedByGenre: Record<Genre, ResolvedSong[]> = {
  funk: [], pop: [], sertanejo: [], modao: [], rap: [], trap: [], mpb: [], acustico: [],
};
let resolutionStats = { total: 0, resolved: 0, failed: 0 };
let readyPromise: Promise<void> | null = null;

/**
 * Returns a valid preview URL at the moment it is requested.
 * Deezer preview links are signed and expire quickly, so they must never be
 * trusted forever just because they exist in previewCache.json.
 */
export async function getFreshPreviewUrl(songId: string): Promise<string | null> {
  const song = catalogById.get(songId);
  if (!song) return null;

  const cached = cacheState[songId];
  if (cached && isTrackMatch(song, { title: cached.title, artist: cached.artist }) && isFreshPreview(cached)) {
    return cached.previewUrl;
  }

  const refreshed = await refreshSong(song);
  return refreshed?.previewUrl ?? null;
}

async function resolveOne(song: CatalogSong): Promise<ResolvedSong | null> {
  const cached = cacheState[song.id];

  if (cached?.previewUrl && isTrackMatch(song, { title: cached.title, artist: cached.artist })) {
    return { ...song, previewUrl: cached.previewUrl, coverUrl: cached.coverUrl };
  }

  const fresh = await refreshSong(song);
  if (!fresh) return null;
  return { ...song, previewUrl: fresh.previewUrl, coverUrl: fresh.coverUrl };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initCatalog(): Promise<void> {
  if (!readyPromise) readyPromise = doInitCatalog();
  return readyPromise;
}

async function doInitCatalog(): Promise<void> {
  await expandPriorityGenresFromDeezer();

  resolutionStats = { total: allSongs.length, resolved: 0, failed: 0 };
  console.log(`[catalog] preparando ${allSongs.length} músicas...`);

  const results: ResolvedSong[] = [];
  for (let i = 0; i < allSongs.length; i += CONCURRENCY) {
    const batch = allSongs.slice(i, i + CONCURRENCY);
    const resolved = await Promise.all(batch.map((song) => resolveOne(song)));
    resolved.forEach((r) => {
      if (r) {
        results.push(r);
        resolutionStats.resolved += 1;
      } else {
        resolutionStats.failed += 1;
      }
    });
    if (i + CONCURRENCY < allSongs.length) await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  const byGenre: Record<Genre, ResolvedSong[]> = {
    funk: [], pop: [], sertanejo: [], modao: [], rap: [], trap: [], mpb: [], acustico: [],
  };
  results.forEach((song) => byGenre[song.genre].push(song));
  resolvedByGenre = byGenre;

  console.log(
    `[catalog] pronto: ${resolutionStats.resolved}/${resolutionStats.total} músicas disponíveis ` +
      `(${resolutionStats.failed} indisponíveis foram excluídas do sorteio)`
  );
  GENRES.forEach((g) => console.log(`[catalog]   ${g}: ${byGenre[g].length} músicas prontas`));
}

export function getCatalogByGenre(): Record<Genre, ResolvedSong[]> {
  return resolvedByGenre;
}

/** Catálogo completo para montar alternativas, mesmo quando uma faixa não tem preview disponível. */
export function getRawCatalogByGenre(): Record<Genre, CatalogSong[]> {
  return Object.fromEntries(
    GENRES.map((genre) => [genre, rawByGenre[genre].map((song) => ({ ...song, genre }) as CatalogSong)])
  ) as Record<Genre, CatalogSong[]>;
}

export function getResolutionStats() {
  return resolutionStats;
}

export function getCatalogCounts(): Record<Genre, number> {
  return Object.fromEntries(GENRES.map((genre) => [genre, rawByGenre[genre].length])) as Record<Genre, number>;
}
