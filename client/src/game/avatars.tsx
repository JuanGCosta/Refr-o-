
export const AVATAR_IDS = Array.from({ length: 17 }, (_, i) => `avatar-${String(i + 1).padStart(2, "0")}`);

const AVATAR_LABELS: Record<string, string> = {
  "avatar-01": "Zebra",
  "avatar-02": "Morcego",
  "avatar-03": "Cachorro",
  "avatar-04": "Arara",
  "avatar-05": "Raposa",
  "avatar-06": "Panda",
  "avatar-07": "Unicórnio",
  "avatar-08": "Coala",
  "avatar-09": "Cavalo",
  "avatar-10": "Rato",
  "avatar-11": "Boi soberano",
  "avatar-12": "Vaca",
  "avatar-13": "Lagartixa",
  "avatar-14": "Coelho",
  "avatar-15": "Macaco",
  "avatar-16": "Esquilo",
  "avatar-17": "Lontra",
};

export function randomAvatarId(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return AVATAR_IDS[value[0] % AVATAR_IDS.length];
  }
  return AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)];
}

export function AvatarGraphic({ id, className = "" }: { id: string; className?: string }) {
  const safeId = AVATAR_IDS.includes(id) ? id : AVATAR_IDS[0];
  return (
    <img
      src={`/assets/avatars/${safeId}.webp`}
      alt={AVATAR_LABELS[safeId] ?? "Avatar"}
      draggable={false}
      loading="eager"
      className={`select-none object-contain ${className}`}
    />
  );
}

export function avatarLabel(id: string) {
  return AVATAR_LABELS[id] ?? "Avatar";
}
