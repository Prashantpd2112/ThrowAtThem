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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wt-blue via-wt-sky to-wt-cream dark:from-wt-dark dark:via-[#16213e] dark:to-[#1a1a2e]">
        <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex gap-2 justify-center mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-wt-orange rounded-full"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <p className="text-wt-muted text-sm">Preparing the world...</p>
        </motion.div>
      </div>
    );
  }

  const guestCountry = getCountryByCode(guest.country);
  const targetCountry = selectedCountry ? getCountryByCode(selectedCountry) : null;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-sky-50 to-amber-50 dark:from-wt-dark dark:via-[#0F172A] dark:to-[#1E293B] overflow-hidden">
      <ThrowAnimation />

      {/* Header */}
      <Navigation
        nickname={guest.nickname}
        countryFlag={guestCountry?.flag || "🌍"}
        onlineCount={onlineCount}
        onSearchCountry={handleSearchCountry}
        onLogout={handleLogout}
      />

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-2 pt-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearchCountry(e.target.value);
          }}
          placeholder="Find a country..."
          className="w-full px-3 py-1.5 pl-8 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-wt-orange outline-none transition-colors text-sm text-wt-text dark:text-white placeholder-wt-muted"
        />
      </div>

      {/* Main content - fills remaining height, no scroll */}
      <div className="flex-1 min-h-0 px-4 pb-4">
        <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-3">

          {/* LEFT: Live Feed + Leaderboard */}
          <div className="hidden md:flex md:col-span-3 flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0">
              <LiveFeed />
            </div>
            <div className="flex-1 min-h-0">
              <Leaderboard />
            </div>
          </div>

          {/* CENTER: Map + Throw Button */}
          <div className="md:col-span-6 flex flex-col gap-3 min-h-0">
            {/* Map */}
            <div ref={mapRef} className="flex-1 min-h-0 card p-2 flex items-center justify-center">
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

            {/* Selected country quick info + Throw button */}
            <div className="flex items-center gap-3">
              {selectedCountry && targetCountry ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-wt-orange/10 border border-orange-200 dark:border-wt-orange/20 shrink-0">
                  <span className="text-base">{targetCountry.flag}</span>
                  <span className="font-semibold text-xs text-wt-text dark:text-white">{targetCountry.name}</span>
                  <button
                    onClick={() => { setCountryPopupCode(selectedCountry); setShowCountryPopup(true); }}
                    className="ml-1 text-[10px] font-semibold text-wt-blue hover:text-wt-orange transition-colors"
                  >
                    Stats →
                  </button>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 shrink-0">
                  <span className="text-xs text-wt-muted">Click a country</span>
                </div>
              )}

              {/* Large Throw Button */}
              <button
                ref={throwBtnRef}
                onClick={() => handleThrow(selectedObject, reason)}
                disabled={!selectedCountry || isThrowing}
                className="flex-1 py-3 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-wt-orange to-orange-500 shadow-lg shadow-wt-orange/25 hover:shadow-wt-orange/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hidden md:block"
              >
                {isThrowing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Throwing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🎯 Throw!
                  </span>
                )}
              </button>

              {/* Mobile throw button */}
              <button
                onClick={() => handleThrow(selectedObject, reason)}
                disabled={!selectedCountry || isThrowing}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-wt-orange to-orange-500 shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all md:hidden"
              >
                {isThrowing ? "Throwing..." : "🎯 Throw!"}
              </button>
            </div>
          </div>

          {/* RIGHT: Target + Object + Reason */}
          <div className="md:col-span-3 flex flex-col gap-3 min-h-0">
            {/* Throw Panel (compact) */}
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
          </div>

          {/* Mobile: Live Feed + Leaderboard (stacked below on small screens) */}
          <div className="md:hidden flex flex-col gap-3 mt-2">
            <div className="h-48">
              <LiveFeed />
            </div>
            <div className="h-48">
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
