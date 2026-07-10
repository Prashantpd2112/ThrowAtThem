"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { COUNTRY_OPTIONS } from "@/data/countries";
import { generateNickname } from "@/lib/utils";

interface GuestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onEnter: (nickname: string, country: string) => void;
}

export function GuestPopup({ isOpen, onClose, onEnter }: GuestPopupProps) {
  const [nickname, setNickname] = useState("");
  const [country, setCountry] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  const handleEnter = () => {
    if (!country) return;
    setIsAnimating(true);
    const finalNickname = nickname.trim() || generateNickname();
    setTimeout(() => {
      onEnter(finalNickname, country);
    }, 500);
  };

  const randomizeNickname = () => {
    setNickname(generateNickname());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-5xl mb-4">🌍</div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white" style={{ fontFamily: "'Fredoka', cursive" }}>
            Welcome to ThrowAtThem!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            Choose your name and country, then jump into the fun!
          </p>
        </motion.div>

        {/* Nickname */}
        <motion.div
          className="mb-5 text-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-Black-400">
            Your Nickname
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. SillyPanda42"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-white/5 border-1 border-gray-200 dark:border-black/18 focus:border-wt-orange dark:focus:border-wt-orange outline-none transition-colors text-gray-800 dark:text-black placeholder-gray-400"
              onKeyDown={(e) => e.key === "Enter" && handleEnter()}
            />
            <button
              onClick={randomizeNickname}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wt-orange transition-colors"
              title="Randomize nickname"
            >
              🎲
            </button>
          </div>
        </motion.div>

        {/* Country Select */}
        <motion.div
          className="mb-6 text-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-Black-400">
            Your Country
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="
              w-full
              h-14
              rounded-xl
              border
              border-gray-300
              bg-gray-50
              text-gray-900
              font-medium
              px-4
              pr-10
              focus:outline-none
              focus:ring-2
              focus:ring-orange-400
              focus:border-orange-400
              appearance-none
              "
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: `right 0.75rem center`,
              backgroundRepeat: `no-repeat`,
              backgroundSize: `1.25rem`,
            }}
          >
            <option value="" disabled>
              Select your country...
            </option>
            {COUNTRY_OPTIONS.sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Enter Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            size="xl"
            onClick={handleEnter}
            disabled={!country || isAnimating}
            className="w-full"
            rightIcon={isAnimating ? undefined : "🚀"}
          >
            {isAnimating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Entering...
              </span>
            ) : (
              "Let's Throw"
            )}
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-xs text-gray-400 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          No account needed. Your guest ID is generated automatically. 🎉
        </motion.p>
      </div>

      {/* Enter animation overlay */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-wt-orange to-wt-pink flex items-center justify-center z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="text-center text-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring" }}
            >
              <div className="text-6xl mb-4">🎉</div>
              <div className="text-2xl font-bold">See you in the World!</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
