// Shared types between server and client. Kept dependency-free.

export type Genre =
  | "funk"
  | "pop"
  | "pop_internacional"
  | "sertanejo"
  | "modao"
  | "rap"
  | "trap"
  | "mpb"
  | "acustico"
  | "samba"
  | "reggae";

export type ArtistChoice =
  | "artist-henrique-juliano"
  | "artist-jorge-mateus"
  | "artist-marilia-mendonca"
  | "artist-gusttavo-lima"
  | "artist-ze-neto-cristiano"
  | "artist-matue"
  | "artist-teto"
  | "artist-veigh"
  | "artist-mc-kevin-o-chris"
  | "artist-chitaozinho-xororo"
  | "artist-taylor-swift"
  | "artist-the-weeknd";

export type GenreChoice = Genre | "misturadao" | ArtistChoice;
export type DirectMusicChoice = Genre | ArtistChoice;

export const GENRES: Genre[] = [
  "funk", "pop", "pop_internacional", "sertanejo", "modao", "rap", "trap", "mpb", "acustico", "samba", "reggae",
];

export const GENRE_VOTE_CHOICES: (Genre | "misturadao")[] = [...GENRES, "misturadao"];

export const ARTIST_CHOICES: ArtistChoice[] = [
  "artist-henrique-juliano",
  "artist-jorge-mateus",
  "artist-marilia-mendonca",
  "artist-gusttavo-lima",
  "artist-ze-neto-cristiano",
  "artist-matue",
  "artist-teto",
  "artist-veigh",
  "artist-mc-kevin-o-chris",
  "artist-chitaozinho-xororo",
  "artist-taylor-swift",
  "artist-the-weeknd",
];

export const GENRE_CHOICES: GenreChoice[] = [...GENRE_VOTE_CHOICES, ...ARTIST_CHOICES];
export const DIRECT_MUSIC_CHOICES: DirectMusicChoice[] = [...GENRES, ...ARTIST_CHOICES];

export const GENRE_LABELS: Record<Genre, string> = {
  funk: "Funk",
  pop: "Pop Brasileiro",
  pop_internacional: "Pop Internacional",
  sertanejo: "Sertanejo",
  modao: "Modão / Raiz",
  rap: "Rap Nacional",
  trap: "Trap Nacional",
  mpb: "MPB",
  acustico: "Acústico / Poesia",
  samba: "Samba / Pagode",
  reggae: "Reggae Brasileiro",
};

export const ARTIST_META: Record<ArtistChoice, { label: string; artist: string; genre: Genre }> = {
  "artist-henrique-juliano": { label: "Henrique & Juliano", artist: "Henrique & Juliano", genre: "sertanejo" },
  "artist-jorge-mateus": { label: "Jorge & Mateus", artist: "Jorge & Mateus", genre: "sertanejo" },
  "artist-marilia-mendonca": { label: "Marília Mendonça", artist: "Marília Mendonça", genre: "sertanejo" },
  "artist-gusttavo-lima": { label: "Gusttavo Lima", artist: "Gusttavo Lima", genre: "sertanejo" },
  "artist-ze-neto-cristiano": { label: "Zé Neto & Cristiano", artist: "Zé Neto & Cristiano", genre: "sertanejo" },
  "artist-matue": { label: "Matuê", artist: "Matuê", genre: "trap" },
  "artist-teto": { label: "Teto", artist: "Teto", genre: "trap" },
  "artist-veigh": { label: "Veigh", artist: "Veigh", genre: "trap" },
  "artist-mc-kevin-o-chris": { label: "MC Kevin o Chris", artist: "MC Kevin o Chris", genre: "funk" },
  "artist-chitaozinho-xororo": { label: "Chitãozinho & Xororó", artist: "Chitãozinho & Xororó", genre: "modao" },
  "artist-taylor-swift": { label: "Taylor Swift", artist: "Taylor Swift", genre: "pop_internacional" },
  "artist-the-weeknd": { label: "The Weeknd", artist: "The Weeknd", genre: "pop_internacional" },
};

export const GENRE_CHOICE_LABELS: Record<GenreChoice, string> = {
  ...GENRE_LABELS,
  misturadao: "Misturadão",
  ...(Object.fromEntries(ARTIST_CHOICES.map((choice) => [choice, ARTIST_META[choice].label])) as Record<ArtistChoice, string>),
};

export type Difficulty = 1 | 2 | 3 | 4;
export type DifficultyMode = "facil" | "equilibrado" | "dificil" | "misturado";

export const DIFFICULTY_LABELS: Record<DifficultyMode, string> = {
  facil: "Fácil",
  equilibrado: "Equilibrado",
  dificil: "Difícil",
  misturado: "Misturado",
};

export type RoomStatus =
  | "LOBBY"
  | "GENRE_VOTING"
  | "COUNTDOWN"
  | "PLAYING"
  | "ROUND_RESULT"
  | "SCOREBOARD"
  | "FINISHED";

export interface CatalogSong {
  id: string;
  title: string;
  artist: string;
  genre: Genre;
  year: number;
  difficulty: Difficulty;
  popularity: 1 | 2 | 3 | 4 | 5;
}

