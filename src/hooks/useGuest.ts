"use client";

import { useState, useEffect, useCallback } from "react";
import { generateGuestId, generateNickname, getLocalStorage, setLocalStorage } from "@/lib/utils";
import { upsertGuest, isSupabaseConfigured } from "@/lib/supabase";

interface GuestData {
  id: string;
  nickname: string;
  country: string;
}

export function useGuest() {
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const saved = getLocalStorage<GuestData | null>("wt_guest", null);
    if (saved) {
      setGuest(saved);
    }
    setIsLoaded(true);
  }, []);

  const createGuest = useCallback((nickname: string, country: string) => {
    const newGuest: GuestData = {
      id: generateGuestId(),
      nickname: nickname || generateNickname(),
      country,
    };
    setLocalStorage("wt_guest", newGuest);
    setGuest(newGuest);
    setSyncError(null);

    // Sync to Supabase in the background (fire and forget)
    if (isSupabaseConfigured) {
      upsertGuest(newGuest).catch((err) => {
        console.warn("Failed to sync guest to Supabase:", err);
        setSyncError("Guest sync failed, but you can still play");
      });
    }

    return newGuest;
  }, []);

  const updateNickname = useCallback((nickname: string) => {
    if (!guest) return;
    const updated = { ...guest, nickname: nickname || generateNickname() };
    setLocalStorage("wt_guest", updated);
    setGuest(updated);

    if (isSupabaseConfigured) {
      upsertGuest(updated).catch((err) => {
        console.warn("Failed to sync nickname to Supabase:", err);
      });
    }
  }, [guest]);

  const clearGuest = useCallback(() => {
    localStorage.removeItem("wt_guest");
    setGuest(null);
  }, []);

  return {
    guest,
    isLoaded,
    createGuest,
    updateNickname,
    clearGuest,
    syncError,
  };
}