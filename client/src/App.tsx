import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameRoom } from "./hooks/useGameRoom";
import { useSound } from "./hooks/useSound";
import { useRoundMusic } from "./hooks/useRoundMusic";
import { useBackendHealth } from "./hooks/useBackendHealth";
import { loadProfile, saveProfile } from "./services/localProfile";
import { SoundToggle } from "./components/SoundToggle";
import { ErrorToast } from "./components/Toast";
import { GameExitButton } from "./components/GameExitButton";
import { HomePage } from "./pages/HomePage";
import { NameEntryPage } from "./pages/NameEntryPage";
import { AvatarSelectPage } from "./pages/AvatarSelectPage";
import { LobbyPage } from "./pages/LobbyPage";
import { GenreVotingPage } from "./pages/GenreVotingPage";
import { CountdownOverlay } from "./pages/CountdownOverlay";
import { RoundPage } from "./pages/RoundPage";
import { RoundResultPage } from "./pages/RoundResultPage";
import { ScoreboardPage } from "./pages/ScoreboardPage";
import { FinalResultsPage } from "./pages/FinalResultsPage";
import { ReconnectingOverlay } from "./pages/ReconnectingOverlay";

type LocalView = "home" | "name" | "avatar";
type PendingAction = { type: "create" } | { type: "join"; code: string };

function roomCodeFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/sala\/([A-Za-z0-9]{5})$/);
  return match ? match[1].toUpperCase() : null;
}

export default function App() {
  const game = useGameRoom();
  const sound = useSound();
  const backendHealth = useBackendHealth();
  const music = useRoundMusic(game.state.roundData, game.state.status, sound.enabled, sound.volume);
  const profile = loadProfile();

  const [localView, setLocalView] = useState<LocalView>("home");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [name, setName] = useState(profile?.name ?? "");
  const [joining, setJoining] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [urlCode, setUrlCode] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    const code = roomCodeFromUrl();
    if (!code) return;
    game.attemptReconnect(code).then((ok) => {
      if (!ok) {
        setUrlCode(code);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (game.state.roomCode) {
      const url = `/sala/${game.state.roomCode}`;
      if (window.location.pathname !== url) window.history.replaceState({}, "", url);
    }
  }, [game.state.roomCode]);

  useEffect(() => {
    if (game.state.lastError) {
      setToast(game.state.lastError.message);
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [game.state.lastError]);

  const resetToHome = () => {
    window.history.replaceState({}, "", "/");
    setLocalView("home");
    setPendingAction(null);
  };

  const handleLeave = () => {
    music.stop();
    game.leaveRoom();
    resetToHome();
  };

  const handleAvatarConfirm = async (avatarId: string) => {
    setJoining(true);
    saveProfile({ name, avatarId });
    if (pendingAction?.type === "create") {
      await game.createRoom(name, avatarId);
    } else if (pendingAction?.type === "join") {
      await game.joinRoom(pendingAction.code, name, avatarId);
    }
    setJoining(false);
  };

  const inRoom = !!game.state.roomCode && !!game.state.status;
  const showReconnecting = inRoom && !game.connected;

  let content: React.ReactNode = null;

  if (!inRoom) {
    if (localView === "home") {
      content = (
        <HomePage
          initialCode={urlCode ?? undefined}
          serverReady={backendHealth === "ready"}
          serverConnected={game.connected}
          onCreate={() => {
            setPendingAction({ type: "create" });
            setLocalView("name");
          }}
          onJoin={(code) => {
            setPendingAction({ type: "join", code });
            setLocalView("name");
          }}
        />
      );
    } else if (localView === "name") {
      content = (
        <NameEntryPage
          initialName={name}
          onBack={() => setLocalView("home")}
          onNext={(n) => {
            setName(n);
            setLocalView("avatar");
          }}
        />
      );
    } else {
      content = (
        <AvatarSelectPage
          initialAvatarId={profile?.avatarId}
          onBack={() => setLocalView("name")}
          onConfirm={handleAvatarConfirm}
          loading={joining}
        />
      );
    }
  } else {
    switch (game.state.status) {
      case "LOBBY":
        content = <LobbyPage game={game} onLeave={handleLeave} />;
        break;
      case "GENRE_VOTING":
        content = <GenreVotingPage game={game} />;
        break;
      case "COUNTDOWN":
        content = (
          <CountdownOverlay
            value={game.state.countdownValue}
            roundNumber={game.state.currentRoundNumber + 1}
            totalRounds={game.state.totalRounds}
            sound={sound}
          />
        );
        break;
      case "PLAYING":
        content = <RoundPage game={game} sound={sound} music={music} />;
        break;
      case "ROUND_RESULT":
        content = <RoundResultPage game={game} sound={sound} />;
        break;
      case "SCOREBOARD":
        content = <ScoreboardPage game={game} />;
        break;
      case "FINISHED":
        content = <FinalResultsPage game={game} sound={sound} onExit={handleLeave} />;
        break;
      default:
        content = null;
    }
  }

  return (
    <>
      <SoundToggle enabled={sound.enabled} onToggle={() => sound.setEnabled(!sound.enabled)} />
      <div className="relative min-h-screen">
        <AnimatePresence>
          <motion.div
            key={inRoom ? game.state.status ?? "room" : localView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            className="absolute inset-0"
            transition={{ duration: 0.25 }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </div>
      {inRoom && game.state.status !== "LOBBY" && game.state.status !== "FINISHED" && (
        <GameExitButton onExit={handleLeave} />
      )}
      {showReconnecting && <ReconnectingOverlay />}
      <ErrorToast message={toast} />
    </>
  );
}
