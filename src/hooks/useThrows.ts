"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useThrows() {
  const [error, setError] = useState<string | null>(null);

  const submitThrow = useCallback(
    async (
      guestId: string,
      nickname: string,
      throwerCountry: string,
      targetCountry: string,
      objectId: string,
      reason: string
    ) => {
      setError(null);
      try {
        const { error } = await supabase.from("throws").insert({
          guest_id: guestId,
          nickname,
          thrower_country: throwerCountry,
          target_country: targetCountry,
          object: objectId,
          reason,
        });

        if (error) throw error;
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit throw");
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
