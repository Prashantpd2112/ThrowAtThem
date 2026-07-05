import { ThrowableObject } from "@/lib/types";

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
    id: "paint",
    emoji: "🎨",
    name: "Paint",
    description: "Colorful paint splash!",
    color: "#7C4DFF",
    particleColor: "#B388FF",
  },
  {
    id: "ink",
    emoji: "🖋",
    name: "Ink",
    description: "Squirt! Ink everywhere!",
    color: "#37474F",
    particleColor: "#607D8B",
  },
  {
    id: "cheese",
    emoji: "🧀",
    name: "Cheese",
    description: "Stinky cheese incoming!",
    color: "#FFD700",
    particleColor: "#FFE082",
  },
  {
    id: "snowball",
    emoji: "❄",
    name: "Snowball",
    description: "Brrr! Cold snowball!",
    color: "#81D4FA",
    particleColor: "#B3E5FC",
  },
  {
    id: "toilet_paper",
    emoji: "🧻",
    name: "Toilet Paper",
    description: "Unrolling! TP attack!",
    color: "#FFF9C4",
    particleColor: "#FFF176",
  },
  {
    id: "rubber_duck",
    emoji: "🦆",
    name: "Rubber Duck",
    description: "Quack quack! Rubber duck!",
    color: "#FFD54F",
    particleColor: "#FFE082",
  },
];

export const getObjectById = (id: string): ThrowableObject | undefined => {
  return THROWABLE_OBJECTS.find((obj) => obj.id === id);
};

export const getRandomObject = (): ThrowableObject => {
  return THROWABLE_OBJECTS[Math.floor(Math.random() * THROWABLE_OBJECTS.length)];
};
