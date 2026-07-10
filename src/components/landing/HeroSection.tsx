"use client";

import { motion } from "framer-motion";
import { TomatoAnimation } from "./TomatoAnimation";

interface HeroSectionProps {
  onEnterClick: () => void;
}

export function HeroSection({ onEnterClick }: HeroSectionProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#03040A]">

      {/* Content - centered, Earth above, hero group shifted slightly up */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 md:px-8 pt-8 md:pt-12 pb-8">
        {/* Tomato Animation - horizontally centered */}
        <motion.div
         className="flex items-center justify-center mx-auto w-64 h-64 md:w-80 md:h-80 lg:w-[420px] lg:h-[420px] mb-12 translate-y-0 translate-x-0"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, type: "spring", stiffness: 100 }}
        >
          <TomatoAnimation />
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
          <span className="text-tomato-gradient">
            ThrowAtThem
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-lg md:text-xl text-gray-700 dark:text-gray-200 text-center max-w-md mb-4 font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          Every annoying person deserves a virtual tomato.
          <span className="block mt-1 text-sm text-gray-500 dark:text-gray-400">No signup. No login. Just fun.</span>
        </motion.p>

        {/* Enter Button */}
        <motion.button
          className="group relative px-10 py-5 text-xl font-bold rounded-2xl text-white bg-tomato-gradient-r
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
            Let's Throw
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </span>
          {/* Glow effect */}
          <span className="absolute inset-0 rounded-2xl bg-tomato-gradient-r opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
        </motion.button>
        </div>

        {/* Scroll indicator removed per UX requirement */}
      </div>
    </div>
  );
}
