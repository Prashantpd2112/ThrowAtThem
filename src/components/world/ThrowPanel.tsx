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
    <div className="card p-3 space-y-3">
      {/* Target Country */}
      <div>
        <label className="block text-[11px] font-semibold text-wt-muted uppercase tracking-wider mb-1.5">
          Target
        </label>
        {targetCountry ? (
          <motion.div
            key={targetCountry.code}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-wt-orange/10 border border-orange-200 dark:border-wt-orange/20"
          >
            <span className="text-lg">{targetCountry.flag}</span>
            <span className="font-semibold text-sm text-wt-text dark:text-white truncate">
              {targetCountry.name}
            </span>
          </motion.div>
        ) : (
          <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10">
            <p className="text-xs text-wt-muted italic">Click a country on the map</p>
          </div>
        )}
      </div>

      {/* Object Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-wt-muted uppercase tracking-wider mb-1.5">
          Object
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {THROWABLE_OBJECTS.map((obj) => (
            <motion.button
              key={obj.id}
              whileHover={{ scale: 1.1, y: -1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onObjectChange(obj.id)}
              className={`
                relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all duration-150
                ${
                  selectedObject === obj.id
                    ? "border-wt-orange bg-orange-50 dark:bg-wt-orange/10 shadow-sm"
                    : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-white/5"
                }
              `}
            >
              <span className="text-lg leading-none">{obj.emoji}</span>
              <span className="text-[9px] font-medium text-wt-text dark:text-gray-300 truncate w-full text-center leading-tight">
                {obj.name}
              </span>
              {selectedObject === obj.id && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-wt-orange rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reason Box */}
      <div>
        <label className="block text-[11px] font-semibold text-wt-muted uppercase tracking-wider mb-1.5">
          Reason <span className="font-normal lowercase text-wt-muted">(optional)</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value.slice(0, 100))}
          placeholder='e.g. "For the sushi!"'
          maxLength={100}
          disabled={!selectedCountry}
          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-wt-orange dark:focus:border-wt-orange outline-none transition-colors text-sm text-wt-text dark:text-white placeholder-wt-muted disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <div className="flex justify-end mt-0.5">
          <span className={`text-[10px] font-medium ${reason.length > 80 ? "text-wt-orange" : "text-wt-muted"}`}>
            {reason.length}/100
          </span>
        </div>
      </div>
    </div>
  );
}
