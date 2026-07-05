"use client";

import { motion } from "framer-motion";
import { Globe3D } from "./Globe3D";
import { FloatingClouds } from "./FloatingClouds";

interface HeroSectionProps {
  onEnterClick: () => void;
}

export function HeroSection({ onEnterClick }: HeroSectionProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-wt-blue via-wt-sky to-wt-cream dark:from-wt-dark dark:via-[#16213e] dark:to-[#1a1a2e]">
      {/* Background Elements */}
      <FloatingClouds />

      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-wt-purple/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-wt-pink/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Content - centered, Earth above, hero group shifted slightly up */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 md:px-8 pt-8 md:pt-12 pb-8">
        {/* 3D Globe - horizontally centered with title */}
        <motion.div
         className="flex items-center justify-center mx-auto w-52 h-52 md:w-64 md:h-64 lg:w-76 lg:h-76 mb-12 translate-y-0 translate-x-0"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, type: "spring", stiffness: 100 }}
        >
          <Globe3D />
        </motion.div>

        {/* Hero content group — shifted upward for balanced composition */}
        <div className="flex flex-col items-center -mt-10">
        {/* Title */}
        <motion.h1
          className="text-5xl md:text-7xl lg:text-8xl font-bold text-center mb-4"
          style={{ fontFamily: "'Fredoka', 'Comic Sans MS', cursive, sans-serif" }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <span className="bg-gradient-to-r from-wt-orange via-wt-pink to-wt-purple bg-clip-text text-transparent">
            WorldThrow
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-lg md:text-xl text-gray-700 dark:text-gray-200 text-center max-w-md mb-4 font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          Throw silly things at countries around the world! 
          <span className="block mt-1 text-sm text-gray-500 dark:text-gray-400">No signup. No login. Just fun.</span>
        </motion.p>

        {/* Enter Button */}
        <motion.button
          className="group relative px-10 py-5 text-xl font-bold rounded-2xl text-white
                     bg-gradient-to-r from-wt-orange via-orange-500 to-wt-pink
                     shadow-2xl shadow-wt-orange/30 hover:shadow-wt-pink/40
                     transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.97 }}
          onClick={onEnterClick}
        >
          <span className="relative z-10 flex items-center gap-3">
            🌍 Enter the World
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </span>
          {/* Glow effect */}
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-wt-orange via-orange-500 to-wt-pink opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
        </motion.button>
        </div>

        {/* Floating Objects — all below Earth's center line, clean upper sky */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            // Left side — distributed evenly in lower half
            { emoji: "🎨", left: 6, top: 54, dur: 4.5, del: 0 },
            { emoji: "🍅", left: 4, top: 60, dur: 5, del: 0.5 },
            { emoji: "🍩", left: 12, top: 66, dur: 6, del: 1.0 },
            { emoji: "🧻", left: 3, top: 74, dur: 6.5, del: 0.3 },
            { emoji: "🐟", left: 9, top: 80, dur: 6, del: 1.8 },
            { emoji: "🖋", left: 14, top: 87, dur: 4.8, del: 0.5 },

            // Right side — distributed evenly in lower half
            { emoji: "❄", left: 93, top: 53, dur: 4, del: 1.5 },
            { emoji: "🎯", left: 83, top: 58, dur: 5.5, del: 2 },
            { emoji: "🪁", left: 76, top: 64, dur: 5, del: 0.2 },
            { emoji: "🥚", left: 90, top: 70, dur: 6, del: 1.2 },
            { emoji: "🦆", left: 88, top: 77, dur: 7, del: 0.8 },
            { emoji: "⚡", left: 80, top: 83, dur: 4.5, del: 0.7 },
            { emoji: "🧀", left: 85, top: 90, dur: 5.5, del: 2 },
          ].map((item) => (
            <motion.div
              key={item.emoji}
              className="absolute text-3xl md:text-4xl"
              style={{
                left: `${item.left}%`,
                top: `${item.top}%`,
                ...(item.emoji === "❄"
                  ? { filter: "drop-shadow(0 0 8px #BFE9FF) brightness(1.4) saturate(0.7)" }
                  : {}),
              }}
              animate={{
                y: [0, -30, 0],
                rotate: [0, 360, 0],
              }}
              transition={{
                duration: item.dur,
                repeat: Infinity,
                delay: item.del,
                ease: "easeInOut",
              }}
            >
              {item.emoji}
            </motion.div>
          ))}
        </div>

        {/* Scroll indicator removed per UX requirement */}
      </div>
    </div>
  );
}
