const PROFILE_KEY = "refrao:profile";
const SESSION_PREFIX = "refrao:session:";
const SOUND_KEY = "refrao:sound";

export interface LocalProfile {
  name: string;
  avatarId: string;
}

export function loadProfile(): LocalProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as LocalProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: LocalProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function saveSession(roomCode: string, sessionToken: string): void {
  try {
    localStorage.setItem(`${SESSION_PREFIX}${roomCode}`, sessionToken);
  } catch {
    /* ignore */
  }
}

export function loadSession(roomCode: string): string | null {
  try {
    return localStorage.getItem(`${SESSION_PREFIX}${roomCode}`);
  } catch {
    return null;
  }
}

export function clearSession(roomCode: string): void {
  try {
    localStorage.removeItem(`${SESSION_PREFIX}${roomCode}`);
  } catch {
    /* ignore */
  }
}

export interface SoundPrefs {
  enabled: boolean;
  volume: number;
}

export function loadSoundPrefs(): SoundPrefs {
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    if (!raw) return { enabled: true, volume: 0.7 };
    return { enabled: true, volume: 0.7, ...JSON.parse(raw) };
  } catch {
    return { enabled: true, volume: 0.7 };
  }
}

export function saveSoundPrefs(prefs: SoundPrefs): void {
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
