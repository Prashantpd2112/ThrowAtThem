"use client";

import { useState, useCallback } from "react";
import { insertThrow, isSupabaseConfigured } from "@/lib/supabase";

export function useThrows() {
  const [error, setError] = useState<string | null>(null);

  const submitThrow = useCallback(
    async (
      guestId: string,
      nickname: string,
      throwerCountry: string,
      targetCountry: string,
      objectId: string,
      reason: string,
      targetProfileId?: string | null
    ) => {
      setError(null);
      if (!isSupabaseConfigured) {
        setError("Supabase not configured");
        return false;
      }
      try {
        await insertThrow({
          guest_id: guestId,
          nickname,
          thrower_country: throwerCountry,
          target_country: targetCountry,
          object: objectId,
          reason,
          target_profile_id: targetProfileId,
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit throw";
        setError(message);
        return false;
      }
    },
    []
  );

  return {
    submitThrow,
    error,
  };
}