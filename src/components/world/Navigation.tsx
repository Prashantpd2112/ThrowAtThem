"use client";

import { motion } from "framer-motion";
import { SearchBar } from "@/components/world/SearchBar";
import { CreateButton } from "@/components/individual/CreateButton";

interface NavigationProps {
  nickname: string;
  countryFlag: string;
  onlineCount?: number;
  onLogout: () => void;
  showBackButton?: boolean;
  onBackFromLeaderboard?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onCreateClick?: () => void;
}

export function Navigation({
  nickname,
  countryFlag,
  onlineCount = 0,
  onLogout,
  showBackButton,
  onBackFromLeaderboard,
  searchQuery,
  onSearchChange,
  onCreateClick,
}: NavigationProps) {
  return (
    <nav
      className="sticky top-0 z-30 bg-transparent backdrop-blur-md border-b border-b-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.08)] max-md:h-16 md:h-[70px]"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" } as React.CSSProperties}
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
            <div className="flex items-center gap-1.5 max-md:hidden">
              <span className="text-2xl leading-none">🍅</span>
            </div>
            <div className="flex flex-col leading-tight max-md:hidden">
              <span
                className="text-[15px] font-bold text-tomato-gradient"
                style={{ fontFamily: "'Fredoka', cursive" }}
              >
                ThrowAtThem
              </span>
            </div>
            {/* Mobile: just the tomato */}
            <div className="md:hidden w-11 h-11 shrink-0 overflow-hidden flex items-center justify-center">
              <span className="text-2xl leading-none">🍅</span>
            </div>
          </motion.a>
        )}        {/* Search - center, desktop only */}
          <div className="hidden md:flex flex-1 justify-center min-w-0">
            <div className="relative w-full max-w-2xl">
              <SearchBar
                value={searchQuery}
                onChange={onSearchChange || (() => {})}
                viewMode="individual"
                variant="glass"
              />
            </div>
          </div>

        {/* Right section */}
        <div className="flex items-center max-md:gap-1.5 md:gap-2.5 shrink-0 max-md:ml-auto">
          {/* Online counter */}
          <div
            className="group flex items-center rounded-full border border-white/15 bg-white/10 shadow-sm overflow-hidden max-md:h-11 md:h-9 cursor-default transition-colors duration-200 hover:border-green-400/30"
            title={`${onlineCount} players online`}
            aria-label={`${onlineCount} players online`}
          >
            <div className="flex items-center gap-1.5 pl-3 pr-2.5 h-full">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-bold text-white/90 tabular-nums">{onlineCount}</span>
            </div>
            <span className="text-xs font-semibold text-white/50 max-w-0 overflow-hidden whitespace-nowrap pr-0 group-hover:max-w-[60px] group-hover:pr-3.5 transition-all duration-300 ease-out">
              online
            </span>
          </div>

          {/* Create Card button — desktop only, between online counter and player card */}
          <div className="max-md:hidden">
            <CreateButton onClick={() => onCreateClick?.()} />
          </div>

          {/* Player card */}
          <div className="flex items-center gap-2.5 max-md:pl-2 max-md:pr-2.5 md:pl-2.5 md:pr-3 max-md:h-11 md:h-9 rounded-xl bg-white/10 border border-white/15 shadow-sm">
            <span className="text-base leading-none shrink-0">{countryFlag}</span>
            <span className="text-[13px] font-bold text-white/90 truncate max-w-[140px] leading-none">
              {nickname}
            </span>
          </div>

          {/* Logout button */}
          <motion.button
            onClick={onLogout}
            className="group flex items-center rounded-full border border-white/15 bg-white/10 shadow-sm overflow-hidden max-md:h-11 md:h-9 transition-colors duration-300 hover:bg-red-500/20 hover:border-red-400/30"
            whileTap={{ scale: 0.96 }}
            title="Logout"
            aria-label="Logout"
          >
            <span className="flex items-center justify-center max-md:w-11 md:w-9 h-full text-white/60 group-hover:text-red-400 transition-colors duration-300 shrink-0">
              <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </span>
            <span className="text-xs font-semibold text-white/50 group-hover:text-red-400 max-w-0 overflow-hidden whitespace-nowrap pr-0 group-hover:max-w-[70px] group-hover:pr-4 transition-all duration-300 ease-out">
              Logout
            </span>
          </motion.button>
        </div>
      </div>
    </nav>
  );
}
