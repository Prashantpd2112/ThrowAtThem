"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface NavigationProps {
  nickname: string;
  countryFlag: string;
  onlineCount?: number;
  onSearchCountry: (query: string) => void;
  onLogout: () => void;
}

export function Navigation({ nickname, countryFlag, onlineCount = 0, onSearchCountry, onLogout }: NavigationProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <nav className="glass-header sticky top-0 z-30" style={{ height: "60px" }}>
      <div className="h-full max-w-[1600px] mx-auto px-5 flex items-center justify-between gap-4">
        {/* Logo */}
        <motion.a
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-md">
            <span className="text-base leading-none">🌍</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className="text-sm font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent"
              style={{ fontFamily: "'Fredoka', cursive" }}
            >
              WorldThrow
            </span>
            <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 -mt-0.5">Throw fun at the world</span>
          </div>
        </motion.a>

        {/* Search - Desktop */}
        <div className="hidden md:block flex-1 max-w-md">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearchCountry(e.target.value);
              }}
              placeholder="Search countries..."
              className="w-full h-9 pl-9 pr-3 rounded-xl input-glass text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  onSearchCountry("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 dark:bg-white/20 hover:bg-gray-300 dark:hover:bg-white/30 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Online counter */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/30">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span className="font-bold text-green-600 dark:text-green-400">{onlineCount}</span> online
            </span>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-white/10 border border-gray-200 dark:border-white/10">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 flex items-center justify-center">
              <span className="text-sm leading-none">{countryFlag}</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold text-gray-800 dark:text-gray-100 truncate max-w-[80px]">
                {nickname}
              </span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500">Player</span>
            </div>
          </div>

          {/* Logout button */}
          <motion.button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/50 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-semibold hidden sm:inline">Logout</span>
          </motion.button>
        </div>
      </div>
    </nav>
  );
}
