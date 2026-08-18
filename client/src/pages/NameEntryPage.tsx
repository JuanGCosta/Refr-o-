import React,{useState} from "react";
import {motion} from "framer-motion";
import {ArrowRight,ArrowLeft,UserRound,ShieldCheck} from"lucide-react";
import {Button} from"../components/Button";
import {TextField} from"../components/TextField";
import {Logo} from"../components/Logo";
import {MAX_NAME_LENGTH} from"@shared/types";

export function NameEntryPage({initialName,onBack,onNext}:{initialName:string;onBack:()=>void;onNext:(name:string)=>void}){
  const [name,setName]=useState(initialName);
  const valid=name.trim().length>=2;
  return (
    <div className="profile-screen screen-pad min-h-screen">
      <div className="profile-wrap">
        <Logo size="sm"/>
        <motion.form initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} onSubmit={e=>{e.preventDefault();if(valid)onNext(name.trim())}} className="profile-card game-panel">
          <div className="profile-icon"><UserRound size={24}/></div>
          <p className="eyebrow">Perfil · etapa 1 de 2</p>
          <h1>Como devemos te chamar?</h1>
          <p>Esse nome aparece para todo mundo dentro da sala.</p>
          <TextField autoFocus placeholder="Seu nome" value={name} maxLength={MAX_NAME_LENGTH} onChange={e=>setName(e.target.value)} className="text-center font-semibold" autoComplete="nickname"/>
          <div className="profile-tip"><ShieldCheck size={14}/> Nada de cadastro. É só escolher um nome e jogar.</div>
          <div className="profile-actions"><Button type="button" variant="ghost" onClick={onBack} className="back-square"><ArrowLeft size={18}/></Button><Button type="submit" size="lg" disabled={!valid} className="flex-1">Escolher avatar<ArrowRight size={19}/></Button></div>
        </motion.form>
      </div>
    </div>
  );
}
