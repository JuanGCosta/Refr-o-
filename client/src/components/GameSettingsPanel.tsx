import React from "react";
import { Gauge, Timer, Layers3, Sparkles, Brain, Flame } from "lucide-react";
import { DifficultyMode, DIFFICULTY_LABELS, ROUND_DURATION_OPTIONS_MS } from "@shared/types";
import { RoundsPicker } from "./RoundsPicker";

const DIFFICULTY_META: Record<DifficultyMode, { icon: React.ElementType; text: string }> = {
  facil: { icon: Sparkles, text: "Hits conhecidos e alternativas mais amigáveis" },
  equilibrado: { icon: Gauge, text: "Mistura justa de hits e faixas menos óbvias" },
  dificil: { icon: Brain, text: "Faixas mais difíceis e alternativas mais parecidas" },
  misturado: { icon: Flame, text: "A dificuldade muda de música para música" },
};

export function GameSettingsPanel({ rounds, durationMs, difficulty, onRounds, onDuration, onDifficulty }: { rounds: number; durationMs: number; difficulty: DifficultyMode; onRounds: (n: number) => void; onDuration: (n: number) => void; onDifficulty: (m: DifficultyMode) => void; }) {
  return (
    <section className="settings-panel game-panel">
      <div className="settings-panel-head"><div><p className="eyebrow">Partida personalizada</p><h2>Monte o ritmo do jogo</h2></div><span><Layers3 size={14}/> Host controla</span></div>
      <div className="settings-grid">
        <div className="settings-block"><RoundsPicker value={rounds} onChange={onRounds}/></div>
        <div className="settings-block"><div className="settings-title"><Timer size={15}/> Tempo para responder</div><div className="choice-row">{ROUND_DURATION_OPTIONS_MS.map(ms=><button key={ms} type="button" onClick={()=>onDuration(ms)} className={`choice-chip ${durationMs===ms?"is-active":""}`}>{ms/1000}s</button>)}</div><p className="settings-help">A música continua na revelação. Esse tempo vale só para responder.</p></div>
        <div className="settings-block settings-block-wide"><div className="settings-title"><Gauge size={15}/> Dificuldade</div><div className="difficulty-grid">{(Object.keys(DIFFICULTY_META) as DifficultyMode[]).map(mode=>{const MetaIcon=DIFFICULTY_META[mode].icon;return <button key={mode} type="button" onClick={()=>onDifficulty(mode)} className={`difficulty-card ${difficulty===mode?"is-active":""}`}><MetaIcon size={19}/><span><strong>{DIFFICULTY_LABELS[mode]}</strong><small>{DIFFICULTY_META[mode].text}</small></span></button>})}</div></div>
      </div>
    </section>
  );
}
