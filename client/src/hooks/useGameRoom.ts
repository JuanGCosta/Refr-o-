import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  RoomStatus,
  PublicPlayer,
  RoomSettings,
  Genre,
  GenreChoice,
  DifficultyMode,
  RoundStartPayload,
  RoundEndPayload,
  ScoreboardEntry,
  FinishedPayload,
  ErrorPayload,
  RoomStateSnapshot,
} from "@shared/types";
import { useSocket } from "./useSocket";
import { loadSession, saveSession, clearSession } from "../services/localProfile";

interface GameRoomState {
  roomCode: string | null;
  youId: string | null;
  status: RoomStatus | null;
  players: PublicPlayer[];
  settings: RoomSettings;
  selectedGenre: GenreChoice | null;
  genreVotes: Partial<Record<GenreChoice, number>>;
  myVote: GenreChoice | null;
  totalRounds: number;
  currentRoundNumber: number;
  countdownValue: number | null;
  roundData: RoundStartPayload | null;
  answeredPlayerIds: string[];
  myAnswer: { optionIndex: number; correct: boolean } | null;
  roundResult: RoundEndPayload | null;
  scoreboard: { ranking: ScoreboardEntry[]; nextRoundIn: number } | null;
  finished: FinishedPayload | null;
  lastError: ErrorPayload | null;
}

const initialState: GameRoomState = {
  roomCode: null,
  youId: null,
  status: null,
  players: [],
  settings: { roundCount: 10, roundDurationMs: 12000, difficultyMode: "equilibrado" },
  selectedGenre: null,
  genreVotes: {},
  myVote: null,
  totalRounds: 10,
  currentRoundNumber: 0,
  countdownValue: null,
  roundData: null,
  answeredPlayerIds: [],
  myAnswer: null,
  roundResult: null,
  scoreboard: null,
  finished: null,
  lastError: null,
};

type Action =
  | { type: "SNAPSHOT"; payload: RoomStateSnapshot }
  | { type: "PLAYERS"; players: PublicPlayer[] }
  | { type: "SETTINGS"; settings: RoomSettings }
  | { type: "STATUS"; status: RoomStatus }
  | { type: "VOTES"; votes: Partial<Record<GenreChoice, number>> }
  | { type: "MY_VOTE"; genre: GenreChoice }
  | { type: "COUNTDOWN"; value: number }
  | { type: "ROUND_START"; payload: RoundStartPayload }
  | { type: "ANSWER_ACK"; playerId: string }
  | { type: "MY_ANSWER"; optionIndex: number; correct: boolean }
  | { type: "ROUND_END"; payload: RoundEndPayload }
  | { type: "SCOREBOARD"; payload: { ranking: ScoreboardEntry[]; nextRoundIn: number } }
  | { type: "FINISHED"; payload: FinishedPayload }
  | { type: "ERROR"; payload: ErrorPayload }
  | { type: "RESET" };

