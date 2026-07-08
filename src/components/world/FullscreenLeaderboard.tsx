"use client";

import { Leaderboard } from "./Leaderboard";

export default function FullscreenLeaderboard() {
  return (
    <div className="absolute inset-0 flex flex-col px-4 py-4 md:px-8 md:py-6 overflow-hidden">
      <div className="w-full max-w-3xl mx-auto flex-1 min-h-0">
        <div className="w-full h-full rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 overflow-hidden">
          <Leaderboard transparent />
        </div>
      </div>
    </div>
  );
}
