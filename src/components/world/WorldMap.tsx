"use client";

import { useState, useMemo } from "react";
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

  const getCountryColor = (code: string, baseColor: string): string => {
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
  };

  const viewBox = "100 10 610 320";

  return (
    <div className="relative w-full">
      <svg
        viewBox={viewBox}
        className="w-full h-auto drop-shadow-md"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))" }}
      >
        {/* Ocean background */}
        <rect x="80" y="0" width="650" height="350" rx="16" fill="#E0F2FE" className="dark:fill-[#1E3A5F]/40" />

        {/* Decorative ocean waves */}
        {[40, 90, 140, 190, 240, 290].map((y, i) => (
          <path
            key={i}
            d={`M 80 ${y} Q 150 ${y - 8} 220 ${y} Q 290 ${y + 8} 360 ${y} Q 430 ${y - 8} 500 ${y} Q 570 ${y + 8} 640 ${y} Q 710 ${y - 8} 730 ${y}`}
            fill="none"
            stroke="#BAE6FD"
            strokeWidth="1.5"
            opacity={0.25 + i * 0.04}
            className="dark:stroke-[#3B82F6]/15"
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
                fill="rgba(0,0,0,0.08)"
                transform={`translate(1.5, 2)`}
                className="dark:fill-white/5"
              />
              {/* Country shape */}
              <motion.path
                d={country.path}
                fill={color}
                stroke={isSelected ? "#F97316" : "white"}
                strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
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
                  transition={{ duration: 0.12 }}
                >
                  <rect
                    x={country.coordinates.x - 22}
                    y={country.coordinates.y - 20}
                    width={44}
                    height={18}
                    rx={5}
                    fill="rgba(15,23,42,0.85)"
                  />
                  <text
                    x={country.coordinates.x}
                    y={country.coordinates.y - 7}
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
            opacity={0.15}
            className="dark:stroke-[#3B82F6]/10"
          />
        ))}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredCountry && !selectedCountry && (
          <motion.div
            className="absolute top-1 left-1 card px-2.5 py-1.5 text-xs shadow-md"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {getCountryByCode(hoveredCountry)?.flag}{" "}
            {getCountryByCode(hoveredCountry)?.name}
            {heatData && heatData[hoveredCountry] !== undefined && (
              <span className="ml-1.5 text-wt-muted font-medium">
                {heatData[hoveredCountry]}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-1 right-1 card px-2 py-1 text-[10px] flex items-center gap-1.5 shadow-sm">
        <span className="text-wt-muted">Activity:</span>
        <span className="w-2.5 h-2.5 rounded-sm bg-[#DCFCE7]" />
        <span className="w-2.5 h-2.5 rounded-sm bg-[#FEF08A]" />
        <span className="w-2.5 h-2.5 rounded-sm bg-[#FB923C]" />
        <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
      </div>
    </div>
  );
}
