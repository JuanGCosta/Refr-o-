import React, { useEffect, useState } from "react";
import { Layers3 } from "lucide-react";
import { MIN_ROUNDS, MAX_ROUNDS } from "@shared/types";
const PRESETS=[5,10,15,20,30];
export function RoundsPicker({value,onChange,disabled}:{value:number;onChange:(n:number)=>void;disabled?:boolean}){
 const custom=!PRESETS.includes(value); const [draft,setDraft]=useState(custom?String(value):"");
 useEffect(()=>{if(custom)setDraft(String(value));},[value,custom]);
 const commit=()=>{const n=Number(draft);if(Number.isInteger(n)&&n>=MIN_ROUNDS&&n<=MAX_ROUNDS)onChange(n)};
 return <div className="w-full"><div className="settings-title"><Layers3 size={15}/> Quantidade de rodadas</div><div className="choice-row rounds-row">
 {PRESETS.map(n=><button key={n} type="button" disabled={disabled} onClick={()=>{setDraft("");onChange(n)}} className={`choice-chip ${value===n?'is-active':''}`}>{n}</button>)}
 <div className={`custom-rounds ${custom?'is-active':''}`}><input aria-label="Quantidade personalizada de rodadas" type="number" min={MIN_ROUNDS} max={MAX_ROUNDS} disabled={disabled} value={draft} placeholder="Outro" onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter"){commit();e.currentTarget.blur()}}}/></div>
 </div></div>
}
