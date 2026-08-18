import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { ScoreboardEntry } from "@shared/types";
import { AvatarGraphic } from "../game/avatars";
import { ScoreCountUp } from "./ScoreCountUp";

const HEIGHT: Record<number, string> = { 1: "h-28 sm:h-36 md:h-40", 2: "h-20 sm:h-28 md:h-32", 3: "h-16 sm:h-24 md:h-28" };

function PodiumBlock({ entry, place, delay }: { entry: ScoreboardEntry; place: number; delay: number }) {
  return (
    <div className={`podium-block place-${place}`}>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + .2 }} className="podium-person-card">
        <div className="podium-avatar">
          <AvatarGraphic id={entry.avatarId} className="w-full h-full" />
          {place === 1 && <Crown className="podium-crown" size={25} fill="currentColor" />}
        </div>
        <strong>{entry.name}</strong>
        <span><ScoreCountUp value={entry.score}/><small> pts</small></span>
      </motion.div>
      <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay, type: "spring", stiffness: 120, damping: 16 }} style={{ originY: 1 }} className={`podium-base ${HEIGHT[place]}`}>
        <b>{place}º</b>
      </motion.div>
    </div>
  );
}

export function Podium({ ranking }: { ranking: ScoreboardEntry[] }) {
  const [first, second, third, ...rest] = ranking;
  return (
    <div className="podium-wrap">
      <div className="podium-main">
        {second && <PodiumBlock entry={second} place={2} delay={.13}/>} 
        {first && <PodiumBlock entry={first} place={1} delay={0}/>} 
        {third && <PodiumBlock entry={third} place={3} delay={.26}/>} 
      </div>
      {rest.length > 0 && <div className="podium-rest">{rest.map(entry=><div key={entry.playerId}><span>{entry.rank}º</span><AvatarGraphic id={entry.avatarId} className="w-9 h-9"/><strong>{entry.name}</strong><b><ScoreCountUp value={entry.score}/></b></div>)}</div>}
    </div>
  );
}
