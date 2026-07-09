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

    // Guest row will be created by ensureGuestExists when the world page
    // mounts its presence effect. No need to fire-and-forget upsertGuest
    // here — that creates a race condition with ensureGuestExists and
    // causes 409 Conflict errors. The world page's presence effect
    // handles both the insert and update for the guest row.

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