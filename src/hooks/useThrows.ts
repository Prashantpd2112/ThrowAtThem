"use client";

import { useCallback } from "react";
import { insertThrow, isSupabaseConfigured } from "@/lib/supabase";

export function useThrows() {
  const submitThrow = useCallback(
    (
      guestId: string,
      nickname: string,
      throwerCountry: string,
      targetCountry: string,
      objectId: string,
      reason: string,
      targetProfileId?: string | null
    ) => {
      // Fire DB insert in background — never block the UI
      if (isSupabaseConfigured) {
        insertThrow({
          guest_id: guestId,
          nickname,
          thrower_country: throwerCountry,
          target_country: targetCountry,
          object: objectId,
          reason,
          target_profile_id: targetProfileId,
        }).catch((err) => {
          console.error("[submitThrow] DB insert failed:", err);
        });
      }
    },
    []
  );

  return {
    submitThrow,
  };
}
