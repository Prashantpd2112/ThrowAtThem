"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COUNTRIES, getCountryByCode } from "@/data/countries";

interface WorldMapProps {
  onCountryClick: (countryCode: string) => void;
  selectedCountry: string | null;
  heatData?: Record<string, number>;
  highlightedCountry?: string | null;
}

export function WorldMap({ onCountryClick, selectedCountry, heatData, highlightedCountry }: WorldMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const heatMax = useMemo(() => {
    if (!heatData) return 1;
    return Math.max(...Object.values(heatData), 1);
  }, [heatData]);

  const getCountryColor = useCallback((code: string, baseColor: string): string => {
    if (selectedCountry === code) return "#F97316";
    if (highlightedCountry === code) return "#EF4444";

    if (heatData && heatData[code] !== undefined && heatMax > 0) {
      const ratio = heatData[code] / heatMax;
      if (ratio < 0.1) return "#DCFCE7";
      if (ratio < 0.25) return "#BBF7D0";
      if (ratio < 0.4) return "#FEF08A";
      if (ratio < 0.55) return "#FDE047";
      if (ratio < 0.7) return "#FB923C";
      if (ratio < 0.85) return "#F97316";
      return "#EF4444";
    }

    return baseColor;
  }, [heatData, heatMax, selectedCountry, highlightedCountry]);

  const viewBox = "100 10 610 320";

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <svg
        viewBox={viewBox}
        className="w-full h-auto max-w-full max-h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.06))" }}
      >
        {/* Ocean background */}
        <rect x="80" y="0" width="650" height="350" rx="16" fill="#E0F2FE" className="dark:fill-[#1E3A5F]/30" />

        {/* Decorative ocean waves */}
        {[40, 90, 140, 190, 240, 290].map((y, i) => (
          <path
            key={i}
            d={`M 80 ${y} Q 150 ${y - 8} 220 ${y} Q 290 ${y + 8} 360 ${y} Q 430 ${y - 8} 500 ${y} Q 570 ${y + 8} 640 ${y} Q 710 ${y - 8} 730 ${y}`}
            fill="none"
            stroke="#BAE6FD"
            strokeWidth="1.2"
            opacity={0.2 + i * 0.03}
            className="dark:stroke-[#3B82F6]/10"
          />
        ))}

        {/* Countries */}
        {COUNTRIES.map((country) => {
          const isHovered = hoveredCountry === country.code;
          const isSelected = selectedCountry === country.code;
          const isHighlighted = highlightedCountry === country.code;
          const color = getCountryColor(country.code, country.color);

          return (
            <g key={country.code}>
              {/* Shadow */}
              <path
                d={country.path}
                fill="rgba(0,0,0,0.06)"
                transform={`translate(1.5, 2)`}
                className="dark:fill-white/4"
              />
              {/* Country shape */}
              <motion.path
                d={country.path}
                fill={color}
                stroke={isSelected ? "#F97316" : "white"}
                strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="cursor-pointer"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: 1,
                  scale: isHovered ? 1.06 : isSelected ? 1.04 : 1,
                }}
                transition={{
                  duration: 0.3,
                  type: "spring",
                  stiffness: 250,
                  damping: 18,
                }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setHoveredCountry(country.code)}
                onHoverEnd={() => setHoveredCountry(null)}
                onClick={() => onCountryClick(country.code)}
                style={{ transformOrigin: `${country.coordinates.x}px ${country.coordinates.y}px` }}
              />

              {/* Country label on hover */}
              {(isHovered || isSelected) && (
                <motion.g
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <rect
                    x={country.coordinates.x - 24}
                    y={country.coordinates.y - 22}
                    width={48}
                    height={18}
                    rx={6}
                    fill="rgba(15,23,42,0.9)"
                  />
                  <text
                    x={country.coordinates.x}
                    y={country.coordinates.y - 9}
                    textAnchor="middle"
                    fill="white"
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="Nunito, system-ui, sans-serif"
                  >
                    {country.flag} {country.name}
                  </text>
                </motion.g>
              )}
            </g>
          );
        })}

        {/* Grid lines */}
        {[-80, -40, 0, 40, 80].map((lat, i) => (
          <ellipse
            key={`lat-${i}`}
            cx={410}
            cy={160}
            rx={320 * Math.cos((lat * Math.PI) / 180) + 50}
            ry={120 * Math.cos((lat * Math.PI) / 180)}
            fill="none"
            stroke="#BAE6FD"
            strokeWidth="0.4"
            opacity={0.12}
            className="dark:stroke-[#3B82F6]/8"
          />
        ))}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredCountry && !selectedCountry && (
          <motion.div
            className="absolute top-2 left-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-3 py-1.5 text-xs rounded-xl shadow-lg border border-gray-200 dark:border-white/10 z-10"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              {getCountryByCode(hoveredCountry)?.flag}{" "}
              {getCountryByCode(hoveredCountry)?.name}
            </span>
            {heatData && heatData[hoveredCountry] !== undefined && (
              <span className="ml-2 text-orange-500 font-bold">
                {heatData[hoveredCountry]}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-2.5 py-1.5 text-[10px] rounded-xl shadow-lg border border-gray-200 dark:border-white/10 flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400 font-medium">Activity</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#DCFCE7] border border-white/30" />
          <span className="w-3 h-3 rounded-sm bg-[#FEF08A] border border-white/30" />
          <span className="w-3 h-3 rounded-sm bg-[#FB923C] border border-white/30" />
          <span className="w-3 h-3 rounded-sm bg-[#EF4444] border border-white/30" />
        </div>
      </div>
    </div>
  );
}
