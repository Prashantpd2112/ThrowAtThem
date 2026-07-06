"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { COUNTRIES, getCountryByCode } from "@/data/countries";
import { Globe3D } from "@/components/landing/Globe3D";

interface NavigationProps {
  nickname: string;
  countryFlag: string;
  onlineCount?: number;
  selectedCountryName?: string | null;
  selectedCountryFlag?: string | null;
  onSearchCountry: (query: string) => void;
  onSearchConfirm?: (query: string) => void;
  onLogout: () => void;
}

export function Navigation({ nickname, countryFlag, onlineCount = 0, selectedCountryName, selectedCountryFlag, onSearchCountry, onSearchConfirm, onLogout }: NavigationProps) {
  const [inputValue, setInputValue] = useState("");

  // Compute the best suggestion from the countries list
  const suggestion = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return null;

    // Try exact code match first
    const codeMatch = getCountryByCode(inputValue.toUpperCase());
    if (codeMatch) return codeMatch.name;

    // Try prefix match on country name
    const match = COUNTRIES.find((c) =>
      c.name.toLowerCase().startsWith(q)
    );
    if (match && match.name.toLowerCase() !== q) return match.name;

    return null;
  }, [inputValue]);

  // The gray suggestion text that appears after what the user typed
  const suggestionSuffix = useMemo(() => {
    if (!suggestion || !inputValue.trim()) return "";
    return suggestion.slice(inputValue.trim().length);
  }, [suggestion, inputValue]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      onSearchCountry(val);
    },
    [onSearchCountry]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion) {
        e.preventDefault();
        setInputValue(suggestion);
        onSearchCountry(suggestion);
      } else if (e.key === "Enter" && inputValue.trim()) {
        e.preventDefault();
        onSearchConfirm?.(inputValue.trim());
        setInputValue("");
      }
    },
    [suggestion, inputValue, onSearchCountry, onSearchConfirm]
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    onSearchCountry("");
  }, [onSearchCountry]);

  return (
    <nav
      className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]"
      style={{ height: "70px" }}
    >
      <div className="h-full max-w-[1600px] mx-auto px-6 flex items-center gap-5">
        {/* Logo - left */}
        <motion.a
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-9 h-9 shrink-0 overflow-hidden rounded-full">
            <Globe3D />
          </div>
          <div className="flex flex-col leading-tight">
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

        {/* Search - center, desktop only */}
        <div className="hidden md:flex flex-1 justify-center min-w-0">
          <div className="relative w-full max-w-2xl">
            {/* Input wrapper for suggestion overlay */}
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Search countries..."
                className="w-full h-10 pl-11 pr-10 rounded-full bg-white border border-[#E5E7EB] text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100"
              />
              {/* Gray suggestion overlay - positioned on top of input text */}
              {suggestionSuffix && (
                <span
                  className="absolute top-0 left-0 h-10 pl-11 pr-10 flex items-center text-sm pointer-events-none text-gray-300"
                  aria-hidden="true"
                >
                  <span className="invisible">{inputValue.trim()}</span>
                  <span>{suggestionSuffix}</span>
                </span>
              )}
            </div>

            {/* Clear button - only when user has typed */}
            {inputValue && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
                aria-label="Clear search"
              >
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Online counter */}
          <div
            className="group flex items-center rounded-full border border-[#E5E7EB] bg-white shadow-sm overflow-hidden h-9 cursor-default transition-colors duration-200 hover:border-green-200"
            title={`${onlineCount} players online`}
            aria-label={`${onlineCount} players online`}
          >
            <div className="flex items-center gap-1.5 pl-3 pr-2.5 h-full">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-bold text-gray-900 tabular-nums">{onlineCount}</span>
            </div>
            <span className="text-xs font-semibold text-gray-500 max-w-0 overflow-hidden whitespace-nowrap pr-0 group-hover:max-w-[60px] group-hover:pr-3.5 transition-all duration-300 ease-out">
              online
            </span>
          </div>

          {/* Player card */}
          <div className="flex items-center gap-2.5 pl-2.5 pr-3 h-9 rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
            <span className="text-base leading-none shrink-0">{countryFlag}</span>
            <span className="text-[13px] font-bold text-gray-900 truncate max-w-[140px] leading-none">
              {nickname}
            </span>
          </div>

          {/* Logout button */}
          <motion.button
            onClick={onLogout}
            className="group flex items-center rounded-full border border-[#E5E7EB] bg-white shadow-sm overflow-hidden h-9 transition-colors duration-300 hover:bg-red-50 hover:border-red-200"
            whileTap={{ scale: 0.96 }}
            title="Logout"
            aria-label="Logout"
          >
            <span className="flex items-center justify-center w-9 h-full text-gray-500 group-hover:text-red-500 transition-colors duration-300 shrink-0">
              <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            <span className="text-xs font-semibold text-gray-500 group-hover:text-red-500 max-w-0 overflow-hidden whitespace-nowrap pr-0 group-hover:max-w-[70px] group-hover:pr-4 transition-all duration-300 ease-out">
              Logout
            </span>
          </motion.button>
        </div>
      </div>
    </nav>
  );
}