"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { IndividualCard } from "./IndividualCard";
import { ProfileDetail } from "./ProfileDetail";
import { useProfiles } from "@/hooks/useProfiles";
import type { ProfileWithFallback } from "@/hooks/useProfiles";

interface IndividualViewProps {
  selectedProfile: ProfileWithFallback | null;
  onSelectProfile: (profile: ProfileWithFallback | null) => void;
  selectedProfileIndex?: number;
  searchQuery?: string;
}

export function IndividualView({ selectedProfile, onSelectProfile, selectedProfileIndex = 0, searchQuery = "" }: IndividualViewProps) {
  const { profiles, profileRanks, throwCounts, loading } = useProfiles();

  // Filter profiles by search query (case-insensitive, partial match on nickname)
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => p.nickname.toLowerCase().includes(q));
  }, [profiles, searchQuery]);

  const handleCardClick = (profile: ProfileWithFallback) => {
    onSelectProfile(profile);
  };

  // Show full-screen profile detail when one is selected
  // Get the real throw count for the selected profile
  const selectedThrowCount = selectedProfile ? (throwCounts[selectedProfile.id] || 0) : 0;

  if (selectedProfile) {
    return (
      <ProfileDetail
        profile={selectedProfile}
        throwCount={selectedThrowCount}
        index={selectedProfileIndex}
      />
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 bg-orange-500 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full h-full overflow-y-auto px-0.5 py-1 scrollbar-none"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-max">
        {filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile, index) => (
            <IndividualCard
              key={profile.id}
              profile={profile}
              rank={profileRanks[profile.id] || 0}
              index={index}
              onClick={handleCardClick}
            />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white/70 mb-1">No profiles found</p>
            <p className="text-xs text-white/40">Try another search.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
