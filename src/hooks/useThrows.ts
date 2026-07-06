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
      reason: string
    ) => {
      setError(null);
      if (!isSupabaseConfigured) {
        setError("Supabase not configured");
        return false;
      }
      try {
        console.log("[useThrows] Calling insertThrow...");
        await insertThrow({
          guest_id: guestId,
          nickname,
          thrower_country: throwerCountry,
          target_country: targetCountry,
          object: objectId,
          reason,
        });
        console.log("[useThrows] insertThrow completed successfully");
        return true;
      } catch (err) {
        console.error("[useThrows] insertThrow failed:", err);
        // Log full Supabase error details if available
        if (typeof err === "object" && err !== null) {
          const e = err as any;
          if (e.details || e.hint || e.code || e.status) {
            console.error("[useThrows] Supabase error details:", {
              message: e.message,
              details: e.details,
              hint: e.hint,
              code: e.code,
              status: e.status,
            });
          }
        }
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