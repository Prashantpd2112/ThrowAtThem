"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COUNTRIES } from "@/data/countries";

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export interface CountryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (country: CountryOption) => void;
  selectedCode?: string;
}

function getFlagEmoji(code: string): string {
  // Convert country code (e.g. "US") to flag emoji
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

// Build a sorted, deduplicated list of country options
const COUNTRY_OPTIONS: CountryOption[] = (() => {
  const seen = new Set<string>();
  const sorted = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  const result: CountryOption[] = [];
  for (const c of sorted) {
    const key = c.code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      code: c.code,
      name: c.name,
      flag: c.flag || getFlagEmoji(c.code),
    });
  }

  // Ensure Pakistan exists
  if (!seen.has("PK")) {
    result.push({
      code: "PK",
      name: "Pakistan",
      flag: "🇵🇰",
    });
  }

  // Re-sort after adding Pakistan
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
})();

export function CountryPicker({ isOpen, onClose, onSelect, selectedCode }: CountryPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setHighlightedIndex(0);
      // Auto-focus search input after animation
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use mousedown for immediate response, slight delay to avoid triggering from modal open
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Filter countries based on search query (case-insensitive, partial match)
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRY_OPTIONS;
    const q = searchQuery.toLowerCase().trim();
    return COUNTRY_OPTIONS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Reset highlight when filter results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCountries.length]);

  // Keep highlighted item in view
  useEffect(() => {
    if (!listRef.current || highlightedIndex < 0) return;
    const items = listRef.current.querySelectorAll<HTMLButtonElement>("[data-country-index]");
    const target = items[highlightedIndex];
    if (target) {
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightedIndex]);

  const handleSelect = useCallback(
    (option: CountryOption) => {
      onSelect(option);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredCountries.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCountries.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCountries.length === 0) break;
          const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
          handleSelect(filteredCountries[idx]);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCountries, highlightedIndex, handleSelect, onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Popup */}
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white/90">Choose Country</h2>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Search input */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search countries..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/10 border border-white/15 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-orange-400/40 focus:ring-1 focus:ring-orange-400/20 transition-all"
                />
              </div>
            </div>

            {/* Country list */}
            <div
              ref={listRef}
              className="overflow-y-auto overscroll-contain scrollbar-thin"
              style={{ maxHeight: "min(60vh, 360px)" }}
            >
              {filteredCountries.length > 0 ? (
                filteredCountries.map((option, index) => {
                  const isSelected = option.code === selectedCode;
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button
                      key={option.code}
                      data-country-index={index}
                      type="button"
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full text-left px-5 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                        isSelected
                          ? "text-white font-semibold bg-orange-500/15"
                          : isHighlighted
                          ? "text-white bg-white/10"
                          : "text-white/65 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{option.flag}</span>
                      <span className="flex-1 truncate">{option.name}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-5 py-8 text-sm text-white/30 text-center">
                  No countries match &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>

            {/* Footer with count */}
            <div className="px-5 py-2.5 border-t border-white/5 bg-white/[0.02]">
              <p className="text-[11px] text-white/30 text-center">
                {filteredCountries.length} of {COUNTRY_OPTIONS.length} countries
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}