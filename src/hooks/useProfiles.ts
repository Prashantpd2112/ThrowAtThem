"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { insertProfile, fetchProfiles, fetchProfileThrowCounts, createProfilesSubscription, createThrowsSubscription, isSupabaseConfigured } from "@/lib/supabase";
import type { DbIndividualProfile } from "@/lib/supabase";

// Dummy fallback profiles used when Supabase is not configured or has no data yet
const DUMMY_PROFILES: DbIndividualProfile[] = [
  { id: "dummy-1", guest_id: "", nickname: "Prashant Dwivedi", profile_image: "", profession: "AI Engineer", country: "IN", city: "Mumbai", bio: "Building intelligent systems that make a difference.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-2", guest_id: "", nickname: "Aman Verma", profile_image: "", profession: "Doctor", country: "IN", city: "Delhi", bio: "Dedicated to saving lives every day.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-3", guest_id: "", nickname: "John Doe", profile_image: "", profession: "Designer", country: "US", city: "San Francisco", bio: "Creating beautiful digital experiences.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-4", guest_id: "", nickname: "Sarah Khan", profile_image: "", profession: "Researcher", country: "GB", city: "London", bio: "Exploring the frontiers of science.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-5", guest_id: "", nickname: "Riya Sharma", profile_image: "", profession: "Software Engineer", country: "IN", city: "Bangalore", bio: "Full-stack developer passionate about React.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-6", guest_id: "", nickname: "Arjun Mehta", profile_image: "", profession: "Founder", country: "IN", city: "Pune", bio: "Turning ideas into reality.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-7", guest_id: "", nickname: "Priya Patel", profile_image: "", profession: "Teacher", country: "IN", city: "Ahmedabad", bio: "Shaping the minds of tomorrow.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-8", guest_id: "", nickname: "Vikram Singh", profile_image: "", profession: "Architect", country: "IN", city: "Jaipur", bio: "Designing spaces that inspire.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-9", guest_id: "", nickname: "Neha Gupta", profile_image: "", profession: "Data Scientist", country: "IN", city: "Hyderabad", bio: "Finding insights in data.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-10", guest_id: "", nickname: "Rohan Joshi", profile_image: "", profession: "Product Manager", country: "IN", city: "Mumbai", bio: "Building products people love.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-11", guest_id: "", nickname: "Ananya Reddy", profile_image: "", profession: "UX Designer", country: "IN", city: "Chennai", bio: "Crafting intuitive user journeys.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-12", guest_id: "", nickname: "Karan Malhotra", profile_image: "", profession: "Fintech Analyst", country: "IN", city: "Gurgaon", bio: "Revolutionizing financial technology.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-13", guest_id: "", nickname: "Isha Nair", profile_image: "", profession: "Journalist", country: "IN", city: "Kochi", bio: "Telling stories that matter.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-14", guest_id: "", nickname: "Aditya Kapoor", profile_image: "", profession: "Photographer", country: "IN", city: "Goa", bio: "Capturing moments in time.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-15", guest_id: "", nickname: "Maya Desai", profile_image: "", profession: "Chef", country: "IN", city: "Kolkata", bio: "Creating culinary masterpieces.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-16", guest_id: "", nickname: "Rahul Pillai", profile_image: "", profession: "Game Developer", country: "IN", city: "Trivandrum", bio: "Building worlds one pixel at a time.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-17", guest_id: "", nickname: "Tara Bhat", profile_image: "", profession: "Climate Scientist", country: "IN", city: "Shimla", bio: "Protecting our planet for future generations.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-18", guest_id: "", nickname: "Devendra Chauhan", profile_image: "", profession: "Musician", country: "IN", city: "Varanasi", bio: "Creating melodies that move souls.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-19", guest_id: "", nickname: "Kavya Iyer", profile_image: "", profession: "Lawyer", country: "IN", city: "Bangalore", bio: "Fighting for justice and equality.", social_link: "", likes: 0, views: 0, created_at: "" },
  { id: "dummy-20", guest_id: "", nickname: "Sam Wilson", profile_image: "", profession: "Student", country: "US", city: "New York", bio: "Learning and growing every day.", social_link: "", likes: 0, views: 0, created_at: "" },
];

export type ProfileWithFallback = DbIndividualProfile & { isDummy?: boolean };

const EMOJI_MAP: Record<string, string> = {
  "Prashant Dwivedi": "🚀", "Aman Verma": "🩺", "John Doe": "🎨", "Sarah Khan": "🔬",
  "Riya Sharma": "💻", "Arjun Mehta": "🏢", "Priya Patel": "📚", "Vikram Singh": "🏛️",
  "Neha Gupta": "📊", "Rohan Joshi": "📋", "Ananya Reddy": "✨", "Karan Malhotra": "💰",
  "Isha Nair": "📝", "Aditya Kapoor": "📸", "Maya Desai": "👨‍🍳", "Rahul Pillai": "🎮",
  "Tara Bhat": "🌱", "Devendra Chauhan": "🎵", "Kavya Iyer": "⚖️", "Sam Wilson": "🎓",
};

