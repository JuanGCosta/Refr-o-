import React from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Minus, Radio, Trophy } from "lucide-react";
import { AvatarGraphic } from "../game/avatars";
import { ScoreCountUp } from "../components/ScoreCountUp";
import { GameRoomApi } from "../hooks/useGameRoom";

export function ScoreboardPage({game}:{game:GameRoomApi}){
  const { state } = game;
  const board = state.scoreboard;
  if(!board) return null;
  return (
    <div className="score-screen screen-pad min-h-screen">
      <div className="score-shell">
        <div className="score-head">
          <span className="section-icon large"><Trophy size={22}/></span>
          <p className="eyebrow">Depois de {state.currentRoundNumber} rodadas</p>
          <h1>Placar ao vivo</h1>
          <p>A disputa muda a cada música.</p>
        </div>
        <motion.div layout className="scoreboard-card game-panel">
          {board.ranking.map(entry=>{
            const delta=entry.previousRank!==null?entry.previousRank-entry.rank:0;
            return (
              <motion.div layout key={entry.playerId} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className={`score-row ${entry.playerId===state.youId?"is-me":""} ${entry.rank===1?"is-first":""}`}>
                <span className="score-rank">{entry.rank}</span>
                <div className="score-avatar-wrap"><AvatarGraphic id={entry.avatarId} className="w-full h-full"/></div>
                <div className="score-name"><strong>{entry.name}</strong><small>{entry.playerId===state.youId?"Você":"Jogador"}</small></div>
                <span className={`score-delta ${delta>0?"up":delta<0?"down":""}`}>{delta!==0?(delta>0?<><ArrowUp size={13}/>{Math.abs(delta)}</>:<><ArrowDown size={13}/>{Math.abs(delta)}</>):<Minus size={14}/>}</span>
                <span className="score-points"><ScoreCountUp value={entry.score}/><small>pts</small></span>
              </motion.div>
            );
          })}
        </motion.div>
        <div className="next-round-pill"><Radio size={14} className="animate-pulse"/> Próxima música entrando...</div>
      </div>
    </div>
  );
}
