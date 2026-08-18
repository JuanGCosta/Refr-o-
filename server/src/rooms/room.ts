import type { Server as IOServer } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ArtistChoice,
  Genre,
  GenreChoice,
  DifficultyMode,
  GENRES,
  GENRE_CHOICES,
  GENRE_LABELS,
  PublicPlayer,
  RoomSettings,
  RoomStatus,
  ScoreboardEntry,
  RoundEndPayload,
  RoundPlayerResult,
  Award,
  PlayerStats,
  FinishedPayload,
  RoomStateSnapshot,
  MAX_PLAYERS,
  MIN_ROUNDS,
  MAX_ROUNDS,
  ROUND_DURATION_MS,
  ROUND_DURATION_OPTIONS_MS,
} from "@shared/types";
import { generatePlayerId, generateSessionToken } from "../utils/session";
import { buildSongQueue, QueuedSong } from "../game/songSelection";
import { buildAlternatives } from "../game/alternatives";
import { calculateScore } from "../game/scoring";
import {
  getCatalogByArtistChoice,
  getCatalogByGenre,
  getRawCatalogByArtistChoice,
  getRawCatalogByGenre,
  getFreshPreviewUrl,
  getCachedCoverUrl,
} from "../catalog/catalogService";
import { secureRandomIndex, secureShuffle } from "../utils/random";

interface InternalPlayer {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  socketId: string | null;
  sessionToken: string;
  joinedAt: number;
  score: number;
  streak: number;
  bestStreak: number;
  correctAnswers: number;
  wrongAnswers: number;
  fastestAnswerMs: number | null;
  totalCorrectTimeMs: number;
  genreCorrect: Partial<Record<Genre, number>>;
  hasAnsweredCurrentRound: boolean;
  disconnectTimer: NodeJS.Timeout | null;
}

interface ActiveRoundAnswer {
  optionIndex: number;
  timeMs: number;
  correct: boolean;
}

interface ActiveRound {
  index: number;
  song: QueuedSong;
  options: { label: string; isCorrect: boolean }[];
  correctIndex: number;
  serverStartTime: number;
  durationMs: number;
  answers: Map<string, ActiveRoundAnswer>;
}

const DISCONNECT_GRACE_LOBBY_MS = 30_000;
const ROUND_RESULT_DISPLAY_MS = 8_000;
const SCOREBOARD_DISPLAY_MS = 5_000;
const COUNTDOWN_STEP_MS = 900;
const RECENTLY_PLAYED_CAP = 60;

type IO = IOServer<ClientToServerEvents, ServerToClientEvents>;

export class Room {
  code: string;
  status: RoomStatus = "LOBBY";
  players = new Map<string, InternalPlayer>();
  settings: RoomSettings = { roundCount: 10, roundDurationMs: ROUND_DURATION_MS, difficultyMode: "equilibrado" };
  genreVotes = new Map<string, GenreChoice>();
  selectedGenre: GenreChoice | null = null;
  songQueue: QueuedSong[] = [];
  currentRoundIndex = -1;
  currentRound: ActiveRound | null = null;
  recentlyPlayedIds = new Set<string>();
  private unplayableSongIds = new Set<string>();
  createdAt = Date.now();
  lastActivityAt = Date.now();

  private scoreboardOrder: string[] = [];
  private timers = new Set<NodeJS.Timeout>();
  private countdownValue: number | null = null;
  private lastRoundResult: RoundEndPayload | null = null;
  private lastScoreboard: { ranking: ScoreboardEntry[]; nextRoundIn: number } | null = null;
  private scoreboardShownAt = 0;
  private finishedPayload: FinishedPayload | null = null;
  private roundPreparationInFlight = new Map<number, Promise<boolean>>();

  constructor(code: string, private io: IO) {
    this.code = code;
  }

  private touch(): void {
    this.lastActivityAt = Date.now();
  }

  private schedule(fn: () => void, ms: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
    return timer;
  }

  destroy(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.players.forEach((p) => {
      if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
    });
  }

  isEmpty(): boolean {
    return ![...this.players.values()].some((p) => p.connected);
  }

  // ---------- players ----------

