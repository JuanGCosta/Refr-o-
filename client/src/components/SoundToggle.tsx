import { Volume2, VolumeX } from "lucide-react";

export function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={enabled ? "Desativar sons" : "Ativar sons"}
      className={`sound-toggle ${enabled ? "is-on" : ""}`}
    >
      {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
