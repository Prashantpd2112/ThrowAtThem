"use client";

import { motion } from "framer-motion";
import { getProfileEmoji, getFlagEmoji } from "@/hooks/useProfiles";
import { getCountryByCode } from "@/data/countries";
import type { ProfileWithFallback } from "@/hooks/useProfiles";

interface ProfileDetailProps {
  profile: ProfileWithFallback;
  throwCount: number;
  index: number;
}

export function ProfileDetail({ profile, throwCount, index }: ProfileDetailProps) {
  const emoji = profile.isDummy ? getProfileEmoji(profile.nickname, index) : "👤";
  const countryData = profile.country ? getCountryByCode(profile.country) : null;
  const countryName = countryData?.name || profile.country;
  const flag = getFlagEmoji(profile.country);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full h-full flex flex-col"
    >
      <div className="flex-1 min-h-0 flex items-center justify-center px-2 py-1">
        <div className="relative w-full max-w-sm rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/[0.10] shadow-[0_8px_30px_rgba(0,0,0,0.18)] p-5 md:p-6 flex flex-col items-center text-center">
          {/* Country pill — top-left */}
          {profile.country && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-xs leading-none">{flag}</span>
              <span className="text-[10px] font-medium text-white/60">{countryName}</span>
            </div>
          )}

          {/* Avatar */}
          <div className="w-[88px] h-[88px] md:w-[100px] md:h-[100px] rounded-full overflow-hidden mb-3.5 ring-3 ring-white/[0.10] flex items-center justify-center bg-gradient-to-br from-orange-400/20 via-pink-500/20 to-purple-500/20 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            {profile.profile_image ? (
              <img
                src={profile.profile_image}
                alt={profile.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[40px] md:text-[48px] leading-none select-none">{emoji}</span>
            )}
          </div>

          {/* Name */}
          <h2 className="text-lg md:text-xl font-bold text-white/90 mb-0.5 leading-tight">{profile.nickname}</h2>

          {/* Profession */}
          {profile.profession && (
            <p className="text-sm font-medium text-white/50 mb-3">{profile.profession}</p>
          )}

          {/* Total Throws */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.5px] mb-0.5">
              Total Throws
            </span>
            <span className="text-lg font-bold text-white/80 tabular-nums">{throwCount}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
