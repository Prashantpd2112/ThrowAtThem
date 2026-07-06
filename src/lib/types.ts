export interface Country {
  code: string;
  name: string;
  flag: string;
  color: string;
  path: string; // SVG path data
  coordinates: { x: number; y: number }; // label position
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
  target_country: string;
  country_name?: string;
  object: string;
  reason: string;
  created_at: string;
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

export interface CountryStats {
  country_code: string;
  country_name: string;
  flag: string;
  total_throws: number;
  most_used_object: { object: string; count: number };
  recent_reasons: { reason: string; nickname: string; object: string }[];
  activity_level: "low" | "medium" | "high" | "very_high";
  daily_count: number;
  weekly_count: number;
}

export interface CountryThrow {
  id: string;
  username: string;
  reason: string;
  object_name: string;
  object_emoji: string;
  created_at: string;
}

export interface LeaderboardEntry {
  country_name: string;
  country_code: string;
  flag: string;
  count: number;
  throws: CountryThrow[];
}

export interface ObjectLeaderboardEntry {
  object: string;
  count: number;
  emoji: string;
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