export interface ResolvedSong extends CatalogSong {
  previewUrl: string;
  coverUrl: string;
}

export interface AvatarChoice { id: string; }

export interface PublicPlayer {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  score: number;
  streak: number;
  correctAnswers: number;
  wrongAnswers: number;
  fastestAnswerMs: number | null;
  genreCorrect: Partial<Record<Genre, number>>;
  hasAnsweredCurrentRound: boolean;
}

export interface RoomSettings {
  roundCount: number;
  roundDurationMs: number;
  difficultyMode: DifficultyMode;
}

export interface RoundOption { index: number; label: string; }

export interface RoundStartPayload {
  roundNumber: number;
  totalRounds: number;
  options: RoundOption[];
  previewUrl: string;
  serverStartTime: number;
  durationMs: number;
}

export interface RoundPlayerResult {
  playerId: string;
  correct: boolean;
  answered: boolean;
  timeMs: number | null;
  pointsEarned: number;
  newStreak: number;
  wasFastest: boolean;
}

export interface RoundEndPayload {
  roundNumber: number;
  correctIndex: number;
  song: { title: string; artist: string; coverUrl: string; genre: Genre; year: number; };
  results: RoundPlayerResult[];
}

export interface ScoreboardEntry {
  playerId: string; name: string; avatarId: string; score: number;
  previousRank: number | null; rank: number;
}

export type AwardKey =
  | "ouvido-de-ouro"
  | "dedao-mais-rapido"
  | "fa-de-carteirinha"
  | `especialista-${Genre}`;

export interface Award {
  key: AwardKey; title: string; description: string; playerId: string;
  playerName: string; avatarId: string; value: string;
}

export interface PlayerStats {
  playerId: string; totalScore: number; correctAnswers: number; totalRounds: number;
  accuracy: number; fastestAnswerMs: number | null; bestStreak: number; bestGenre: Genre | null;
}

export interface FinishedPayload { ranking: ScoreboardEntry[]; stats: PlayerStats[]; awards: Award[]; }

export interface RoomStateSnapshot {
  roomCode: string;
  status: RoomStatus;
  players: PublicPlayer[];
  settings: RoomSettings;
  selectedGenre: GenreChoice | null;
  genreVotes: Partial<Record<GenreChoice, number>>;
  currentRound: number;
  totalRounds: number;
  you: { playerId: string; sessionToken: string };
}

export interface ErrorPayload {
  code:
    | "ROOM_NOT_FOUND" | "ROOM_FULL" | "GAME_ALREADY_STARTED" | "INVALID_NAME"
    | "NOT_HOST" | "INVALID_PAYLOAD" | "RATE_LIMITED" | "SESSION_NOT_FOUND" | "SERVER_WARMING_UP";
  message: string;
}

export interface ClientToServerEvents {
  "room:create": (payload: { name: string; avatarId: string }, ack: (res: { ok: true; snapshot: RoomStateSnapshot } | { ok: false; error: ErrorPayload }) => void) => void;
  "room:join": (payload: { code: string; name: string; avatarId: string }, ack: (res: { ok: true; snapshot: RoomStateSnapshot } | { ok: false; error: ErrorPayload }) => void) => void;
  "room:reconnect": (payload: { code: string; sessionToken: string }, ack: (res: { ok: true; snapshot: RoomStateSnapshot } | { ok: false; error: ErrorPayload }) => void) => void;
  "player:ready": (payload: { ready: boolean }) => void;
  "host:setRounds": (payload: { roundCount: number }) => void;
  "host:setRoundDuration": (payload: { roundDurationMs: number }) => void;
  "host:setDifficulty": (payload: { difficultyMode: DifficultyMode }) => void;
  "genre:vote": (payload: { genre: GenreChoice }) => void;
  "host:finishVoting": () => void;
  "host:startGame": () => void;
  "answer:submit": (payload: { optionIndex: number }, ack: (res: { ok: true; correct: boolean } | { ok: false; error: ErrorPayload }) => void) => void;
  "host:playAgain": () => void;
  "room:leave": () => void;
}

export interface ServerToClientEvents {
  "room:update": (players: PublicPlayer[]) => void;
  "room:settingsUpdate": (settings: RoomSettings) => void;
  "genre:votesUpdate": (votes: Partial<Record<GenreChoice, number>>) => void;
  "game:countdown": (payload: { value: number }) => void;
  "round:start": (payload: RoundStartPayload) => void;
  "round:answerAck": (payload: { playerId: string }) => void;
  "round:end": (payload: RoundEndPayload) => void;
  "scoreboard:update": (payload: { ranking: ScoreboardEntry[]; nextRoundIn: number }) => void;
  "game:finished": (payload: FinishedPayload) => void;
  "room:status": (payload: { status: RoomStatus }) => void;
  "room:closed": (payload: { reason: string }) => void;
  error: (payload: ErrorPayload) => void;
}

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;
export const MIN_ROUNDS = 5;
export const MAX_ROUNDS = 30;
export const ROUND_DURATION_MS = 12000;
export const ROUND_DURATION_OPTIONS_MS = [8000, 12000, 15000, 20000] as const;
export const MAX_NAME_LENGTH = 18;
