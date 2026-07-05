"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface CloudProps {
  x: number;
  y: number;
  scale: number;
  delay: number;
  duration: number;
  opacity: number;
}

function Cloud({ x, y, scale, delay, duration, opacity }: CloudProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ x: -200, opacity: 0 }}
      animate={{
        x: [null, "calc(100vw + 200px)"],
        opacity: [0, opacity, opacity, 0],
      }}
      transition={{
        x: {
          duration,
          repeat: Infinity,
          delay,
          ease: "linear",
        },
        opacity: {
          duration: duration * 0.2,
          times: [0, 0.1, 0.9, 1],
          repeat: Infinity,
          delay,
        },
      }}
    >
      <svg
        width={100 * scale}
        height={60 * scale}
        viewBox="0 0 100 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="30" cy="40" rx="25" ry="18" fill="white" opacity={0.9} />
        <ellipse cx="55" cy="35" rx="30" ry="22" fill="white" opacity={0.95} />
        <ellipse cx="75" cy="40" rx="20" ry="15" fill="white" opacity={0.85} />
        <ellipse cx="45" cy="30" rx="20" ry="15" fill="white" opacity={1} />
      </svg>
    </motion.div>
  );
}

// Deterministic cloud positions to prevent hydration mismatch.
// Math.random() would produce different values on server vs. client.
const CLOUD_POSITIONS = [
  { x: 5, y: 8, scale: 1.2, delay: 0, duration: 35, opacity: 0.6 },
  { x: 30, y: 12, scale: 0.8, delay: 4, duration: 40, opacity: 0.5 },
  { x: 55, y: 5, scale: 1.0, delay: 8, duration: 30, opacity: 0.7 },
  { x: 75, y: 15, scale: 0.7, delay: 12, duration: 45, opacity: 0.4 },
  { x: 15, y: 25, scale: 0.9, delay: 16, duration: 38, opacity: 0.5 },
  { x: 45, y: 20, scale: 1.1, delay: 20, duration: 32, opacity: 0.6 },
  { x: 65, y: 10, scale: 0.6, delay: 24, duration: 42, opacity: 0.4 },
  { x: 85, y: 28, scale: 0.85, delay: 28, duration: 36, opacity: 0.5 },
];

export function FloatingClouds() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {CLOUD_POSITIONS.map((cloud, i) => (
        <Cloud key={i} {...cloud} />
      ))}
    </div>
  );
}
