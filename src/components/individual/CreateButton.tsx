"use client";

import { motion } from "framer-motion";

interface CreateButtonProps {
  onClick: () => void;
}

export function CreateButton({ onClick }: CreateButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      className="flex items-center gap-1 h-9 px-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-white/15 active:bg-white/20 transition-all duration-200 text-sm text-white/90 font-medium select-none shrink-0"
    >
      <svg className="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <span>Create Card</span>
    </motion.button>
  );
}
