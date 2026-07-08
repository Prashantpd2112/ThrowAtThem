"use client";

import { motion } from "framer-motion";
import { IndividualCard } from "./IndividualCard";
import { ProfileDetail } from "./ProfileDetail";
import { useProfiles } from "@/hooks/useProfiles";
import type { ProfileWithFallback } from "@/hooks/useProfiles";

interface IndividualViewProps {
  selectedProfile: ProfileWithFallback | null;
  onSelectProfile: (profile: ProfileWithFallback | null) => void;
  selectedProfileIndex?: number;
}

export function IndividualView({ selectedProfile, onSelectProfile, selectedProfileIndex = 0 }: IndividualViewProps) {
  const { profiles, profileRanks, throwCounts, loading } = useProfiles();

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
        {profiles.map((profile, index) => (
          <IndividualCard
            key={profile.id}
            profile={profile}
            rank={profileRanks[profile.id] || 0}
            index={index}
            onClick={handleCardClick}
          />
        ))}
      </div>
    </motion.div>
  );
}
