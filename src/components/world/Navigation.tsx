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
    <nav className="glass-strong sticky top-0 z-30 h-14">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-3">
        {/* Logo */}
        <motion.a
          href="/"
          className="flex items-center gap-2 shrink-0"
          whileHover={{ scale: 1.02 }}
        >
          <span className="text-lg leading-none">🌍</span>
          <span
            className="text-base font-bold bg-gradient-to-r from-wt-orange to-wt-pink bg-clip-text text-transparent hidden sm:block"
            style={{ fontFamily: "'Fredoka', cursive" }}
          >
            WorldThrow
          </span>
        </motion.a>

        {/* Search */}
        <div className="flex-1 max-w-sm hidden md:block">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearchCountry(e.target.value);
              }}
              placeholder="Find a country..."
              className="w-full px-3 py-1.5 pl-8 rounded-lg bg-wt-surface dark:bg-white/5 border border-wt-border dark:border-white/10 focus:border-wt-orange outline-none transition-colors text-sm text-wt-text dark:text-white placeholder-wt-muted"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-wt-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Online counter */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            {onlineCount}
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-wt-orange/10">
            <span className="text-xs leading-none">{countryFlag}</span>
            <span className="text-xs font-semibold text-wt-text dark:text-black truncate max-w-[80px]">
              {nickname}
            </span>
          </div>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-wt-muted hover:text-red-500 hover:bg-red-50 hover:border-red-300 dark:border-gray-600 dark:hover:bg-red-500/10 dark:hover:border-red-500/40 transition-colors"
            title="Logout"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onSearchCountry(e.target.value);
          }}
          placeholder="Find a country..."
          className="w-full px-3 py-1.5 pl-8 rounded-lg bg-wt-surface dark:bg-white/5 border border-wt-border dark:border-white/10 focus:border-wt-orange outline-none transition-colors text-sm text-wt-text dark:text-white placeholder-wt-muted"
        />
      </div>
    </nav>
  );
}