  publicPlayers(): PublicPlayer[] {
    return [...this.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatarId: p.avatarId,
        isHost: p.isHost,
        isReady: p.isReady,
        connected: p.connected,
        score: p.score,
        streak: p.streak,
        correctAnswers: p.correctAnswers,
        wrongAnswers: p.wrongAnswers,
        fastestAnswerMs: p.fastestAnswerMs,
        genreCorrect: p.genreCorrect,
        hasAnsweredCurrentRound: p.hasAnsweredCurrentRound,
      }));
  }

  private broadcastPlayers(): void {
    this.io.to(this.code).emit("room:update", this.publicPlayers());
  }

  private setStatus(status: RoomStatus): void {
    this.status = status;
    this.io.to(this.code).emit("room:status", { status });
  }

  snapshotFor(playerId: string): RoomStateSnapshot | null {
    const player = this.players.get(playerId);
    if (!player) return null;
    return {
      roomCode: this.code,
      status: this.status,
      players: this.publicPlayers(),
      settings: this.settings,
      selectedGenre: this.selectedGenre,
      genreVotes: this.votesTally(),
      myVote: this.genreVotes.get(player.id) ?? null,
      currentRound: Math.max(this.currentRoundIndex + 1, 0),
      totalRounds: this.settings.roundCount,
      you: { playerId: player.id, sessionToken: player.sessionToken },
    };
  }

  canJoin(): boolean {
    return this.status === "LOBBY" && this.players.size < MAX_PLAYERS;
  }

  addPlayer(name: string, avatarId: string, socketId: string): InternalPlayer {
    const isHost = this.players.size === 0;
    const player: InternalPlayer = {
      id: generatePlayerId(),
      name,
      avatarId,
      isHost,
      isReady: isHost,
      connected: true,
      socketId,
      sessionToken: generateSessionToken(),
      joinedAt: Date.now(),
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      fastestAnswerMs: null,
      totalCorrectTimeMs: 0,
      genreCorrect: {},
      hasAnsweredCurrentRound: false,
      disconnectTimer: null,
    };
    this.players.set(player.id, player);
    this.touch();
    this.broadcastPlayers();
    return player;
  }

  reconnectPlayer(sessionToken: string, socketId: string): InternalPlayer | null {
    const player = [...this.players.values()].find((p) => p.sessionToken === sessionToken);
    if (!player) return null;
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
    player.connected = true;
    player.socketId = socketId;
    this.touch();
    this.broadcastPlayers();
    return player;
  }

  handleDisconnect(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
    this.broadcastPlayers();

    if (player.isHost) this.migrateHost();

    if (this.status === "LOBBY") {
      player.disconnectTimer = this.schedule(() => {
        this.players.delete(playerId);
        if (this.players.size > 0) this.migrateHost();
        this.broadcastPlayers();
      }, DISCONNECT_GRACE_LOBBY_MS);
    }
    this.touch();
  }

  private migrateHost(): void {
    const current = [...this.players.values()].find((p) => p.isHost);
    if (current?.connected) return;
    if (current) current.isHost = false;
    const next = [...this.players.values()]
      .filter((p) => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next) {
      next.isHost = true;
      next.isReady = true;
    }
  }

  setReady(playerId: string, ready: boolean): void {
    const player = this.players.get(playerId);
    if (!player || this.status !== "LOBBY") return;
    player.isReady = player.isHost ? true : ready;
    this.broadcastPlayers();
  }

  setRoundCount(playerId: string, count: number): boolean {
    const player = this.players.get(playerId);
    if (!player?.isHost || this.status !== "LOBBY") return false;
    if (!Number.isInteger(count) || count < MIN_ROUNDS || count > MAX_ROUNDS) return false;
    this.settings.roundCount = count;
    this.io.to(this.code).emit("room:settingsUpdate", { ...this.settings });
    this.touch();
    return true;
  }

  setRoundDuration(playerId: string, durationMs: number): boolean {
    const player = this.players.get(playerId);
    if (!player?.isHost || this.status !== "LOBBY") return false;
    if (!ROUND_DURATION_OPTIONS_MS.includes(durationMs as (typeof ROUND_DURATION_OPTIONS_MS)[number])) return false;
    this.settings.roundDurationMs = durationMs;
    this.io.to(this.code).emit("room:settingsUpdate", { ...this.settings });
    this.touch();
    return true;
  }

  setDifficulty(playerId: string, mode: DifficultyMode): boolean {
    const player = this.players.get(playerId);
    if (!player?.isHost || this.status !== "LOBBY") return false;
    if (!["facil", "equilibrado", "dificil", "misturado"].includes(mode)) return false;
    this.settings.difficultyMode = mode;
    this.io.to(this.code).emit("room:settingsUpdate", { ...this.settings });
    this.touch();
    return true;
  }

  // ---------- genre voting ----------

  private votesTally(): Partial<Record<GenreChoice, number>> {
    const tally: Partial<Record<GenreChoice, number>> = {};
    this.genreVotes.forEach((genre) => {
      tally[genre] = (tally[genre] ?? 0) + 1;
    });
    return tally;
  }

  voteGenre(playerId: string, genre: GenreChoice): void {
    const player = this.players.get(playerId);
    if (!player || this.status !== "GENRE_VOTING" || !GENRE_CHOICES.includes(genre)) return;
    this.genreVotes.set(playerId, genre);
    this.io.to(this.code).emit("genre:votesUpdate", this.votesTally());
  }

  // ---------- game lifecycle ----------

  canStart(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player?.isHost || this.status !== "LOBBY") return false;
    const connected = [...this.players.values()].filter((p) => p.connected);
    // Single-player is supported; in multiplayer every connected player must be ready.
    return connected.length >= 1 && connected.every((p) => p.isReady);
  }

  startGame(playerId: string): boolean {
    if (!this.canStart(playerId)) return false;
    this.genreVotes.clear();
    this.recentlyPlayedIds.clear();
    this.unplayableSongIds.clear();
    this.countdownValue = null;
    this.lastRoundResult = null;
    this.lastScoreboard = null;
    this.finishedPayload = null;
    this.setStatus("GENRE_VOTING");
    this.io.to(this.code).emit("genre:votesUpdate", {});
    return true;
  }

  finishVoting(playerId: string): boolean {
    if (this.status !== "GENRE_VOTING") return false;
    const player = this.players.get(playerId);
    if (!player?.isHost) return false;

    const connectedIds = [...this.players.values()].filter((p) => p.connected).map((p) => p.id);
    const allVoted = connectedIds.every((id) => this.genreVotes.has(id));
    if (!allVoted) return false;

    this.finishVotingAndStart();
    return true;
  }

  private finishVotingAndStart(): void {
    if (this.status !== "GENRE_VOTING") return;
    const tally = this.votesTally();
    const maxVotes = Math.max(0, ...Object.values(tally).map((v) => v ?? 0));
    const winners = GENRE_CHOICES.filter((g) => (tally[g] ?? 0) === maxVotes && maxVotes > 0);
    this.selectedGenre = winners.length
      ? winners[secureRandomIndex(winners.length)]
      : "misturadao";

    this.songQueue = buildSongQueue({
      catalogByGenre: getCatalogByGenre(),
      catalogByArtist: getCatalogByArtistChoice(),
      genreVotes: tally,
      roundCount: this.settings.roundCount,
      difficultyMode: this.settings.difficultyMode,
      recentlyPlayedIds: this.recentlyPlayedIds,
    });
    this.currentRoundIndex = -1;
    this.scoreboardOrder = [...this.players.keys()];
    this.runCountdownThenStart(0);
  }

  private prepareRoundSong(index: number): Promise<boolean> {
    const existing = this.roundPreparationInFlight.get(index);
    if (existing) return existing;

    const task = this.resolvePlayableSongForRound(index).finally(() => {
      this.roundPreparationInFlight.delete(index);
    });
    this.roundPreparationInFlight.set(index, task);
    return task;
  }

  private async resolvePlayableSongForRound(index: number): Promise<boolean> {
    if (index >= this.songQueue.length) return true;

    const queued = this.songQueue[index];
    const isArtistMode = queued.selectionChoice.startsWith("artist-");
    const sourcePool = isArtistMode
      ? (getCatalogByArtistChoice()[queued.selectionChoice as ArtistChoice] ?? [])
      : (getCatalogByGenre()[queued.genre] ?? []);

    const candidates: QueuedSong[] = [];
    const seen = new Set<string>();
    const pushCandidate = (song: QueuedSong) => {
      if (seen.has(song.id) || this.unplayableSongIds.has(song.id)) return;
      if (song.id !== queued.id && this.recentlyPlayedIds.has(song.id)) return;
      seen.add(song.id);
      candidates.push(song);
    };

    // Try the song already chosen first. If its preview expired or disappeared,
    // replacements stay inside the same genre/artist pool.
    pushCandidate(queued);
    for (const song of secureShuffle(sourcePool)) {
      pushCandidate({ ...song, selectionChoice: queued.selectionChoice });
      if (candidates.length >= 17) break;
    }

    const BATCH_SIZE = 4;
    for (let offset = 0; offset < candidates.length; offset += BATCH_SIZE) {
      const batch = candidates.slice(offset, offset + BATCH_SIZE);
      const checks = await Promise.all(
        batch.map(async (candidate) => ({
          candidate,
          preview: await getFreshPreviewUrl(candidate.id),
        }))
      );

      const playable = checks.find((result) => Boolean(result.preview));
      checks.forEach((result) => {
        if (!result.preview) this.unplayableSongIds.add(result.candidate.id);
      });

      if (playable) {
        this.songQueue[index] = playable.candidate;
        return true;
      }
    }

    return false;
  }

  private runCountdownThenStart(nextIndex: number): void {
    void this.prepareCountdownAndStart(nextIndex);
  }

  private async prepareCountdownAndStart(nextIndex: number): Promise<void> {
    this.lastRoundResult = null;
    this.lastScoreboard = null;
    this.countdownValue = null;
    this.setStatus("COUNTDOWN");

    // Never open a scored round until the server has confirmed a valid preview.
    // If one track fails, resolvePlayableSongForRound swaps it for another track
    // from exactly the same category.
    const ready = await this.prepareRoundSong(nextIndex);
    if (this.status !== "COUNTDOWN") return;

    if (!ready) {
      console.warn(`[room ${this.code}] nenhum preview disponível para a rodada ${nextIndex + 1}; tentando novamente.`);
      this.schedule(() => this.runCountdownThenStart(nextIndex), 2_000);
      return;
    }

    let value = 3;
    const tick = () => {
      if (this.status !== "COUNTDOWN") return;
      this.countdownValue = value;
      this.io.to(this.code).emit("game:countdown", { value });
      if (value === 0) {
        this.countdownValue = null;
        this.startRound(nextIndex);
        return;
      }
      value -= 1;
      this.schedule(tick, COUNTDOWN_STEP_MS);
    };
    tick();
  }

  private startRound(index: number): void {
    if (index >= this.songQueue.length) {
      this.finishGame();
      return;
    }
    const song = this.songQueue[index];
    const isArtistMode = song.selectionChoice.startsWith("artist-");
    const alternativePool = isArtistMode
      ? (getRawCatalogByArtistChoice()[song.selectionChoice as ArtistChoice] ?? [])
      : (getRawCatalogByGenre()[song.genre] ?? []);
    const { options, correctIndex } = buildAlternatives(song, alternativePool, this.settings.difficultyMode);

    this.currentRoundIndex = index;
    this.currentRound = {
      index,
      song,
      options,
      correctIndex,
      serverStartTime: Date.now(),
      durationMs: this.settings.roundDurationMs,
      answers: new Map(),
    };
    this.players.forEach((p) => (p.hasAnsweredCurrentRound = false));
    this.setStatus("PLAYING");
    this.broadcastPlayers();

    this.io.to(this.code).emit("round:start", {
      roundNumber: index + 1,
      totalRounds: this.songQueue.length,
      options: options.map((o, i) => ({ index: i, label: o.label })),
      previewUrl: `/audio/${encodeURIComponent(song.id)}`,
      serverStartTime: this.currentRound.serverStartTime,
      durationMs: this.currentRound.durationMs,
    });

    // Resolve the next track while players are answering and while the result
    // screens are visible. In most rounds the next audio is ready long before 3-2-1.
    if (index + 1 < this.songQueue.length) {
      void this.prepareRoundSong(index + 1);
    }

    this.schedule(() => this.endRound(), this.currentRound.durationMs);
  }

  submitAnswer(
    playerId: string,
    optionIndex: number
  ): { ok: true; correct: boolean } | { ok: false; reason: string } {
    const player = this.players.get(playerId);
    const round = this.currentRound;
    if (!player || !round || this.status !== "PLAYING") {
      return { ok: false, reason: "Rodada não está ativa." };
    }
    if (round.answers.has(playerId)) {
      return { ok: false, reason: "Você já respondeu esta rodada." };
    }
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= round.options.length) {
      return { ok: false, reason: "Opção inválida." };
    }

    const timeMs = Math.max(0, Math.min(Date.now() - round.serverStartTime, round.durationMs));
    const correct = optionIndex === round.correctIndex;
    round.answers.set(playerId, { optionIndex, timeMs, correct });
    player.hasAnsweredCurrentRound = true;
    this.touch();

    this.io.to(this.code).emit("round:answerAck", { playerId });

    const connectedCount = [...this.players.values()].filter((p) => p.connected).length;
    if (round.answers.size >= connectedCount) {
      this.endRound();
    } else {
      this.broadcastPlayers();
    }

    return { ok: true, correct };
  }

  private endRound(): void {
    const round = this.currentRound;
    if (!round) return;
    this.currentRound = null;

    let fastestCorrectPlayerId: string | null = null;
    let fastestTime = Infinity;
    const hasCompetition = [...this.players.values()].filter((p) => p.connected).length > 1;
    if (hasCompetition) {
      round.answers.forEach((answer, playerId) => {
        if (answer.correct && answer.timeMs < fastestTime) {
          fastestTime = answer.timeMs;
          fastestCorrectPlayerId = playerId;
        }
      });
    }

    const results: RoundPlayerResult[] = [];
    this.players.forEach((player) => {
      const answer = round.answers.get(player.id) ?? null;
      const correct = answer?.correct ?? false;
      const timeMs = answer?.timeMs ?? null;
      const isFastest = player.id === fastestCorrectPlayerId;

      const { pointsEarned, newStreak } = calculateScore({
        correct,
        timeMs,
        isFastestCorrect: isFastest,
        previousStreak: player.streak,
        durationMs: round.durationMs,
      });

      player.score += pointsEarned;
      player.streak = newStreak;
      player.bestStreak = Math.max(player.bestStreak, newStreak);
      if (correct) {
        player.correctAnswers += 1;
        player.genreCorrect[round.song.genre] = (player.genreCorrect[round.song.genre] ?? 0) + 1;
        if (timeMs !== null) {
          player.totalCorrectTimeMs += timeMs;
          player.fastestAnswerMs =
            player.fastestAnswerMs === null ? timeMs : Math.min(player.fastestAnswerMs, timeMs);
        }
      } else if (answer) {
        player.wrongAnswers += 1;
      }

      results.push({
        playerId: player.id,
        correct,
        answered: !!answer,
        timeMs,
        pointsEarned,
        newStreak,
        wasFastest: isFastest,
      });
    });

    this.recentlyPlayedIds.add(round.song.id);
    if (this.recentlyPlayedIds.size > RECENTLY_PLAYED_CAP) {
      const first = this.recentlyPlayedIds.values().next().value;
      if (first) this.recentlyPlayedIds.delete(first);
    }

    const payload: RoundEndPayload = {
      roundNumber: round.index + 1,
      correctIndex: round.correctIndex,
      song: {
        title: round.song.title,
        artist: round.song.artist,
        coverUrl: getCachedCoverUrl(round.song.id) || round.song.coverUrl,
        genre: round.song.genre,
        year: round.song.year,
      },
      results,
    };
    this.lastRoundResult = payload;
    this.setStatus("ROUND_RESULT");
    this.io.to(this.code).emit("round:end", payload);
    this.broadcastPlayers();

    this.schedule(() => this.showScoreboard(), ROUND_RESULT_DISPLAY_MS);
  }

  private showScoreboard(): void {
    const ranked = [...this.players.values()].sort((a, b) => b.score - a.score);
    const ranking: ScoreboardEntry[] = ranked.map((p, i) => ({
      playerId: p.id,
      name: p.name,
      avatarId: p.avatarId,
      score: p.score,
      previousRank: this.scoreboardOrder.indexOf(p.id) === -1 ? null : this.scoreboardOrder.indexOf(p.id) + 1,
      rank: i + 1,
    }));
    this.scoreboardOrder = ranked.map((p) => p.id);

    const scoreboardPayload = {
      ranking,
      nextRoundIn: Math.round(SCOREBOARD_DISPLAY_MS / 1000),
    };
    this.lastScoreboard = scoreboardPayload;
    this.scoreboardShownAt = Date.now();
    this.setStatus("SCOREBOARD");
    this.io.to(this.code).emit("scoreboard:update", scoreboardPayload);

    this.schedule(() => this.advanceRound(), SCOREBOARD_DISPLAY_MS);
  }

  private advanceRound(): void {
    const next = this.currentRoundIndex + 1;
    if (next >= this.songQueue.length) {
      this.finishGame();
    } else {
      this.runCountdownThenStart(next);
    }
  }

  private finishGame(): void {
    const ranked = [...this.players.values()].sort((a, b) => b.score - a.score);
    const ranking: ScoreboardEntry[] = ranked.map((p, i) => ({
      playerId: p.id,
      name: p.name,
      avatarId: p.avatarId,
      score: p.score,
      previousRank: null,
      rank: i + 1,
    }));

    const totalRounds = this.songQueue.length;
    const stats: PlayerStats[] = ranked.map((p) => {
      let bestGenre: Genre | null = null;
      let bestGenreCount = 0;
      (Object.keys(p.genreCorrect) as Genre[]).forEach((g) => {
        const c = p.genreCorrect[g] ?? 0;
        if (c > bestGenreCount) {
          bestGenreCount = c;
          bestGenre = g;
        }
      });
      return {
        playerId: p.id,
        totalScore: p.score,
        correctAnswers: p.correctAnswers,
        totalRounds,
        accuracy: totalRounds > 0 ? p.correctAnswers / totalRounds : 0,
        fastestAnswerMs: p.fastestAnswerMs,
        bestStreak: p.bestStreak,
        bestGenre,
      };
    });

    const awards: Award[] = this.buildAwards(ranked);
    const payload: FinishedPayload = { ranking, stats, awards };
    this.finishedPayload = payload;
    this.setStatus("FINISHED");
    this.io.to(this.code).emit("game:finished", payload);
  }

  private buildAwards(ranked: InternalPlayer[]): Award[] {
    const awards: Award[] = [];
    if (ranked.length === 0) return awards;

    const byMost = (fn: (p: InternalPlayer) => number): InternalPlayer | null => {
      const withValue = ranked.filter((p) => fn(p) > 0);
      if (withValue.length === 0) return null;
      return withValue.sort((a, b) => fn(b) - fn(a))[0];
    };

    const ouvidoDeOuro = byMost((p) => p.correctAnswers);
    if (ouvidoDeOuro) {
      awards.push({
        key: "ouvido-de-ouro",
        title: "Ouvido de Ouro",
        description: "Mais respostas certas na partida",
        playerId: ouvidoDeOuro.id,
        playerName: ouvidoDeOuro.name,
        avatarId: ouvidoDeOuro.avatarId,
        value: `${ouvidoDeOuro.correctAnswers} acertos`,
      });
    }

    const withAvg = ranked
      .filter((p) => p.correctAnswers > 0)
      .map((p) => ({ p, avg: p.totalCorrectTimeMs / p.correctAnswers }))
      .sort((a, b) => a.avg - b.avg);
    if (withAvg.length > 0) {
      const fastest = withAvg[0];
      awards.push({
        key: "dedao-mais-rapido",
        title: "Dedão Mais Rápido",
        description: "Menor tempo médio de resposta",
        playerId: fastest.p.id,
        playerName: fastest.p.name,
        avatarId: fastest.p.avatarId,
        value: `${(fastest.avg / 1000).toFixed(2)}s em média`,
      });
    }

    const faDeCarteirinha = byMost((p) => p.bestStreak);
    if (faDeCarteirinha) {
      awards.push({
        key: "fa-de-carteirinha",
        title: "Fã de Carteirinha",
        description: "Maior sequência de acertos seguidos",
        playerId: faDeCarteirinha.id,
        playerName: faDeCarteirinha.name,
        avatarId: faDeCarteirinha.avatarId,
        value: `${faDeCarteirinha.bestStreak}x seguidas`,
      });
    }

    const specialistAwards: { genre: Genre; player: InternalPlayer; count: number }[] = [];
    GENRES.forEach((genre) => {
      const specialist = byMost((p) => p.genreCorrect[genre] ?? 0);
      if (!specialist) return;
      specialistAwards.push({
        genre,
        player: specialist,
        count: specialist.genreCorrect[genre] ?? 0,
      });
    });

    specialistAwards
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .forEach(({ genre, player, count }) => {
        awards.push({
          key: `especialista-${genre}`,
          title: `Especialista em ${GENRE_LABELS[genre]}`,
          description: `Mais acertos em ${GENRE_LABELS[genre]}`,
          playerId: player.id,
          playerName: player.name,
          avatarId: player.avatarId,
          value: `${count} acertos`,
        });
      });

    return awards;
  }

  playAgain(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player?.isHost || this.status !== "FINISHED") return false;

    this.players.forEach((p) => {
      p.score = 0;
      p.streak = 0;
      p.bestStreak = 0;
      p.correctAnswers = 0;
      p.wrongAnswers = 0;
      p.fastestAnswerMs = null;
      p.totalCorrectTimeMs = 0;
      p.genreCorrect = {};
      p.hasAnsweredCurrentRound = false;
      p.isReady = p.isHost;
    });
    this.genreVotes.clear();
    this.selectedGenre = null;
    this.songQueue = [];
    this.currentRoundIndex = -1;
    this.currentRound = null;
    this.scoreboardOrder = [];
    this.countdownValue = null;
    this.lastRoundResult = null;
    this.lastScoreboard = null;
    this.finishedPayload = null;
    this.setStatus("LOBBY");
    this.broadcastPlayers();
    return true;
  }

  getResumeCountdownPayload(): { value: number } | null {
    if (this.status !== "COUNTDOWN" || this.countdownValue === null) return null;
    return { value: this.countdownValue };
  }

  getResumeRoundResultPayload(): RoundEndPayload | null {
    return this.status === "ROUND_RESULT" ? this.lastRoundResult : null;
  }

  getResumeScoreboardPayload(): { ranking: ScoreboardEntry[]; nextRoundIn: number } | null {
    if (this.status !== "SCOREBOARD" || !this.lastScoreboard) return null;
    const elapsed = Date.now() - this.scoreboardShownAt;
    const nextRoundIn = Math.max(0, Math.ceil((SCOREBOARD_DISPLAY_MS - elapsed) / 1000));
    return { ...this.lastScoreboard, nextRoundIn };
  }

  getResumeFinishedPayload(): FinishedPayload | null {
    return this.status === "FINISHED" ? this.finishedPayload : null;
  }

  getResumeRoundPayload(): {
    roundNumber: number;
    totalRounds: number;
    options: { index: number; label: string }[];
    previewUrl: string;
    serverStartTime: number;
    durationMs: number;
  } | null {
    if (this.status !== "PLAYING" || !this.currentRound) return null;
    const r = this.currentRound;
    return {
      roundNumber: r.index + 1,
      totalRounds: this.songQueue.length,
      options: r.options.map((o, i) => ({ index: i, label: o.label })),
      previewUrl: `/audio/${encodeURIComponent(r.song.id)}`,
      serverStartTime: r.serverStartTime,
      durationMs: r.durationMs,
    };
  }

  removePlayerCompletely(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
    this.players.delete(playerId);
    if (player.isHost) this.migrateHost();
    this.broadcastPlayers();
  }
}