function reducer(state: GameRoomState, action: Action): GameRoomState {
  switch (action.type) {
    case "SNAPSHOT":
      return {
        ...state,
        roomCode: action.payload.roomCode,
        youId: action.payload.you.playerId,
        status: action.payload.status,
        players: action.payload.players,
        settings: action.payload.settings,
        selectedGenre: action.payload.selectedGenre,
        genreVotes: action.payload.genreVotes,
        totalRounds: action.payload.totalRounds,
        currentRoundNumber: action.payload.currentRound,
        lastError: null,
      };
    case "PLAYERS":
      return { ...state, players: action.players };
    case "SETTINGS":
      return {
        ...state,
        settings: action.settings,
        totalRounds: action.settings.roundCount,
      };
    case "STATUS": {
      const next: GameRoomState = { ...state, status: action.status };
      if (action.status === "GENRE_VOTING") {
        next.genreVotes = {};
        next.myVote = null;
      }
      if (action.status === "LOBBY") {
        next.roundData = null;
        next.roundResult = null;
        next.scoreboard = null;
        next.finished = null;
        next.currentRoundNumber = 0;
        next.myVote = null;
      }
      return next;
    }
    case "VOTES":
      return { ...state, genreVotes: action.votes };
    case "MY_VOTE":
      return { ...state, myVote: action.genre };
    case "COUNTDOWN":
      return { ...state, countdownValue: action.value };
    case "ROUND_START":
      return {
        ...state,
        status: "PLAYING",
        roundData: action.payload,
        currentRoundNumber: action.payload.roundNumber,
        totalRounds: action.payload.totalRounds,
        answeredPlayerIds: [],
        myAnswer: null,
        roundResult: null,
        countdownValue: null,
      };
    case "ANSWER_ACK":
      return {
        ...state,
        answeredPlayerIds: state.answeredPlayerIds.includes(action.playerId)
          ? state.answeredPlayerIds
          : [...state.answeredPlayerIds, action.playerId],
      };
    case "MY_ANSWER":
      return { ...state, myAnswer: { optionIndex: action.optionIndex, correct: action.correct } };
    case "ROUND_END":
      return { ...state, status: "ROUND_RESULT", roundResult: action.payload };
    case "SCOREBOARD":
      return { ...state, status: "SCOREBOARD", scoreboard: action.payload };
    case "FINISHED":
      return { ...state, status: "FINISHED", finished: action.payload };
    case "ERROR":
      return { ...state, lastError: action.payload };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

export function useGameRoom() {
  const { socket, connected } = useSocket();
  const [state, dispatch] = useReducer(reducer, initialState);
  const roomCodeRef = useRef<string | null>(null);

  useEffect(() => {
    roomCodeRef.current = state.roomCode;
  }, [state.roomCode]);

  useEffect(() => {
    const onPlayers = (players: PublicPlayer[]) => dispatch({ type: "PLAYERS", players });
    const onSettings = (settings: RoomSettings) => dispatch({ type: "SETTINGS", settings });
    const onStatus = (p: { status: RoomStatus }) => dispatch({ type: "STATUS", status: p.status });
    const onVotes = (votes: Partial<Record<GenreChoice, number>>) => dispatch({ type: "VOTES", votes });
    const onCountdown = (p: { value: number }) => dispatch({ type: "COUNTDOWN", value: p.value });
    const onRoundStart = (p: RoundStartPayload) => dispatch({ type: "ROUND_START", payload: p });
    const onAnswerAck = (p: { playerId: string }) => dispatch({ type: "ANSWER_ACK", playerId: p.playerId });
    const onRoundEnd = (p: RoundEndPayload) => dispatch({ type: "ROUND_END", payload: p });
    const onScoreboard = (p: { ranking: ScoreboardEntry[]; nextRoundIn: number }) =>
      dispatch({ type: "SCOREBOARD", payload: p });
    const onFinished = (p: FinishedPayload) => dispatch({ type: "FINISHED", payload: p });
    const onError = (p: ErrorPayload) => dispatch({ type: "ERROR", payload: p });
    const onClosed = () => dispatch({ type: "RESET" });

    const onReconnectAttempt = () => {
      const code = roomCodeRef.current;
      if (code) {
        const token = loadSession(code);
        if (token) socket.emit("room:reconnect", { code, sessionToken: token }, () => {});
      }
    };

    socket.on("room:update", onPlayers);
    socket.on("room:settingsUpdate", onSettings);
    socket.on("room:status", onStatus);
    socket.on("genre:votesUpdate", onVotes);
    socket.on("game:countdown", onCountdown);
    socket.on("round:start", onRoundStart);
    socket.on("round:answerAck", onAnswerAck);
    socket.on("round:end", onRoundEnd);
    socket.on("scoreboard:update", onScoreboard);
    socket.on("game:finished", onFinished);
    socket.on("error", onError);
    socket.on("room:closed", onClosed);
    socket.on("connect", onReconnectAttempt);

    return () => {
      socket.off("room:update", onPlayers);
      socket.off("room:settingsUpdate", onSettings);
      socket.off("room:status", onStatus);
      socket.off("genre:votesUpdate", onVotes);
      socket.off("game:countdown", onCountdown);
      socket.off("round:start", onRoundStart);
      socket.off("round:answerAck", onAnswerAck);
      socket.off("round:end", onRoundEnd);
      socket.off("scoreboard:update", onScoreboard);
      socket.off("game:finished", onFinished);
      socket.off("error", onError);
      socket.off("room:closed", onClosed);
      socket.off("connect", onReconnectAttempt);
    };
  }, [socket]);

  const createRoom = useCallback(
    (name: string, avatarId: string) =>
      new Promise<{ ok: boolean; error?: ErrorPayload }>((resolve) => {
        socket.emit("room:create", { name, avatarId }, (res) => {
          if (res.ok) {
            dispatch({ type: "SNAPSHOT", payload: res.snapshot });
            saveSession(res.snapshot.roomCode, res.snapshot.you.sessionToken);
            resolve({ ok: true });
          } else {
            dispatch({ type: "ERROR", payload: res.error });
            resolve({ ok: false, error: res.error });
          }
        });
      }),
    [socket]
  );

  const joinRoom = useCallback(
    (code: string, name: string, avatarId: string) =>
      new Promise<{ ok: boolean; error?: ErrorPayload }>((resolve) => {
        socket.emit("room:join", { code, name, avatarId }, (res) => {
          if (res.ok) {
            dispatch({ type: "SNAPSHOT", payload: res.snapshot });
            saveSession(res.snapshot.roomCode, res.snapshot.you.sessionToken);
            resolve({ ok: true });
          } else {
            dispatch({ type: "ERROR", payload: res.error });
            resolve({ ok: false, error: res.error });
          }
        });
      }),
    [socket]
  );

  const attemptReconnect = useCallback(
    (code: string) =>
      new Promise<boolean>((resolve) => {
        const token = loadSession(code);
        if (!token) return resolve(false);
        socket.emit("room:reconnect", { code, sessionToken: token }, (res) => {
          if (res.ok) {
            dispatch({ type: "SNAPSHOT", payload: res.snapshot });
            resolve(true);
          } else {
            clearSession(code);
            resolve(false);
          }
        });
      }),
    [socket]
  );

  const setReady = useCallback((ready: boolean) => socket.emit("player:ready", { ready }), [socket]);
  const setRounds = useCallback(
    (roundCount: number) => {
      // Optimistic update so the selected button responds instantly; the server
      // broadcasts the authoritative value back to every player in the room.
      dispatch({ type: "SETTINGS", settings: { ...state.settings, roundCount } });
      socket.emit("host:setRounds", { roundCount });
    },
    [socket, state.settings]
  );
  const setRoundDuration = useCallback((roundDurationMs: number) => {
    dispatch({ type: "SETTINGS", settings: { ...state.settings, roundDurationMs } });
    socket.emit("host:setRoundDuration", { roundDurationMs });
  }, [socket, state.settings]);
  const setDifficulty = useCallback((difficultyMode: DifficultyMode) => {
    dispatch({ type: "SETTINGS", settings: { ...state.settings, difficultyMode } });
    socket.emit("host:setDifficulty", { difficultyMode });
  }, [socket, state.settings]);
  const voteGenre = useCallback(
    (genre: GenreChoice) => {
      dispatch({ type: "MY_VOTE", genre });
      socket.emit("genre:vote", { genre });
    },
    [socket]
  );
  const finishVoting = useCallback(() => socket.emit("host:finishVoting"), [socket]);
  const startGame = useCallback(() => socket.emit("host:startGame"), [socket]);
  const playAgain = useCallback(() => socket.emit("host:playAgain"), [socket]);

  const submitAnswer = useCallback(
    (optionIndex: number) =>
      new Promise<{ ok: boolean; correct?: boolean }>((resolve) => {
        socket.emit("answer:submit", { optionIndex }, (res) => {
          if (res.ok) {
            dispatch({ type: "MY_ANSWER", optionIndex, correct: res.correct });
            resolve({ ok: true, correct: res.correct });
          } else {
            resolve({ ok: false });
          }
        });
      }),
    [socket]
  );

  const leaveRoom = useCallback(() => {
    if (state.roomCode) clearSession(state.roomCode);
    socket.emit("room:leave");
    dispatch({ type: "RESET" });
  }, [socket, state.roomCode]);

  return {
    state,
    connected,
    createRoom,
    joinRoom,
    attemptReconnect,
    setReady,
    setRounds,
    setRoundDuration,
    setDifficulty,
    voteGenre,
    finishVoting,
    startGame,
    submitAnswer,
    playAgain,
    leaveRoom,
  };
}

export type GameRoomApi = ReturnType<typeof useGameRoom>;
