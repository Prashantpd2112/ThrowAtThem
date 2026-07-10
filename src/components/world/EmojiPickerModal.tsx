"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface EmojiPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

/**
 * Simple emoji input that opens the phone's native emoji keyboard
 * on mobile, or lets desktop users paste/type an emoji character.
 */
export function EmojiPickerModal({ isOpen, onClose, onEmojiSelect }: EmojiPickerModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewEmoji, setPreviewEmoji] = useState<string | null>(null);

  // Auto-focus the input when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewEmoji(null);
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /** Extract the last emoji from a string — matches all Unicode emoji sequences. */
  const extractEmoji = (text: string): string | null => {
    // Match emoji sequences (including skin tones, flags, ZWJ, keycaps)
    const emojiRegex = /\p{Emoji}/gu;
    const matches = text.match(emojiRegex);
    if (matches && matches.length > 0) {
      return matches[matches.length - 1];
    }
    return null;
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      setPreviewEmoji(null);
      return;
    }
    const emoji = extractEmoji(value);
    if (emoji) {
      setPreviewEmoji(emoji);
      onEmojiSelect(emoji);
      onClose();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const emoji = extractEmoji(pasted);
    if (emoji) {
      e.preventDefault();
      onEmojiSelect(emoji);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose an emoji"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10"
          >
            <div className="rounded-2xl bg-[#1a1b2e] border border-white/10 shadow-2xl p-6 w-[300px] sm:w-[360px]">
              <div className="text-center mb-4">
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  Pick an Emoji
                </p>
                {/* Mobile hint */}
                <p className="text-white/40 text-[11px] mt-1 sm:hidden">
                  Your keyboard will open — switch to the emoji tab
                </p>
                {/* Desktop hint */}
                <p className="text-white/40 text-[11px] mt-1 hidden sm:block">
                  Press <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/50 text-[10px]">Win</kbd> + <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/50 text-[10px]">.</kbd> or <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/50 text-[10px]">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/50 text-[10px]">Cmd</kbd> + <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/50 text-[10px]">Space</kbd>
                </p>
              </div>

              {/* Large emoji preview */}
              <div className="flex items-center justify-center h-20 mb-4">
                {previewEmoji ? (
                  <span className="text-5xl leading-none select-none">{previewEmoji}</span>
                ) : (
                  <span className="text-4xl leading-none text-white/15 select-none">?</span>
                )}
              </div>

              {/* Input that triggers native keyboard */}
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  onChange={handleInput}
                  onPaste={handlePaste}
                  placeholder="Type or paste an emoji..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg placeholder-white/30 focus:outline-none focus:border-tomato-primary/50 focus:ring-1 focus:ring-tomato-primary/20 transition-all"
                  aria-label="Type or paste an emoji"
                />
              </div>

              {/* Hint icons */}
              <div className="flex items-center justify-center gap-4 mt-4 text-white/30">
                <span className="text-lg">⌨️</span>
                <span className="text-xs text-white/20">or paste</span>
                <span className="text-lg">📋</span>
              </div>

              {/* Cancel button */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 text-sm transition-all"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
