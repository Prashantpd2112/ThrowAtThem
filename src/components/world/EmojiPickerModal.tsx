"use client";

import EmojiPicker, { Theme, EmojiStyle, EmojiClickData, SuggestionMode } from "emoji-picker-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EmojiPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPickerModal({ isOpen, onClose, onEmojiSelect }: EmojiPickerModalProps) {
  const [anchorStyle, setAnchorStyle] = useState<React.CSSProperties>({});
  const [isMobile, setIsMobile] = useState(false);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  // Measure and position the picker when it opens
  useEffect(() => {
    if (!isOpen) return;

    const checkMobile = () => window.innerWidth < 768;
    setIsMobile(checkMobile());

    // Find the "+" button and position the picker relative to it
    const addBtn = document.querySelector('[aria-label="Add a custom emoji"]');
    if (addBtn) {
      const rect = addBtn.getBoundingClientRect();
      const pickerWidth = 350;

      if (checkMobile()) {
        // On mobile, we use a bottom-anchored layout (handled in the render)
        setAnchorStyle({});
        return;
      }

      // Desktop: position anchored near the button
      const gap = 8;
      const pickerHeight = 400;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top: number;
      if (spaceAbove > pickerHeight + gap) {
        // Position above the button if enough room
        top = rect.top - pickerHeight - gap;
      } else {
        // Otherwise position below
        top = rect.bottom + gap;
      }

      // Clamp to viewport bounds
      top = Math.max(8, Math.min(top, window.innerHeight - pickerHeight - 8));

      // Center horizontally under the button, clamp to viewport edges
      let left = rect.left + rect.width / 2 - pickerWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - pickerWidth - 8));

      setAnchorStyle({
        position: "fixed",
        top,
        left,
        zIndex: 110,
      });
    }

    // Handle Escape key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onEmojiSelect(emojiData.emoji);
      onClose();
    },
    [onEmojiSelect, onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          {/* Invisible backdrop — captures clicks outside the picker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Picker container — positioned near the "+" button (desktop) or bottom (mobile) */}
          <motion.div
            ref={pickerContainerRef}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            style={
              isMobile
                ? {
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: "flex",
                    justifyContent: "center",
                    zIndex: 110,
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
                  }
                : anchorStyle
            }
          >
            <div
              className={isMobile ? "w-full max-w-[400px]" : ""}
              onClick={(e) => e.stopPropagation()}
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.DARK}
                emojiStyle={EmojiStyle.NATIVE}
                autoFocusSearch={true}
                lazyLoadEmojis={true}
                suggestedEmojisMode={SuggestionMode.RECENT}
                width={isMobile ? "100%" : 350}
                height={400}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
