"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { preloadSounds, playImpactSound } from "@/lib/sounds";

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  velocity: number;
}

interface ThrowAnimationData {
  id: string;
  emoji: string;
  targetX: number;
  targetY: number;
  particleColor: string;
  startX: number;
  startY: number;
  objectId: string;
}

export function ThrowAnimation() {
  const [animations, setAnimations] = useState<ThrowAnimationData[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [impacts, setImpacts] = useState<{ id: string; x: number; y: number }[]>([]);

  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      x,
      y,
      color,
      size: 4 + Math.random() * 8,
      angle: (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5,
      velocity: 40 + Math.random() * 60,
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    // Clean up particles after animation
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 800);
  }, []);

  // Pre-load all sounds on mount so they are ready for instant playback
  useEffect(() => {
    preloadSounds();
  }, []);

  // Listen for throw events
  useEffect(() => {
    const handleThrow = (e: CustomEvent) => {
      const { emoji, targetX, targetY, particleColor, startX, startY, objectId } = e.detail;
      const anim: ThrowAnimationData = {
        id: `throw-${Date.now()}`,
        emoji,
        targetX,
        targetY,
        particleColor,
        startX,
        startY,
        objectId,
      };
      setAnimations((prev) => [...prev, anim]);

      // Spawn splash after flying animation completes
      setTimeout(() => {
        setImpacts((prev) => [...prev, { id: `impact-${Date.now()}`, x: targetX, y: targetY }]);
        spawnParticles(targetX, targetY, particleColor);
        playImpactSound(anim.objectId);
        // Clean up impact
        setTimeout(() => {
          setImpacts((prev) => prev.filter((i) => i.id !== `impact-${Date.now()}`));
        }, 600);
      }, 800);

      // Clean up animation
      setTimeout(() => {
        setAnimations((prev) => prev.filter((a) => a.id !== anim.id));
      }, 1500);
    };

    window.addEventListener("ThrowAtThem-throw", handleThrow as EventListener);
    return () => window.removeEventListener("ThrowAtThem-throw", handleThrow as EventListener);
  }, [spawnParticles]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Flying objects */}
      <AnimatePresence>
        {animations.map((anim) => (
          <motion.div
            key={anim.id}
            className="absolute text-4xl md:text-5xl"
            initial={{
              x: anim.startX,
              y: anim.startY,
              rotate: 0,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: anim.targetX,
              y: anim.targetY,
              rotate: 720,
              scale: 0.8,
              opacity: [1, 1, 0.6],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            {anim.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Impact splashes */}
      <AnimatePresence>
        {impacts.map((impact) => (
          <motion.div
            key={impact.id}
            className="absolute"
            style={{ left: impact.x, top: impact.y }}
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-wt-orange to-wt-pink opacity-50" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Particles */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
            }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos(particle.angle) * particle.velocity,
              y: Math.sin(particle.angle) * particle.velocity - 20,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Helper to trigger throw animation from any component
export function triggerThrowAnimation(
  emoji: string,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  particleColor: string,
  objectId?: string
) {
  const event = new CustomEvent("ThrowAtThem-throw", {
    detail: { emoji, startX, startY, targetX, targetY, particleColor, objectId },
  });
  window.dispatchEvent(event);
}
