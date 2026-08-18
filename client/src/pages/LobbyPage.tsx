import React from "react";
import { motion } from "framer-motion";
import { LogOut, Play, UserRound, Users, Radio, Settings2, Crown } from "lucide-react";
import { Logo } from "../components/Logo";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { PlayerCard } from "../components/PlayerCard";
import { Button } from "../components/Button";
import { GameSettingsPanel } from "../components/GameSettingsPanel";
import { MAX_PLAYERS } from "@shared/types";
import { GameRoomApi } from "../hooks/useGameRoom";

export function LobbyPage({ game, onLeave }: { game: GameRoomApi; onLeave: () => void }) {
  const { state } = game;
  const me = state.players.find((p) => p.id === state.youId);
  const isHost = !!me?.isHost;
  const connectedCount = state.players.filter((p) => p.connected).length;
  const canStart = isHost && connectedCount >= 1;
  const isSoloTest = isHost && connectedCount === 1;

  return (
    <div className="lobby-screen screen-pad min-h-screen">
      <div className="page-container">
        <header className="game-topbar">
          <Logo size="sm" />
          <div className="game-topbar-center"><span className="live-dot"/><span>Sala ao vivo</span><b>{connectedCount}/{MAX_PLAYERS}</b></div>
          <button onClick={onLeave} className="icon-text-button"><LogOut size={16}/><span>Sair</span></button>
        </header>

        <div className="lobby-layout">
          <section className="game-panel lobby-room-card">
            <div className="lobby-room-head">
              <span className="section-icon"><Radio size={18}/></span>
              <div><p className="eyebrow">Convide a galera</p><h1>Sua sala está pronta</h1></div>
            </div>
            <RoomCodeBadge code={state.roomCode ?? ""}/>
            <div className="lobby-status-line"><Users size={16}/><span>{connectedCount === 1 ? "Você está sozinho por enquanto" : `${connectedCount} jogadores conectados`}</span></div>
            {isSoloTest && <div className="solo-badge"><UserRound size={15}/> Modo solo liberado para testes</div>}
            {isHost && <div className="host-note"><Crown size={14}/> Você é o host e controla as configurações.</div>}
          </section>

          <section className="lobby-main">
            <div className="lobby-section-title"><div><p className="eyebrow">Jogadores</p><h2>Quem vai disputar?</h2></div><span>{connectedCount}/{MAX_PLAYERS}</span></div>
            <motion.div layout className="players-grid">
              {state.players.map((p) => <PlayerCard key={p.id} player={p} highlight={p.id === state.youId}/>) }
              {Array.from({length: Math.max(0, MAX_PLAYERS-state.players.length)}).map((_,i)=><div key={i} className="empty-player"><span>+</span>Aguardando jogador</div>)}
            </motion.div>

            {isHost && <div className="settings-title-inline"><Settings2 size={16}/><span>Configurações da partida</span></div>}
            {isHost && <GameSettingsPanel rounds={state.settings.roundCount} durationMs={state.settings.roundDurationMs} difficulty={state.settings.difficultyMode} onRounds={game.setRounds} onDuration={game.setRoundDuration} onDifficulty={game.setDifficulty}/>} 
            {!isHost && <Button size="lg" variant={me?.isReady ? "secondary" : "primary"} onClick={()=>game.setReady(!me?.isReady)} className="w-full">{me?.isReady ? "Pronto para jogar" : "Estou pronto"}</Button>}
            {isHost && <div className="lobby-start-wrap"><Button size="lg" onClick={game.startGame} disabled={!canStart} className="w-full"><Play size={20}/>{isSoloTest ? "Começar teste solo" : "Iniciar partida"}</Button><p>{isSoloTest ? "Você pode testar todo o fluxo sozinho." : "Quando estiver todo mundo pronto, começa o duelo."}</p></div>}
          </section>
        </div>
      </div>
    </div>
  );
}
