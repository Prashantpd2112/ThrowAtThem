"use client";

import { useState, useMemo, useCallback, forwardRef } from "react";
import { motion } from "framer-motion";
import { COUNTRIES, getCountryByCode } from "@/data/countries";
import { useProfiles } from "@/hooks/useProfiles";

export type SearchViewMode = "individual" | "country";

interface SearchBarProps {
  value?: string;
  onChange: (query: string) => void;
  onConfirm?: (query: string) => void;
  viewMode?: SearchViewMode;
  /** Visual variant: "light" for white card (mobile inline), "glass" for the dark navigation bar */
  variant?: "light" | "glass";
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

/**
 * Reusable search bar with a leading magnifying-glass icon and
 * viewMode-aware autocomplete suggestion overlay.
 *
 * - viewMode="individual" -> suggests profile nicknames (fallback to country)
 * - viewMode="country"    -> suggests country names (fallback to profile)
 *
 * Pressing Tab / ArrowRight accepts the suggestion.
 * Pressing Enter triggers onConfirm.
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  {
    value: controlledValue,
    onChange,
    onConfirm,
    viewMode = "country",
    variant = "light",
    placeholder,
    className = "",
    inputClassName = "",
    autoFocus = false,
  },
  ref
) {
  const [internalValue, setInternalValue] = useState("");
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const isControlled = controlledValue !== undefined;

  const { profiles } = useProfiles();

  // Compute the best suggestion depending on viewMode
  const suggestion = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return null;

    if (viewMode === "individual") {
      if (profiles && profiles.length > 0) {
        const p = profiles.find((p) => p.nickname.toLowerCase().startsWith(q));
        if (p && p.nickname.toLowerCase() !== q) return p.nickname;
      }
      const codeMatch = getCountryByCode(value.toUpperCase());
      if (codeMatch) return codeMatch.name;
      const match = COUNTRIES.find((c) => c.name.toLowerCase().startsWith(q));
      if (match && match.name.toLowerCase() !== q) return match.name;
      return null;
    }

    // Country mode
    const codeMatch = getCountryByCode(value.toUpperCase());
    if (codeMatch) return codeMatch.name;
    const match = COUNTRIES.find((c) => c.name.toLowerCase().startsWith(q));
    if (match && match.name.toLowerCase() !== q) return match.name;

    if (profiles && profiles.length > 0) {
      const p = profiles.find((p) => p.nickname.toLowerCase().startsWith(q));
      if (p && p.nickname.toLowerCase() !== q) return p.nickname;
    }

    return null;
  }, [value, profiles, viewMode]);

  const suggestionSuffix = useMemo(() => {
    if (!suggestion || !value.trim()) return "";
    return suggestion.slice(value.trim().length);
  }, [suggestion, value]);

  const setValue = useCallback(
    (v: string) => {
      if (!isControlled) setInternalValue(v);
      onChange(v);
    },
    [isControlled, onChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    [setValue]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion) {
        e.preventDefault();
        setValue(suggestion);
      } else if (e.key === "Enter" && value.trim()) {
        e.preventDefault();
        onConfirm?.(value.trim());
        setValue("");
      }
    },
    [suggestion, value, onConfirm, setValue]
  );

  const handleClear = useCallback(() => {
    setValue("");
  }, [setValue]);

  // Variant-specific styling
  const isGlass = variant === "glass";
  const wrapperClass = isGlass
    ? "w-full h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-sm transition-all duration-200 focus-within:bg-white/15 focus-within:border-white/25"
    : "w-full h-10 rounded-full bg-white border border-[#E5E7EB] shadow-sm transition-all duration-200 focus-within:border-[#F97316] focus-within:ring-2 focus-within:ring-orange-100";
  const iconColor = isGlass ? "text-white/55" : "text-gray-400 max-md:text-white/50";
  const placeholderColor = isGlass
    ? "placeholder-white/45 text-white/90"
    : "placeholder-gray-400 text-gray-900";
  const suggestionColor = isGlass ? "text-white/25" : "text-gray-300";
  const clearBg = isGlass ? "bg-white/15 hover:bg-white/25" : "bg-gray-100 hover:bg-gray-200";
  const clearIcon = isGlass ? "text-white/70" : "text-gray-500";

  const defaultPlaceholder = viewMode === "individual" ? "Search individuals..." : "Search countries...";

  return (
    <div className={`relative ${className}`}>
      <div className={`relative ${wrapperClass}`}>
        {/* Search icon on the LEFT */}
        <svg
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColor} pointer-events-none z-10`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          ref={ref}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? defaultPlaceholder}
          autoFocus={autoFocus}
          className={`w-full h-full pl-10 pr-9 bg-transparent rounded-full text-sm focus:outline-none ${placeholderColor} ${inputClassName}`}
        />

        {/* Gray suggestion overlay (positioned to align with input text) */}
        {suggestionSuffix && (
          <span
            className={`absolute top-0 left-0 h-10 pl-10 pr-9 flex items-center text-sm pointer-events-none ${suggestionColor}`}
            aria-hidden="true"
          >
            <span className="invisible">{value.trim()}</span>
            <span>{suggestionSuffix}</span>
          </span>
        )}
      </div>

      {/* Clear button */}
      {value && (
        <button
          onClick={handleClear}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full ${clearBg} transition-colors z-10`}
          aria-label="Clear search"
          type="button"
        >
          <svg className={`w-3 h-3 ${clearIcon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});
