import { ThrowableObject } from "@/lib/types";

/**
 * Single source of truth for all throwable objects in the app.
 * The order of this list also determines the default throw panel order.
 */
export const THROWABLE_OBJECTS: ThrowableObject[] = [
  {
    id: "tomato",
    emoji: "🍅",
    name: "Tomato",
    description: "A juicy red tomato! Splat!",
    color: "#e53935",
    particleColor: "#ef5350",
  },
  {
    id: "egg",
    emoji: "🥚",
    name: "Egg",
    description: "Crack! Fresh egg incoming!",
    color: "#FFD54F",
    particleColor: "#FFE082",
  },
  {
    id: "cake",
    emoji: "🍰",
    name: "Cake",
    description: "Surprise! It's your birthday.",
    color: "#F8BBD0",
    particleColor: "#FCE4EC",
  },
  {
    id: "poop",
    emoji: "💩",
    name: "Poop",
    description: "Ew! Poop splat!",
    color: "#795548",
    particleColor: "#8D6E63",
  },
  {
    id: "heart",
    emoji: "❤️",
    name: "Heart",
    description: "Sending love your way!",
    color: "#e53935",
    particleColor: "#ef5350",
  },
  {
    id: "money",
    emoji: "💵",
    name: "Money",
    description: "Ka-ching! Cash rain!",
    color: "#43A047",
    particleColor: "#66BB6A",
  },
  {
    id: "rock",
    emoji: "🪨",
    name: "Rock",
    description: "Heavy rock incoming!",
    color: "#9E9E9E",
    particleColor: "#BDBDBD",
  },
  {
    id: "thumbs_up",
    emoji: "👍",
    name: "Thumbs Up",
    description: "Just a friendly thumbs up!",
    color: "#FFCA28",
    particleColor: "#FFD54F",
  },
];

/**
 * Neutral fallback icon used when an unknown object id is encountered
 * (e.g. an older database record that referenced a deprecated object id).
 */
export const FALLBACK_OBJECT_EMOJI = "📦";

/**
 * Map deprecated object ids (from older versions of the app) to a
 * currently-supported object id. Records still using these ids will be
 * resolved to a valid object instead of showing a red "?" placeholder.
 */
const DEPRECATED_ID_MAP: Record<string, string> = {
  // Old non-supported items → fall back to a sensible, visible object.
  paint: "tomato",
  ink: "thumbs_up",
  cheese: "cake",
  snowball: "rock",
  toilet_paper: "thumbs_up",
  rubber_duck: "thumbs_up",
  // Alternate / variant ids that may exist in older data.
  love: "heart",
  fireball: "tomato",
  flower: "heart",
  pizza: "cake",
  poop_emoji: "poop",
  heart_red: "heart",
  money_cash: "money",
  rock_stone: "rock",
  thumb: "thumbs_up",
  thumbsup: "thumbs_up",
  thumbs_up_emoji: "thumbs_up",
  egg_raw: "egg",
  cake_birthday: "cake",
  tomato_red: "tomato",
};

/**
 * Resolves any object id (including deprecated ones) to a known
 * ThrowableObject. Returns the fallback object for ids that are not
 * recognized at all so the UI can always render a visible icon.
 */
const FALLBACK_OBJECT: ThrowableObject = {
  id: "unknown",
  emoji: FALLBACK_OBJECT_EMOJI,
  name: "Unknown",
  description: "An unknown object",
  color: "#9E9E9E",
  particleColor: "#BDBDBD",
};

export const getObjectById = (id: string | null | undefined): ThrowableObject => {
  if (!id) return FALLBACK_OBJECT;
  const direct = THROWABLE_OBJECTS.find((obj) => obj.id === id);
  if (direct) return direct;
  const normalized = id.toLowerCase();
  const mappedId = DEPRECATED_ID_MAP[normalized];
  if (mappedId) {
    const mapped = THROWABLE_OBJECTS.find((obj) => obj.id === mappedId);
    if (mapped) return mapped;
  }
  return FALLBACK_OBJECT;
};

/**
 * Convenience helper: returns just the emoji for a given object id.
 * Always returns a visible emoji (never undefined or "?").
 */
export const getObjectEmoji = (id: string | null | undefined): string => {
  return getObjectById(id).emoji;
};

export const getRandomObject = (): ThrowableObject => {
  return THROWABLE_OBJECTS[Math.floor(Math.random() * THROWABLE_OBJECTS.length)];
};