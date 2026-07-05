"use client";

import { useState, useEffect, useCallback } from "react";
import { generateGuestId, generateNickname, getLocalStorage, setLocalStorage } from "@/lib/utils";

interface GuestData {
  id: string;
  nickname: string;
  country: string;
}

export function useGuest() {
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
    return newGuest;
  }, []);

  const updateNickname = useCallback((nickname: string) => {
    if (!guest) return;
    const updated = { ...guest, nickname: nickname || generateNickname() };
    setLocalStorage("wt_guest", updated);
    setGuest(updated);
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
  };
}
