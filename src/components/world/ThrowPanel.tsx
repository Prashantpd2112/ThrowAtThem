"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { THROWABLE_OBJECTS } from "@/data/objects";
import { COUNTRIES } from "@/data/countries";

interface ThrowPanelProps {
  selectedCountry: string | null;
  selectedObject: string;
  reason: string;
  onObjectChange: (id: string) => void;
  onReasonChange: (reason: string) => void;
  isThrowing: boolean;
}

export function ThrowPanel({
  selectedCountry,
  selectedObject,
  reason,
  onObjectChange,
  onReasonChange,
  isThrowing,
}: ThrowPanelProps) {
  const targetCountry = COUNTRIES.find((c) => c.code === selectedCountry);
  const currentObject = THROWABLE_OBJECTS.find((o) => o.id === selectedObject);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  const scrollRight = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: 200, behavior: "smooth" });
  };

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Section heading */}
      <div className="flex items-center gap-2 pb-1">
        <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-orange-500 to-pink-500" />
        <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100">Throw Configuration</h3>
      </div>

      {/* Target Country */}
      <div>
        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
          Target Country
        </label>
        {targetCountry ? (
          <motion.div
            key={targetCountry.code}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/10"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 flex items-center justify-center">
              <span className="text-lg">{targetCountry.flag}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{targetCountry.name}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{targetCountry.code}</p>
            </div>
            <motion.div
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        ) : (
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
              <span className="text-lg opacity-40">🌍</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">Click a country on the map</p>
          </div>
        )}
      </div>

      {/* Object Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Throw Object
          </label>
          {currentObject && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              {currentObject.description}
            </span>
          )}
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex items-start gap-5 overflow-x-auto scrollbar-hide scroll-smooth pl-4 pr-10 py-2"
          >
            {THROWABLE_OBJECTS.map((obj) => {
              const isSelected = selectedObject === obj.id;
              return (
                <motion.button
                  key={obj.id}
                  whileHover={{ scale: 1.15, y: -3 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onObjectChange(obj.id)}
                  className="relative shrink-0 flex flex-col items-center justify-center w-12 h-12 p-0 bg-transparent border-0 outline-none focus:outline-none focus:ring-0"
                  aria-label={obj.name}
                  aria-pressed={isSelected}
                  type="button"
                >
                  {isSelected && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-gray-300/55 dark:bg-white/15 blur-[6px] -z-10"
                      style={{ boxShadow: "0 0 14px 2px rgba(160,160,160,0.35)" }}
                    />
                  )}
                  <span
                    className={`text-[30px] leading-none transition-opacity duration-200 ${
                      isSelected ? "opacity-100" : "opacity-90"
                    }`}
                  >
                    {obj.emoji}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {canScrollRight && (
            <button
              type="button"
              onClick={scrollRight}
              aria-label="Scroll objects right"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-700/85 dark:bg-white/15 hover:bg-gray-800 dark:hover:bg-white/25 flex items-center justify-center shadow-md backdrop-blur-sm transition-colors z-10"
            >
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Reason Box */}
      <div>
        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
          Reason <span className="font-normal lowercase text-gray-400 dark:text-gray-500">(optional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={reason}
            onChange={(e) => {
              const value = e.target.value.replace(/[\r\n]+/g, " ");
              if (value.length <= 50) {
                onReasonChange(value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
            placeholder='e.g. "For the sushi!"'
            maxLength={50}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 resize-none"
          />
        </div>
      </div>
    </div>
  );
}