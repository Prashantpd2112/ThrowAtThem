"use client";

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
        <div className="grid grid-cols-4 gap-2">
          {THROWABLE_OBJECTS.map((obj) => (
            <motion.button
              key={obj.id}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onObjectChange(obj.id)}
              className={`
                relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl transition-all duration-200
                ${
                  selectedObject === obj.id
                    ? "object-tile selected"
                    : "object-tile"
                }
              `}
            >
              <span className="text-xl leading-none">{obj.emoji}</span>
              <span className="text-[9px] font-semibold text-gray-700 dark:text-gray-200 truncate w-full text-center leading-tight">
                {obj.name}
              </span>
              {selectedObject === obj.id && (
                <motion.div
                  layoutId="selectedObject"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center shadow-md"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          ))}
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