export function getProfileEmoji(nickname: string, index: number): string {
  return EMOJI_MAP[nickname] || ["🌟", "💡", "🎯", "🔥", "🌈", "⭐", "💎", "🎪", "🏆"][index % 10];
}

export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Compute rankings from throw counts
function computeRankings(throwCounts: Record<string, number>): Record<string, number> {
  const entries = Object.entries(throwCounts).sort((a, b) => b[1] - a[1]);
  const rankings: Record<string, number> = {};
  entries.forEach(([id], index) => {
    rankings[id] = index + 1;
  });
  return rankings;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<ProfileWithFallback[]>([]);
  const [profileRanks, setProfileRanks] = useState<Record<string, number>>({});
  const [throwCounts, setThrowCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const throwsUnsubRef = useRef<(() => void) | null>(null);

  // Recompute rankings whenever throwCounts changes
  useEffect(() => {
    setProfileRanks(computeRankings(throwCounts));
  }, [throwCounts]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Supabase not configured at all — show static demo profiles
      setThrowCounts({});
      setProfiles(DUMMY_PROFILES.map((p) => ({ ...p, isDummy: true })));
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [profilesData, counts] = await Promise.all([
          fetchProfiles(),
          fetchProfileThrowCounts(),
        ]);
        console.log('[useProfiles] fetchProfiles returned', profilesData.length, 'profiles');
        if (profilesData.length === 0) {
          // Database exists but is empty — show empty state, not dummy profiles.
          // Dummy profile IDs don't exist in Supabase and would cause FK violations
          // in the throws table. Users must create a real profile via the Create button.
          console.log('[useProfiles] individual_profiles table is empty — showing empty state');
          setThrowCounts({});
          setProfiles([]);
        } else {
          console.log('[useProfiles] loaded real profiles:', profilesData.map(p => ({ id: p.id, nickname: p.nickname })));
          setThrowCounts(counts);
          setProfiles(profilesData.map((p) => ({ ...p, isDummy: false })));
        }
      } catch (err) {
        console.error('[useProfiles] Failed to fetch profiles:', err);
        // Database query failed — show empty state for real data.
        // Dummy profiles would throw FK violations on insert.
        setThrowCounts({});
        setProfiles([]);
      }
      setLoading(false);
    };

    load();

    // Subscribe to profile changes
    unsubscribeRef.current = createProfilesSubscription((newProfile, event) => {
      if (event === "INSERT") {
        setProfiles((prev) => {
          // Prevent duplicate: if this profile already exists in state, skip
          if (prev.some((p) => p.id === newProfile.id)) return prev;
          const hasReal = prev.some((p) => !p.isDummy);
          if (!hasReal && prev.length > 0) {
            return [{ ...newProfile, isDummy: false }, ...prev.filter((p) => p.isDummy)];
          }
          return [{ ...newProfile, isDummy: false }, ...prev];
        });
      } else if (event === "DELETE") {
        setProfiles((prev) => prev.filter((p) => p.id !== newProfile.id));
      } else if (event === "UPDATE") {
        setProfiles((prev) => prev.map((p) => (p.id === newProfile.id ? { ...newProfile, isDummy: false } : p)));
      }
    });

    // Subscribe to throws for live ranking updates
    throwsUnsubRef.current = createThrowsSubscription((newThrow) => {
      if (newThrow.target_profile_id) {
        const id = newThrow.target_profile_id;
        setThrowCounts((prev) => ({
          ...prev,
          [id]: (prev[id] || 0) + 1,
        }));
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (throwsUnsubRef.current) {
        throwsUnsubRef.current();
      }
    };
  }, []);

  // Manual refetch — used after creating a profile to bypass realtime subscription delays
  const refetchProfiles = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const [profilesData, counts] = await Promise.all([
        fetchProfiles(),
        fetchProfileThrowCounts(),
      ]);
      setProfiles(profilesData.map((p) => ({ ...p, isDummy: false })));
      setThrowCounts(counts);
    } catch (err) {
      console.error("[useProfiles] refetch failed:", err);
    }
  }, []);

  const createProfile = useCallback(async (profileData: {
    guest_id: string;
    nickname: string;
    profile_image: string;
    profession: string;
    country: string;
    city: string;
    bio: string;
    social_link: string;
  }): Promise<string | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const id = await insertProfile(profileData);
      return id;
    } catch (err) {
      console.error("Failed to create profile:", err);
      return null;
    }
  }, []);

  // Sort profiles by total throw count descending (matches Leaderboard order)
  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const countA = throwCounts[a.id] || 0;
      const countB = throwCounts[b.id] || 0;
      return countB - countA;
    });
  }, [profiles, throwCounts]);

  return {
    profiles: sortedProfiles,
    profileRanks,
    throwCounts,
    loading,
    createProfile,
    refetchProfiles,
  };
}
