import React, { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

export function RoomCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const markCopied = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const copyCode = async () => { try { await navigator.clipboard.writeText(code); markCopied(); } catch {} };
  const shareLink = async () => {
    const url = `${window.location.origin}/sala/${code}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Refrão", text: `Entra na minha sala do Refrão: ${code}`, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); markCopied(); } catch {}
  };
  return (
    <div className="room-code-block">
      <span className="room-code-label">Código da sala</span>
      <div className="room-code-digits">
        {code.split("").map((ch, i) => <span key={i}>{ch}</span>)}
      </div>
      <div className="room-code-actions">
        <button onClick={copyCode}>{copied ? <Check size={14} className="text-mint"/> : <Copy size={14}/>} {copied ? "Copiado!" : "Copiar código"}</button>
        <button onClick={shareLink}><Share2 size={14}/> Compartilhar link</button>
      </div>
    </div>
  );
}
