"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCountryByCode } from "@/data/countries";
import { countryCentroidLatLng } from "./worldMapUtils";
import type { WorldMapGlobeSceneProps } from "./WorldMapGlobeScene";

interface WorldMapProps {
  onCountryClick: (countryCode: string) => void;
  onBackgroundClick?: () => void;
  selectedCountry: string | null;
  heatData?: Record<string, number>;
  highlightedCountry?: string | null;
}

const GlobeScene = dynamic<WorldMapGlobeSceneProps>(() => import("./WorldMapGlobeScene"), {
  ssr: false,
  loading: () => null,
});

function useIdle(resumeAfterMs = 4000) {
  const [idle, setIdle] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      setIdle(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), resumeAfterMs);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousedown",
      "mousemove",
      "wheel",
      "touchstart",
      "touchmove",
      "keydown",
    ];

    events.forEach((eventName) => window.addEventListener(eventName, reset, { passive: true }));
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [resumeAfterMs]);

  return idle;
}

function HoverLabel({ code }: { code: string | null }) {
  if (!code) return null;
  const country = getCountryByCode(code);
  if (!country) return null;

  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-md text-sm font-semibold text-black bg-white/90 border border-slate-200 shadow-lg backdrop-blur-sm"
      style={{ top: "12%" }}
    >
      {country.flag} {country.name}
    </div>
  );
}

export function WorldMap({
  onCountryClick,
  onBackgroundClick,
  selectedCountry,
  heatData,
  highlightedCountry,
}: WorldMapProps) {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const idle = useIdle(4500);

  useEffect(() => {
    if (!highlightedCountry) {
      setFlyTo(null);
      return;
    }

    const country = getCountryByCode(highlightedCountry);
    if (!country) return;
    setFlyTo(countryCentroidLatLng(country));
  }, [highlightedCountry]);

  const heatMax = useMemo(() => {
    if (!heatData) return 1;
    return Math.max(...Object.values(heatData), 1);
  }, [heatData]);

  return (
    <div className="relative w-full h-full overflow-visible">
      <GlobeScene
        selectedCountry={selectedCountry}
        highlightedCountry={highlightedCountry ?? null}
        heatData={heatData}
        heatMax={heatMax}
        hoveredCode={hoveredCode}
        setHoveredCode={setHoveredCode}
        onCountryClick={onCountryClick}
        onBackgroundClick={onBackgroundClick}
        flyTo={flyTo}
        autoRotate={idle && !hoveredCode && !selectedCountry && !highlightedCountry}
      />
      <HoverLabel code={hoveredCode} />
    </div>
  );
}

export default WorldMap;
