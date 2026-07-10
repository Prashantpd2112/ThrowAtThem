export interface Country {
  code: string;
  name: string;
  flag: string;
  color: string;
  path: string;
  coordinates: { x: number; y: number };
}

export interface ThrowableObject {
  id: string;
  emoji: string;
  name: string;
  description: string;
  color: string;
  particleColor: string;
}

export interface ThrowEntry {
  id: string;
  player_id: string;
  nickname: string;
  thrower_country: string;
  object: string;
  reason: string;
  created_at: string;
  target_profile_id?: string | null;
  target_profile_name?: string | null;
}

export interface Guest {
  id: string;
  nickname: string;
  country: string;
  created_at: string;
}

export interface UserPresence {
  id: string;
  guest_id: string;
  nickname: string;
  country: string;
  last_seen: string;
  created_at: string;
}

export interface ObjectDistribution {
  object_id: string;
  object_name: string;
  object_emoji: string;
  count: number;
}

export interface IndividualLeaderboardEntry {
  profile_id: string;
  nickname: string;
  profile_image: string;
  profession: string;
  count: number;
  country: string;
}

export interface IndividualObjectStats {
  profile_id: string;
  objects: ObjectDistribution[];
  most_used_object: ObjectDistribution | null;
  total_throws: number;
}

export interface IndividualProfile {
  id: string;
  guest_id: string;
  nickname: string;
  profile_image: string;
  profession: string;
  country: string;
  city: string;
  bio: string;
  social_link: string;
  likes: number;
  views: number;
  created_at: string;
}

export type TimePeriod = "daily" | "weekly" | "all_time";

export type ThemeMode = "light" | "dark";

export interface ThrowAnimation {
  active: boolean;
  object: ThrowableObject;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  targetCountry: string;
}