import type { Server as SocketIOServer, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ErrorPayload,
  GENRE_CHOICES,
  ROUND_DURATION_OPTIONS_MS,
  MIN_ROUNDS,
  MAX_ROUNDS,
} from "@shared/types";
import { RoomManager } from "../rooms/roomManager";
import { sanitizeName, isValidAvatarId, isValidRoomCode } from "../utils/sanitize";
import { normalizeRoomCode } from "../utils/roomCode";
import { RateLimiter } from "../utils/rateLimit";

type IO = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketData {
  roomCode: string;
  playerId: string;
}

function err(code: ErrorPayload["code"], message: string): ErrorPayload {
  return { code, message };
}

export function registerSocketHandlers(io: IO, roomManager: RoomManager, isServerReady: () => boolean = () => true): void {
  const eventLimiter = new RateLimiter(30, 15);

  io.on("connection", (socket: AppSocket) => {
    socket.use((_packet, next) => {
      if (!eventLimiter.allow(socket.id)) {
        socket.emit("error", err("RATE_LIMITED", "Muitas ações em pouco tempo. Devagar!"));
        return;
      }
      next();
    });

    const getContext = (): SocketData | null => (socket.data as Partial<SocketData>).roomCode
      ? (socket.data as SocketData)
      : null;

    socket.on("room:create", (payload, ack) => {
      const name = sanitizeName(payload?.name);
      if (!name) return ack({ ok: false, error: err("INVALID_NAME", "Nome inválido.") });
      if (!isValidAvatarId(payload?.avatarId)) {
        return ack({ ok: false, error: err("INVALID_PAYLOAD", "Avatar inválido.") });
      }

      const room = roomManager.create();
      const player = room.addPlayer(name, payload.avatarId, socket.id);
      socket.join(room.code);
      socket.data = { roomCode: room.code, playerId: player.id } satisfies SocketData;

      const snapshot = room.snapshotFor(player.id);
      if (!snapshot) return ack({ ok: false, error: err("ROOM_NOT_FOUND", "Falha ao criar sala.") });
      ack({ ok: true, snapshot });
    });

    socket.on("room:join", (payload, ack) => {
      const code = normalizeRoomCode(payload?.code ?? "");
      if (!isValidRoomCode(code)) {
        return ack({ ok: false, error: err("ROOM_NOT_FOUND", "Código de sala inválido.") });
      }
      const room = roomManager.get(code);
      if (!room) return ack({ ok: false, error: err("ROOM_NOT_FOUND", "Sala não encontrada.") });

      const name = sanitizeName(payload?.name);
      if (!name) return ack({ ok: false, error: err("INVALID_NAME", "Nome inválido.") });
      if (!isValidAvatarId(payload?.avatarId)) {
        return ack({ ok: false, error: err("INVALID_PAYLOAD", "Avatar inválido.") });
      }
      if (!room.canJoin()) {
        const reason = room.status !== "LOBBY" ? "GAME_ALREADY_STARTED" : "ROOM_FULL";
        const msg = room.status !== "LOBBY" ? "A partida já começou." : "Sala cheia (máximo 4 jogadores).";
        return ack({ ok: false, error: err(reason, msg) });
      }

      const player = room.addPlayer(name, payload.avatarId, socket.id);
      socket.join(room.code);
      socket.data = { roomCode: room.code, playerId: player.id } satisfies SocketData;

      const snapshot = room.snapshotFor(player.id);
      if (!snapshot) return ack({ ok: false, error: err("ROOM_NOT_FOUND", "Falha ao entrar na sala.") });
      ack({ ok: true, snapshot });
    });

    socket.on("room:reconnect", (payload, ack) => {
      const code = normalizeRoomCode(payload?.code ?? "");
      const room = roomManager.get(code);
      if (!room) return ack({ ok: false, error: err("ROOM_NOT_FOUND", "Sala não encontrada.") });

      const player = room.reconnectPlayer(payload?.sessionToken, socket.id);
      if (!player) return ack({ ok: false, error: err("SESSION_NOT_FOUND", "Sessão expirada.") });

      socket.join(room.code);
      socket.data = { roomCode: room.code, playerId: player.id } satisfies SocketData;

      const snapshot = room.snapshotFor(player.id);
      if (!snapshot) return ack({ ok: false, error: err("ROOM_NOT_FOUND", "Falha ao reconectar.") });
      ack({ ok: true, snapshot });

      const resumeCountdown = room.getResumeCountdownPayload();
      if (resumeCountdown) socket.emit("game:countdown", resumeCountdown);
      const resumeRound = room.getResumeRoundPayload();
      if (resumeRound) socket.emit("round:start", resumeRound);
      const resumeResult = room.getResumeRoundResultPayload();
      if (resumeResult) socket.emit("round:end", resumeResult);
      const resumeScoreboard = room.getResumeScoreboardPayload();
      if (resumeScoreboard) socket.emit("scoreboard:update", resumeScoreboard);
      const resumeFinished = room.getResumeFinishedPayload();
      if (resumeFinished) socket.emit("game:finished", resumeFinished);
    });

    socket.on("player:ready", (payload) => {
      const ctx = getContext();
      if (!ctx) return;
      const room = roomManager.get(ctx.roomCode);
      room?.setReady(ctx.playerId, !!payload?.ready);
    });

    socket.on("host:setRounds", (payload) => {
      const ctx = getContext();
      if (!ctx) return;
      const room = roomManager.get(ctx.roomCode);
      if (!room) return;
      const count = Number(payload?.roundCount);
      if (!room.setRoundCount(ctx.playerId, count)) {
        socket.emit(
          "error",
          err("INVALID_PAYLOAD", `Número de rodadas deve ser entre ${MIN_ROUNDS} e ${MAX_ROUNDS}.`)
        );
      }
    });


    socket.on("host:setRoundDuration", (payload) => {
      const ctx = getContext(); if (!ctx) return;
      const room = roomManager.get(ctx.roomCode); if (!room) return;
      const durationMs = Number(payload?.roundDurationMs);
      if (!ROUND_DURATION_OPTIONS_MS.includes(durationMs as (typeof ROUND_DURATION_OPTIONS_MS)[number]) || !room.setRoundDuration(ctx.playerId, durationMs)) {
        socket.emit("error", err("INVALID_PAYLOAD", "Tempo de rodada inválido."));
      }
    });

    socket.on("host:setDifficulty", (payload) => {
      const ctx = getContext(); if (!ctx) return;
      const room = roomManager.get(ctx.roomCode); if (!room) return;
      if (!room.setDifficulty(ctx.playerId, payload?.difficultyMode)) {
        socket.emit("error", err("INVALID_PAYLOAD", "Dificuldade inválida."));
      }
    });

    socket.on("genre:vote", (payload) => {
      const ctx = getContext();
      if (!ctx) return;
      const room = roomManager.get(ctx.roomCode);
      if (!room) return;
      if (!GENRE_CHOICES.includes(payload?.genre)) {
        return socket.emit("error", err("INVALID_PAYLOAD", "Gênero inválido."));
      }
      room.voteGenre(ctx.playerId, payload.genre);
    });

    socket.on("host:finishVoting", () => {
      const ctx = getContext();
      if (!ctx) return;
      const room = roomManager.get(ctx.roomCode);
      if (!room) return;
      if (!room.finishVoting(ctx.playerId)) {
        socket.emit("error", err("INVALID_PAYLOAD", "Todos os jogadores precisam escolher antes de começar."));
      }
    });

    socket.on("host:startGame", () => {
      if (!isServerReady()) {
        socket.emit("error", err("SERVER_WARMING_UP", "O servidor ainda está preparando o catálogo. Aguarde alguns segundos e tente novamente."));
        return;
      }
      const ctx = getContext();
      if (!ctx) return;
      const room = roomManager.get(ctx.roomCode);
      if (!room) return;
      if (!room.startGame(ctx.playerId)) {
        socket.emit(
          "error",
          err("NOT_HOST", "Não foi possível iniciar. Confira se você é o host e se todos os jogadores estão prontos.")
        );
      }
    });

    socket.on("answer:submit", (payload, ack) => {
      const ctx = getContext();
      if (!ctx) return ack({ ok: false, error: err("INVALID_PAYLOAD", "Sem sala ativa.") });
      const room = roomManager.get(ctx.roomCode);
      if (!room) return ack({ ok: false, error: err("ROOM_NOT_FOUND", "Sala não encontrada.") });

      const result = room.submitAnswer(ctx.playerId, Number(payload?.optionIndex));
      if (!result.ok) {
        return ack({ ok: false, error: err("INVALID_PAYLOAD", result.reason) });
      }
      ack({ ok: true, correct: result.correct });
    });

    socket.on("host:playAgain", () => {
      const ctx = getContext();
      if (!ctx) return;
      const room = roomManager.get(ctx.roomCode);
      if (!room) return;
      if (!room.playAgain(ctx.playerId)) {
        socket.emit("error", err("NOT_HOST", "Só o host pode iniciar uma revanche."));
      }
    });

    socket.on("room:leave", () => {
      const ctx = getContext();
      if (!ctx) return;
      const room = roomManager.get(ctx.roomCode);
      room?.removePlayerCompletely(ctx.playerId);
      socket.leave(ctx.roomCode);
      socket.data = {};
    });

    socket.on("disconnect", () => {
      eventLimiter.clear(socket.id);
      const ctx = getContext();
      if (!ctx) return;
      const room = roomManager.get(ctx.roomCode);
      room?.handleDisconnect(ctx.playerId);
    });
  });
}
