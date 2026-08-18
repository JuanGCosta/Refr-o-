import React from "react";
import { motion } from "framer-motion";
import { Shuffle, Check } from "lucide-react";
import { AVATAR_IDS, AvatarGraphic, avatarLabel, randomAvatarId } from "../game/avatars";

export function AvatarPicker({ value, onChange, takenIds = [] }: { value: string; onChange: (id: string) => void; takenIds?: string[] }) {
  return (
    <div className="avatar-picker game-panel w-full max-w-2xl">
      <div className="avatar-grid">
        {AVATAR_IDS.map((id) => {
          const selected = id === value;
          const taken = takenIds.includes(id) && !selected;
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => !taken && onChange(id)}
              whileTap={!taken ? { scale: .94 } : undefined}
              whileHover={!taken ? { y: -3 } : undefined}
              className={`avatar-option ${selected ? "is-selected" : ""} ${taken ? "is-taken" : ""}`}
              aria-label={`Escolher ${avatarLabel(id)}`}
              aria-pressed={selected}
              disabled={taken}
            >
              <span className="avatar-option-art"><AvatarGraphic id={id} className="w-full h-full" /></span>
              <span className="avatar-option-name">{avatarLabel(id)}</span>
              {selected && <span className="avatar-check"><Check size={13} strokeWidth={3}/></span>}
            </motion.button>
          );
        })}
      </div>
      <button type="button" onClick={() => onChange(randomAvatarId())} className="avatar-random">
        <Shuffle size={16}/> Escolher aleatório
      </button>
    </div>
  );
}
