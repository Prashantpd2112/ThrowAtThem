"use client";

import { useState, useRef } from "react";
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
    profile_file: File | null;
  }) => void;
  isSubmitting?: boolean;
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/svg+xml",
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Checks if a URL path looks like a direct image (not a webpage)
function isDirectImageUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    const parsed = new URL(url.trim());
    const pathname = parsed.pathname.toLowerCase();
    return /\.(jpe?g|png|webp|gif|avif|svg|bmp|ico)(\?.*)?$/.test(pathname);
  } catch {
    return false;
  }
}

export function CreateProfileModal({ isOpen, onClose, onSubmit, isSubmitting }: CreateProfileModalProps) {
  const [nickname, setNickname] = useState("");
  const [profession, setProfession] = useState("");
  const [country, setCountry] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL input state
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlStatus, setImageUrlStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);

  const handleImageUrlChange = (value: string) => {
    setImageUrl(value);
    setImageUrlStatus("idle");
    setImageUrlError(null);
    if (value.trim() && !isDirectImageUrl(value)) {
      setImageUrlError("This URL points to a webpage, not an image. Please paste a direct image URL (.jpg, .png, .webp).");
    }
  };

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    // Clear URL input when file is selected
    setImageUrl("");
    setImageUrlStatus("idle");
    setImageUrlError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Unsupported file type. Allowed: jpg, png, webp, gif, avif, heic, svg");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError("Image must be under 10 MB.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // URL input takes priority over file upload
  const resolvedProfileImage = imageUrl.trim() || previewUrl || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !profession.trim() || !country) return;
    if (imageUrlError) return;

    onSubmit({
      nickname: nickname.trim(),
      profile_image: resolvedProfileImage,
      profession: profession.trim(),
      country,
      profile_file: selectedFile,
    });
  };

  const sortedCountries = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  // Can submit if: not submitting, has required fields, and no URL validation error
  const canSubmit = !isSubmitting && nickname.trim() && profession.trim() && country && !imageUrlError;

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
          {/* ── Profile Photo Upload ── */}
          <div>
            <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Upload Profile Photo <span className="text-white/25">(optional)</span>
            </label>
            <div className="flex flex-col items-center gap-3">
              {previewUrl ? (
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 ring-2 ring-white/10">
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors shadow-lg"
                    title="Remove image"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5">
                  <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif,image/heic,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
                id="profile-image-input"
              />
              <label
                htmlFor="profile-image-input"
                className="cursor-pointer inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-sm text-white/80 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span>{previewUrl ? "Change Image" : "Choose Image"}</span>
              </label>

              {uploadError && (
                <p className="text-[11px] text-red-400 text-center">{uploadError}</p>
              )}
            </div>
          </div>

          {/* ── OR Divider ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">or paste a URL</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* ── Image URL Input ── */}
          <div>
            <div className="relative">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className={`w-full h-10 px-3.5 rounded-xl bg-white/10 border text-sm text-white/90 placeholder-white/30 focus:outline-none focus:ring-1 transition-all ${
                  imageUrlError || imageUrlStatus === "error"
                    ? "border-red-400/40 focus:border-red-400/40 focus:ring-red-400/20"
                    : "border-white/15 focus:border-orange-400/40 focus:ring-orange-400/20"
                }`}
              />
            </div>
            {imageUrlError && (
              <p className="mt-1.5 text-[11px] text-red-400 leading-relaxed">{imageUrlError}</p>
            )}
            {imageUrl.trim() && !imageUrlError && imageUrlStatus === "loaded" && (
              <div className="flex items-center gap-2 mt-1.5">
                <img src={imageUrl.trim()} alt="" className="w-8 h-8 rounded-lg object-cover" />
                <p className="text-[11px] text-green-400">✓ Image URL valid</p>
              </div>
            )}
            {imageUrl.trim() && !imageUrlError && imageUrlStatus === "error" && (
              <p className="mt-1.5 text-[11px] text-red-400">Image could not be loaded. The URL may not point to a direct image.</p>
            )}
            {imageUrl.trim() && !imageUrlError && imageUrlStatus === "loading" && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-[11px] text-white/40">Validating URL...</span>
              </div>
            )}
            {/* Hidden image for validation */}
            {imageUrl.trim() && !imageUrlError && (
              <img
                src={imageUrl.trim()}
                alt=""
                className="hidden"
                aria-hidden="true"
                onLoad={() => setImageUrlStatus("loaded")}
                onError={() => setImageUrlStatus("error")}
              />
            )}
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
              disabled={!canSubmit}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating Card...
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
