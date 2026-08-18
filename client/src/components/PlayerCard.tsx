import React from "react";
import { motion } from "framer-motion";
import { Crown, Check, WifiOff } from "lucide-react";
import { PublicPlayer } from "@shared/types";
import { AvatarGraphic } from "../game/avatars";

export function PlayerCard({ player, showReady = true, highlight = false }: { player: PublicPlayer; showReady?: boolean; highlight?: boolean; }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: player.connected ? 1 : .45, y: 0 }} className={`player-card ${highlight ? "is-you" : ""}`}>
      <div className="player-avatar-wrap">
        <AvatarGraphic id={player.avatarId} className="w-full h-full" />
        {player.isHost && <span className="host-crown" title="Host"><Crown size={13} strokeWidth={2.5}/></span>}
        {!player.connected && <span className="offline-mark"><WifiOff size={11}/></span>}
      </div>
      <div className="player-copy"><strong>{player.name}</strong><span>{player.connected ? (player.isHost ? "Host" : "Jogador") : "Desconectado"}</span></div>
      {showReady && <div className={`ready-mark ${player.isReady ? "is-ready" : ""}`}><Check size={15} strokeWidth={3}/></div>}
    </motion.div>
  );
}
