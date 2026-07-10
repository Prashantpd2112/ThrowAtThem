/**
 * Single source of truth mapping throwable object IDs to their sound file paths.
 * Add new objects here when new sounds are added.
 */
const SOUND_MAP: Record<string, string> = {
  tomato: "/sounds/tomato.mp3",
  egg: "/sounds/egg.mp3",
  cake: "/sounds/cake.mp3",
  poop: "/sounds/poop.mp3",
  heart: "/sounds/heart.mp3",
  money: "/sounds/money.mp3",
  rock: "/sounds/rock.mp3",
  thumbs_up: "/sounds/thumbs_up.mp3",
};

/**
 * Volume level for impact sounds (0.0 – 1.0).
 */
const DEFAULT_VOLUME = 0.5;

/**
 * Pre-loaded Audio buffers keyed by sound path.
 */
const audioCache = new Map<string, HTMLAudioElement>();

/**
 * Pre-loads all known sounds into the audio cache so they play with
 * near-zero latency on first impact.
 */
export function preloadSounds(): void {
  for (const path of Object.values(SOUND_MAP)) {
    if (!audioCache.has(path)) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = path;
      audioCache.set(path, audio);
    }
  }
}

/**
 * Plays the impact sound for a given throwable object ID.
 *
 * - Clones the Audio instance so rapid consecutive throws don't interrupt each other.
 * - Silently ignores unknown / custom object IDs (no crash, no console error).
 * - Catches and suppresses any playback errors so the animation never blocks.
 *
 * @param objectId - The throwable object's id (e.g. "tomato", "heart").
 */
export function playImpactSound(objectId: string): void {
  const path = SOUND_MAP[objectId];
  if (!path) return; // Unknown or custom emoji — no sound, no error.

  try {
    // Get the pre-loaded audio and clone it so multiple throws can overlap.
    const cached = audioCache.get(path);
    if (!cached) {
      // Fallback: create a fresh audio element (shouldn't happen if preloadSounds ran).
      const fresh = new Audio(path);
      fresh.volume = DEFAULT_VOLUME;
      fresh.play().catch(() => {
        /* silent fail — never break the animation */
      });
      return;
    }

    const clone = cached.cloneNode() as HTMLAudioElement;
    clone.volume = DEFAULT_VOLUME;
    clone.play().catch(() => {
      /* silent fail — never break the animation */
    });
  } catch {
    /* total silent fail — never break the animation */
  }
}