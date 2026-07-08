"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { COUNTRIES } from "@/data/countries";

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nickname: string;
    profile_image: string;
    profession: string;
    country: string;
  }) => void;
  isSubmitting?: boolean;
}

export function CreateProfileModal({ isOpen, onClose, onSubmit, isSubmitting }: CreateProfileModalProps) {
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profession, setProfession] = useState("");
  const [country, setCountry] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !profession.trim() || !country) return;
    onSubmit({
      nickname: nickname.trim(),
      profile_image: profileImage.trim(),
      profession: profession.trim(),
      country,
    });
  };

  const sortedCountries = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-5 md:p-6 scrollbar-none"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-white/90 mb-5">Create Card</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Profile Image */}
          <div>
            <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Profile Photo URL <span className="text-white/25">(optional)</span>
            </label>
            <input
              type="text"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full h-10 px-3.5 rounded-xl bg-white/10 border border-white/15 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-orange-400/40 focus:ring-1 focus:ring-orange-400/20 transition-all"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Full Name <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your name"
              required
              maxLength={50}
              className="w-full h-10 px-3.5 rounded-xl bg-white/10 border border-white/15 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-orange-400/40 focus:ring-1 focus:ring-orange-400/20 transition-all"
            />
          </div>

          {/* Profession */}
          <div>
            <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Profession <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="e.g. Software Engineer"
              required
              maxLength={50}
              className="w-full h-10 px-3.5 rounded-xl bg-white/10 border border-white/15 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-orange-400/40 focus:ring-1 focus:ring-orange-400/20 transition-all"
            />
          </div>

          {/* Country */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Country <span className="text-orange-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              className="w-full h-10 px-3.5 rounded-xl bg-white/10 border border-white/15 text-sm text-left text-white/90 focus:outline-none focus:border-orange-400/40 focus:ring-1 focus:ring-orange-400/20 transition-all flex items-center gap-2"
            >
              {selectedCountry ? (
                <>
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.name}</span>
                </>
              ) : (
                <span className="text-white/30">Select your country</span>
              )}
              <svg className="w-3 h-3 text-white/40 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCountryDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-black/80 backdrop-blur-xl border border-white/15 shadow-xl z-10 scrollbar-none">
                {sortedCountries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCountry(c.code);
                      setShowCountryDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-sm flex items-center gap-2 transition-colors ${
                      country === c.code
                        ? "text-white font-semibold bg-white/10"
                        : "text-white/65 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl bg-white/10 border border-white/15 text-sm font-semibold text-white/70 hover:bg-white/15 hover:text-white/90 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nickname.trim() || !profession.trim() || !country}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                "Create Card"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
