"use client";

import { motion } from "framer-motion";
import { getProfileEmoji } from "@/hooks/useProfiles";
import { COUNTRIES } from "@/data/countries";
import type { ProfileWithFallback } from "@/hooks/useProfiles";

interface IndividualCardProps {
  profile: ProfileWithFallback;
  rank: number;
  index: number;
  onClick: (profile: ProfileWithFallback) => void;
}

export function IndividualCard({ profile, rank, index, onClick }: IndividualCardProps) {
  const emoji = profile.isDummy ? getProfileEmoji(profile.nickname, index) : "👤";
  const countryData = profile.country ? COUNTRIES.find((c) => c.code === profile.country) : null;
  const flag = countryData?.flag || "";
  const initials = profile.nickname
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: "easeOut" }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={() => onClick(profile)}
      data-profile-id={profile.id}
      className="group relative rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/[0.10] shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-all duration-300 p-5 flex flex-col items-center text-center cursor-pointer"
    >
      {/* Avatar circle */}
      <div className="w-[72px] h-[72px] rounded-full overflow-hidden mb-3.5 ring-2 ring-white/[0.08] group-hover:ring-orange-400/30 transition-all duration-300 flex items-center justify-center bg-gradient-to-br from-orange-400/20 via-pink-500/20 to-purple-500/20">
        {profile.profile_image ? (
          <img
            src={profile.profile_image}
            alt={profile.nickname}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-[32px] leading-none select-none">{emoji}</span>
        )}
      </div>

      {/* Country flag */}
      {profile.country && (
        <div className="absolute top-3 left-3 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/20 backdrop-blur-sm">
          <span className="text-xs leading-none">{flag}</span>
        </div>
      )}

      {/* Rank badge */}
      {rank > 0 && (
        <div
          className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg ${
            rank === 1
              ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white"
              : rank === 2
              ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
              : rank === 3
              ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white"
              : "bg-white/10 text-white/60 border border-white/10"
          }`}
        >
          #{rank}
        </div>
      )}

      {/* Crown for #1 — animated above avatar */}
      {rank === 1 && (
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }}
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.span
            className="text-base leading-none block"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            👑
          </motion.span>
        </motion.div>
      )}

      {/* Name */}
      <h3 className="text-[15px] font-bold text-white/90 mb-0.5 leading-tight">{profile.nickname}</h3>

      {/* Profession */}
      {profile.profession && (
        <p className="text-xs font-medium text-white/45 mb-2">{profile.profession}</p>
      )}

      {/* Bio - truncated */}
      {profile.bio && (
        <p className="text-[10px] text-white/35 leading-relaxed line-clamp-2 max-w-full">
          {profile.bio}
        </p>
      )}
    </motion.div>
  );
}
