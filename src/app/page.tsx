"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { GuestPopup } from "@/components/landing/GuestPopup";
import { useGuest } from "@/hooks/useGuest";

export default function HomePage() {
  const [showPopup, setShowPopup] = useState(false);
  const { guest, createGuest } = useGuest();
  const router = useRouter();

  const handleEnterClick = useCallback(() => {
    if (guest) {
      // Already have a guest, go straight to world
      router.push("/world");
    } else {
      setShowPopup(true);
    }
  }, [guest, router]);

  const handleGuestEnter = useCallback(
    (nickname: string, country: string) => {
      createGuest(nickname, country);
      router.push("/world");
    },
    [createGuest, router]
  );

  return (
    <main>
      <HeroSection onEnterClick={handleEnterClick} />
      <GuestPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        onEnter={handleGuestEnter}
      />
    </main>
  );
}
