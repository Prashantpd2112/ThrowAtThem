"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ViewMode = "individual" | "country";

interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ value, onChange }: ViewModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { value: ViewMode; label: string }[] = [
    { value: "individual", label: "👤 Individual" },
    { value: "country", label: "🌍 Country" },
  ];

  const currentLabel = options.find((o) => o.value === value)?.label ?? "👤 Individual";

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-white/15 active:bg-white/20 transition-all duration-200 text-sm text-white/90 font-medium select-none"
      >
        <span className="leading-none">{currentLabel}</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="w-3 h-3 text-white/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-1.5 min-w-[150px] rounded-xl bg-black/70 backdrop-blur-xl border border-white/15 shadow-xl overflow-hidden z-40"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-sm transition-colors duration-150 flex items-center gap-2 ${
                    isSelected
                      ? "text-white/65 bg-transparent"
                      : "text-white font-semibold bg-white/10 hover:bg-white/10"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
