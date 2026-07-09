"use client";

import { motion } from "framer-motion";
import { Globe3D } from "@/components/landing/Globe3D";
import { SearchBar } from "@/components/world/SearchBar";

interface NavigationProps {
  nickname: string;
  countryFlag: string;
  onlineCount?: number;
  onLogout: () => void;
  showBackButton?: boolean;
  onBackFromLeaderboard?: () => void;
}

export function Navigation({
  nickname,
  countryFlag,
  onlineCount = 0,
  onLogout,
  showBackButton,
  onBackFromLeaderboard,
}: NavigationProps) {
  return (
    <nav
      className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] max-md:h-16 md:h-[70px] max-md:bg-transparent max-md:backdrop-blur-md max-md:border-b-white/10 max-md:shadow-[0_1px_2px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.08)]"
    >
      <div className="h-full max-w-[1600px] mx-auto max-md:px-4 md:px-6 flex items-center max-md:gap-0 md:gap-5">
        {/* Back button when in leaderboard fullscreen */}
        {showBackButton ? (
          <motion.button
            onClick={onBackFromLeaderboard}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-sm mr-3"
            whileTap={{ scale: 0.96 }}
            aria-label="Back"
          >
            <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>
        ) : (
          /* Logo - left */
          <motion.a
            href="/"
            className="flex items-center gap-2.5 shrink-0 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-9 h-9 shrink-0 overflow-hidden rounded-full">
              <Globe3D />
            </div>
            <div className="flex flex-col leading-tight max-md:hidden">
              <span
                className="text-[15px] font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent"
                style={{ fontFamily: "'Fredoka', cursive" }}
              >
                WorldThrow
              </span>
              <span className="text-[10px] font-medium text-gray-500 -mt-0.5">
                Throw fun at the world
              </span>
            </div>
          </motion.a>
        )}        {/* Search - center, desktop only */}
          <div className="hidden md:flex flex-1 justify-center min-w-0">
            <div className="relative w-full max-w-2xl">
              <SearchBar
                onChange={() => {}}
                viewMode="individual"
              />
            </div>
          </div>

        {/* Right section */}
        <div className="flex items-center max-md:gap-1.5 md:gap-2.5 shrink-0 max-md:ml-auto">
          {/* Online counter */}
          <div
            className="group flex items-center rounded-full border border-[#E5E7EB] bg-white shadow-sm overflow-hidden max-md:h-11 md:h-9 cursor-default transition-colors duration-200 hover:border-green-200 max-md:bg-white/10 max-md:border-white/15 max-md:hover:border-green-400/30"
            title={`${onlineCount} players online`}
            aria-label={`${onlineCount} players online`}
          >
            <div className="flex items-center gap-1.5 pl-3 pr-2.5 h-full">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-bold text-gray-900 tabular-nums max-md:text-white/90">{onlineCount}</span>
            </div>
            <span className="text-xs font-semibold text-gray-500 max-w-0 overflow-hidden whitespace-nowrap pr-0 group-hover:max-w-[60px] group-hover:pr-3.5 transition-all duration-300 ease-out max-md:text-white/50">
              online
            </span>
          </div>

          {/* Player card */}
          <div className="flex items-center gap-2.5 max-md:pl-2 max-md:pr-2.5 md:pl-2.5 md:pr-3 max-md:h-11 md:h-9 rounded-xl bg-white border border-[#E5E7EB] shadow-sm max-md:bg-white/10 max-md:border-white/15">
            <span className="text-base leading-none shrink-0">{countryFlag}</span>
            <span className="text-[13px] font-bold text-gray-900 truncate max-w-[140px] leading-none max-md:text-white/90">
              {nickname}
            </span>
          </div>

          {/* Logout button */}
          <motion.button
            onClick={onLogout}
            className="group flex items-center rounded-full border border-[#E5E7EB] bg-white shadow-sm overflow-hidden max-md:h-11 md:h-9 transition-colors duration-300 hover:bg-red-50 hover:border-red-200 max-md:bg-white/10 max-md:border-white/15 max-md:hover:bg-red-500/20 max-md:hover:border-red-400/30"
            whileTap={{ scale: 0.96 }}
            title="Logout"
            aria-label="Logout"
          >
            <span className="flex items-center justify-center max-md:w-11 md:w-9 h-full text-gray-500 group-hover:text-red-500 transition-colors duration-300 shrink-0 max-md:text-white/60 max-md:group-hover:text-red-400">
              <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </span>
            <span className="text-xs font-semibold text-gray-500 group-hover:text-red-500 max-w-0 overflow-hidden whitespace-nowrap pr-0 group-hover:max-w-[70px] group-hover:pr-4 transition-all duration-300 ease-out max-md:text-white/50 max-md:group-hover:text-red-400">
              Logout
            </span>
          </motion.button>
        </div>
      </div>
    </nav>
  );
}
