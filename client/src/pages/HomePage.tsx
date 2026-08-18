import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, DoorOpen, Headphones, Users, Timer, Trophy, Shuffle, Code2, ListMusic, Sparkles, Radio, UserRound, Globe2 } from "lucide-react";
import { Logo, Tagline } from "../components/Logo";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { normalizeCode } from "../utils/format";

export function HomePage({onCreate,onJoin,initialCode,serverReady=true,serverConnected=true}:{onCreate:()=>void;onJoin:(code:string)=>void;initialCode?:string;serverReady?:boolean;serverConnected?:boolean}) {
  const [code,setCode]=useState(initialCode??"");
  return (
    <div className="home-screen screen-pad min-h-screen">
      <span className="ambient-orb ambient-a"/><span className="ambient-orb ambient-b"/><span className="ambient-orb ambient-c"/>
      <div className="home-layout">
        <motion.section initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.38}} className="home-action game-panel order-1 lg:order-2">
          <div className="home-action-head">
            <span className="mini-live"><Radio size={13}/> Partida instantânea</span>
            <h2>Pronto para testar seu ouvido?</h2>
            <p>Crie uma sala em segundos ou entre usando o código dos seus amigos.</p>
          </div>
          <Button size="lg" onClick={onCreate} disabled={!serverReady || !serverConnected} className="w-full home-primary">Criar nova sala <ArrowRight size={20}/></Button>
          <div className="home-divider"><span/>ou<span/></div>
          <form className="flex flex-col gap-3" onSubmit={(e)=>{e.preventDefault();if(code.trim().length>=4 && serverReady && serverConnected) onJoin(normalizeCode(code));}}>
            <TextField label="Código da sala" placeholder="AB7K2" value={code} maxLength={5} onChange={(e)=>setCode(normalizeCode(e.target.value))} className="room-code-input" inputMode="text" autoCapitalize="characters" />
            <Button type="submit" variant="secondary" size="lg" disabled={code.trim().length<4 || !serverReady || !serverConnected} className="w-full"><DoorOpen size={19}/>Entrar na sala</Button>
          </form>
          <div className="solo-hint"><Headphones size={15}/><span>Quer testar antes? Você também pode jogar sozinho.</span></div>
          {(!serverReady || !serverConnected) && <div className="server-warmup"><span className="server-dot"/><span>{!serverConnected ? "Conectando ao servidor..." : "Preparando o catálogo musical..."}</span></div>}
        </motion.section>

        <motion.section initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:.05,duration:.42}} className="home-brand order-2 lg:order-1">
          <div className="brand-badge"><Sparkles size={14}/> O duelo musical em tempo real</div>
          <Logo size="lg" className="home-logo"/>
          <h1>Reconheceu a música? <span>Então corre.</span></h1>
          <Tagline className="home-tagline"/>
          <div className="home-features">
            <span className="home-pill"><Users size={15}/> Até 4 jogadores</span>
            <span className="home-pill"><Timer size={15}/> Tempo configurável</span>
            <span className="home-pill"><Trophy size={15}/> Pontos por velocidade</span>
            <span className="home-pill"><Shuffle size={15}/> Sorteio aleatório</span>
            <span className="home-pill"><ListMusic size={15}/> Catálogo 1.300+</span>
            <span className="home-pill"><Globe2 size={15}/> Pop internacional</span>
            <span className="home-pill"><UserRound size={15}/> Modo Artista</span>
          </div>
          <div className="developer-credit" aria-label="Desenvolvido por JG.Dev"><Code2 size={13}/><span>Desenvolvido por</span><strong>JG.Dev</strong></div>
        </motion.section>
      </div>
    </div>
  );
}
