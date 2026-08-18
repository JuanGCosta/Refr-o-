import {useState} from"react";
import {motion}from"framer-motion";
import{ArrowRight,ArrowLeft,Sparkles}from"lucide-react";
import{Button}from"../components/Button";
import{AvatarPicker}from"../components/AvatarPicker";
import{randomAvatarId,AvatarGraphic,avatarLabel}from"../game/avatars";
import{Logo}from"../components/Logo";

export function AvatarSelectPage({initialAvatarId,onBack,onConfirm,loading}:{initialAvatarId?:string;onBack:()=>void;onConfirm:(avatarId:string)=>void;loading?:boolean}){
  const [avatarId,setAvatarId]=useState(initialAvatarId??randomAvatarId());
  return (
    <div className="avatar-screen screen-pad min-h-screen">
      <div className="avatar-page-wrap">
        <Logo size="sm"/>
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="avatar-page-head">
          <div className="avatar-preview"><AvatarGraphic id={avatarId} className="w-full h-full"/></div>
          <div><p className="eyebrow">Perfil · etapa 2 de 2</p><h1>Escolha sua identidade</h1><p>Você será <strong>{avatarLabel(avatarId)}</strong> durante essa partida.</p></div>
        </motion.div>
        <AvatarPicker value={avatarId} onChange={setAvatarId}/>
        <div className="avatar-actions"><Button variant="ghost" onClick={onBack} className="back-square"><ArrowLeft size={18}/></Button><Button size="lg" onClick={()=>onConfirm(avatarId)} disabled={loading} className="flex-1">{loading?"Entrando...":"Entrar na sala"}{!loading&&<ArrowRight size={19}/>}</Button></div>
        <div className="avatar-footnote"><Sparkles size={13}/> 17 avatares exclusivos do Refrão</div>
      </div>
    </div>
  );
}
