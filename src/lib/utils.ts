import { v4 as uuidv4 } from "uuid";

export const generateGuestId = (): string => {
  return uuidv4();
};

export const generateNickname = (): string => {
  const adjectives = [
    "Happy", "Silly", "Funny", "Lucky", "Crazy", "Jolly", "Merry", "Zippy",
    "Bouncy", "Chirpy", "Dizzy", "Fuzzy", "Goofy", "Peppy", "Quirky", "Snazzy",
  ];
  const nouns = [
    "Tiger", "Panda", "Penguin", "Koala", "Dolphin", "Fox", "Bear", "Owl",
    "Raccoon", "Sloth", "Meerkat", "Narwhal", "Llama", "Flamingo", "Bunny", "Hedgehog",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
};

export const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
};

export const getHeatColor = (level: number, max: number): string => {
  if (max === 0) return "#e8f5e9"; // light green - no activity
  const ratio = level / max;
  if (ratio < 0.25) return "#c8e6c9";
  if (ratio < 0.5) return "#ffeb3b";
  if (ratio < 0.75) return "#ff9800";
  return "#f44336";
};

export const getActivityLevel = (count: number, max: number): "low" | "medium" | "high" | "very_high" => {
  if (max === 0) return "low";
  const ratio = count / max;
  if (ratio < 0.25) return "low";
  if (ratio < 0.5) return "medium";
  if (ratio < 0.75) return "high";
  return "very_high";
};

export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(" ");
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};
