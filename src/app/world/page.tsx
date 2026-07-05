"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Navigation } from "@/components/world/Navigation";
import { WorldMap } from "@/components/world/WorldMap";
import { ThrowPanel } from "@/components/world/ThrowPanel";
import { LiveFeed } from "@/components/world/LiveFeed";
import { Leaderboard } from "@/components/world/Leaderboard";
import { CountryPopup } from "@/components/world/CountryPopup";
import { ThrowAnimation, triggerThrowAnimation } from "@/components/world/ThrowAnimation";
import { useGuest } from "@/hooks/useGuest";
import { useThrows } from "@/hooks/useThrows";
import { COUNTRIES, getCountryByCode } from "@/data/countries";
import { getObjectById } from "@/data/objects";
import { supabase, DbThrow } from "@/lib/supabase";

export default function WorldPage() {
  const router = useRouter();
  const { guest, isLoaded, clearGuest } = useGuest();
  const { submitThrow } = useThrows();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryPopupCode, setCountryPopupCode] = useState<string | null>(null);
  const [showCountryPopup, setShowCountryPopup] = useState(false);
  const [isThrowing, setIsThrowing] = useState(false);
  const [selectedObject, setSelectedObject] = useState<string>("tomato");
  const [reason, setReason] = useState("");
  const [heatData, setHeatData] = useState<Record<string, number>>({});
  const [onlineCount, setOnlineCount] = useState(42);
  const [highlightedCountry, setHighlightedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const throwBtnRef = useRef<HTMLButtonElement>(null);

  // Redirect if no guest
  useEffect(() => {
    if (isLoaded && !guest) {
      router.replace("/");
    }
  }, [isLoaded, guest, router]);

  // Fetch heat data
  useEffect(() => {
    const fetchHeatData = async () => {
      try {
        const { data, error } = await supabase
          .from("throws")
          .select("target_country");
        if (error) throw error;
        const counts: Record<string, number> = {};
        (data as DbThrow[]).forEach((t) => {
          counts[t.target_country] = (counts[t.target_country] || 0) + 1;
        });
        setHeatData(counts);
      } catch {
        // silently handle
      }
    };
    fetchHeatData();
    const interval = setInterval(fetchHeatData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Simulate online count
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => Math.max(10, prev + Math.floor(Math.random() * 6) - 3));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Logout handler
  const handleLogout = useCallback(() => {
    clearGuest();
    router.replace("/");
  }, [clearGuest, router]);

  const handleCountryClick = useCallback((code: string) => {
    setSelectedCountry((prev) => (prev === code ? null : code));
  }, []);

  const handleSearchCountry = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        const normalized = query.toLowerCase().trim();
        const found = getCountryByCode(query.toUpperCase()) || getCountryByCode(query);
        if (found) {
          setHighlightedCountry(found.code);
          setSelectedCountry(found.code);
        } else {
          const foundByName = COUNTRIES.find(
            (c) => c.name.toLowerCase().includes(normalized) || c.code.toLowerCase() === normalized
          );
          if (foundByName) {
            setHighlightedCountry(foundByName.code);
            setSelectedCountry(foundByName.code);
          } else {
            setHighlightedCountry(null);
          }
        }
      } else {
        setHighlightedCountry(null);
      }
    },
    []
  );

  const handleThrow = useCallback(
    async (objectId: string, reason: string) => {
      if (!guest || !selectedCountry) return;
      setIsThrowing(true);

      const mapEl = mapRef.current;
      const btnEl = throwBtnRef.current;
      let startX = window.innerWidth * 0.5;
      let startY = window.innerHeight * 0.7;
      let targetX = window.innerWidth * 0.4;
      let targetY = window.innerHeight * 0.3;

      if (btnEl) {
        const r = btnEl.getBoundingClientRect();
        startX = r.left + r.width / 2;
        startY = r.top + r.height / 2;
      }
      if (mapEl) {
        const r = mapEl.getBoundingClientRect();
        targetX = r.left + r.width / 2;
        targetY = r.top + r.height / 3;
      }

      const obj = getObjectById(objectId);
      if (obj) {
        triggerThrowAnimation(obj.emoji, startX, startY, targetX, targetY, obj.particleColor);
      }

      const success = await submitThrow(guest.id, guest.nickname, guest.country, selectedCountry, objectId, reason);
      setIsThrowing(false);

      if (success && selectedCountry) {
        setHeatData((prev) => ({ ...prev, [selectedCountry]: (prev[selectedCountry] || 0) + 1 }));
      }
    },
    [guest, selectedCountry, submitThrow]
  );

  if (!isLoaded || !guest) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0B1120]">
        <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex gap-2 justify-center mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-orange-500 rounded-full"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <p className="text-sm text-white/60">Preparing the world...</p>
        </motion.div>
      </div>
    );
  }

  const guestCountry = getCountryByCode(guest.country);
  const targetCountry = selectedCountry ? getCountryByCode(selectedCountry) : null;

  return (
    <div className="h-screen flex flex-col ambient-bg grid-bg overflow-hidden">
      {/* Fixed throw animation layer - always on top */}
      <ThrowAnimation />

      {/* Header - fixed height, shrink-0 prevents stretching */}
      <div className="shrink-0">
        <Navigation
          nickname={guest.nickname}
          countryFlag={guestCountry?.flag || "🌍"}
          onlineCount={onlineCount}
          onSearchCountry={handleSearchCountry}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile search */}
      <div className="md:hidden shrink-0 px-4 pt-3 pb-1">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearchCountry(e.target.value);
            }}
            placeholder="Find a country..."
            className="w-full h-10 pl-10 pr-4 rounded-xl input-glass text-sm"
          />
        </div>
      </div>

      {/* Main content - fills remaining space, scroll if needed */}
      <div className="flex-1 min-h-0 px-4 md:px-5 pb-4 md:pb-6">
        <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">

          {/* LEFT SIDEBAR: Live Feed + Leaderboard */}
          <div className="hidden md:flex flex-col gap-4 md:col-span-3 lg:col-span-2 min-h-0">
            <div className="grow basis-0 min-h-0 overflow-hidden">
              <LiveFeed />
            </div>
            <div className="grow-[0.6] basis-0 min-h-0 overflow-hidden">
              <Leaderboard />
            </div>
          </div>

          {/* CENTER: Map + Info + Throw Button */}
          <div className="flex flex-col gap-3 md:col-span-6 lg:col-span-7 min-h-0">
            {/* Map Container - takes remaining space */}
            <div
              ref={mapRef}
              className="flex-1 min-h-0 glass-card p-1.5 flex items-center justify-center overflow-hidden"
            >
              <WorldMap
                onCountryClick={(code) => {
                  handleCountryClick(code);
                  if (selectedCountry === code) {
                    setCountryPopupCode(code);
                    setShowCountryPopup(true);
                  }
                }}
                selectedCountry={selectedCountry}
                heatData={heatData}
                highlightedCountry={highlightedCountry}
              />
            </div>

            {/* Country info bar + Throw button row */}
            <div className="shrink-0 flex items-center gap-3">
              {selectedCountry && targetCountry ? (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl glass-card-subtle shrink-0"
                >
                  <span className="text-lg">{targetCountry.flag}</span>
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{targetCountry.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{targetCountry.code}</span>
                  <button
                    onClick={() => { setCountryPopupCode(selectedCountry); setShowCountryPopup(true); }}
                    className="ml-1 text-[10px] font-bold text-blue-500 hover:text-orange-500 transition-colors"
                  >
                    Stats →
                  </button>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl glass-card-subtle shrink-0">
                  <div className="w-5 h-5 rounded-md bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                    <span className="text-xs opacity-40">🌍</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Click a country to begin</span>
                </div>
              )}

              {/* Desktop Throw button */}
              <div className="flex-1 hidden md:block">
                <button
                  ref={throwBtnRef}
                  onClick={() => handleThrow(selectedObject, reason)}
                  disabled={!selectedCountry || isThrowing}
                  className="btn-premium w-full h-12 flex items-center justify-center gap-2 text-base"
                >
                  {isThrowing ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Throwing...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2.5">
                      <span className="text-lg">🎯</span>
                      <span>Throw!</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Throw Config */}
          <div className="flex flex-col gap-3 md:col-span-3 min-h-0">
            {/* Throw Panel - takes remaining space */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ThrowPanel
                selectedCountry={selectedCountry}
                selectedObject={selectedObject}
                reason={reason}
                onObjectChange={setSelectedObject}
                onReasonChange={setReason}
                isThrowing={isThrowing}
              />
            </div>

            {/* Mobile throw button */}
            <div className="md:hidden shrink-0">
              <button
                onClick={() => handleThrow(selectedObject, reason)}
                disabled={!selectedCountry || isThrowing}
                className="btn-premium w-full h-12 flex items-center justify-center gap-2 text-base"
              >
                {isThrowing ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Throwing...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2.5">
                    <span className="text-lg">🎯</span>
                    <span>Throw!</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile: Live Feed + Leaderboard */}
          <div className="md:hidden flex flex-col gap-3">
            <div className="h-52">
              <LiveFeed />
            </div>
            <div className="h-52">
              <Leaderboard />
            </div>
          </div>

        </div>
      </div>

      {/* Country Popup */}
      <CountryPopup
        countryCode={countryPopupCode}
        isOpen={showCountryPopup}
        onClose={() => { setShowCountryPopup(false); setCountryPopupCode(null); }}
      />
    </div>
  );
}
