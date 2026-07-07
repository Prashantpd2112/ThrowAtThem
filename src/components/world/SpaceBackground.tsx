"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// ── Types ──

interface Star {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  twinkle: boolean;
  twinkleDuration: number;
  twinkleDelay: number;
}

interface Galaxy {
  x: number;
  y: number;
  size: number;
  color1: string;
  color2: string;
  opacity: number;
}

// ── Helpers ──

const STAR_COLORS = [
  "255,255,255",   // white
  "200,220,255",   // light blue
  "210,200,255",   // slightly purple
  "190,230,255",   // cyan-blue
  "220,210,255",   // lavender
  "180,210,255",   // ice blue
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function generateStars(w: number, h: number, count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const twinkle = Math.random() < 0.25;
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: rand(0.5, 3),
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      opacity: rand(0.15, 0.9),
      twinkle,
      twinkleDuration: twinkle ? rand(3, 8) : 0,
      twinkleDelay: twinkle ? rand(0, 6) : 0,
    });
  }
  return stars;
}

function generateGalaxies(w: number, h: number): Galaxy[] {
  return [
    {
      x: w * 0.15,
      y: h * 0.12,
      size: Math.max(w, h) * 0.55,
      color1: "rgba(80, 60, 180, 0.08)",
      color2: "rgba(40, 20, 100, 0.04)",
      opacity: 1,
    },
    {
      x: w * 0.78,
      y: h * 0.25,
      size: Math.max(w, h) * 0.45,
      color1: "rgba(60, 80, 200, 0.06)",
      color2: "rgba(20, 40, 120, 0.03)",
      opacity: 1,
    },
    {
      x: w * 0.12,
      y: h * 0.82,
      size: Math.max(w, h) * 0.5,
      color1: "rgba(100, 50, 180, 0.07)",
      color2: "rgba(50, 20, 100, 0.03)",
      opacity: 1,
    },
    {
      x: w * 0.55,
      y: h * 0.55,
      size: Math.max(w, h) * 0.35,
      color1: "rgba(40, 70, 160, 0.05)",
      color2: "rgba(20, 30, 80, 0.02)",
      opacity: 1,
    },
  ];
}

// ── Galaxy Cloud (blurred radial gradient) ──

const GalaxyCloud = ({ galaxy }: { galaxy: Galaxy }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: galaxy.x - galaxy.size / 2,
      top: galaxy.y - galaxy.size / 2,
      width: galaxy.size,
      height: galaxy.size,
      borderRadius: "50%",
      background: `radial-gradient(ellipse at 40% 40%, ${galaxy.color1} 0%, ${galaxy.color2} 40%, transparent 70%)`,
      filter: "blur(60px)",
      opacity: galaxy.opacity,
      willChange: "auto",
    }}
  />
);

// ── Nebula Clouds (extremely soft) ──

const NebulaClouds = () => (
  <>
    <div
      className="absolute pointer-events-none"
      style={{
        left: "5%",
        top: "15%",
        width: "50%",
        height: "40%",
        borderRadius: "50%",
        background:
          "radial-gradient(ellipse at 30% 50%, rgba(100, 60, 200, 0.04) 0%, transparent 60%)",
        filter: "blur(80px)",
        willChange: "auto",
      }}
    />
    <div
      className="absolute pointer-events-none"
      style={{
        right: "8%",
        bottom: "20%",
        width: "45%",
        height: "35%",
        borderRadius: "50%",
        background:
          "radial-gradient(ellipse at 60% 40%, rgba(50, 80, 200, 0.035) 0%, transparent 60%)",
        filter: "blur(90px)",
        willChange: "auto",
      }}
    />
    <div
      className="absolute pointer-events-none"
      style={{
        left: "40%",
        top: "50%",
        width: "40%",
        height: "30%",
        borderRadius: "50%",
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(80, 40, 160, 0.025) 0%, transparent 50%)",
        filter: "blur(100px)",
        willChange: "auto",
      }}
    />
  </>
);

// ── Shooting Star ──

function ShootingStar({ onComplete }: { onComplete: () => void }) {
  const startX = rand(10, 80);
  const startY = rand(1, 35);
  const duration = rand(0.8, 1.8);
  const tailLength = rand(50, 120);
  const travelX = rand(150, 350);
  const travelY = rand(100, 250);
  const angle = Math.atan2(travelY, travelX) * (180 / Math.PI);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}vw`,
        top: `${startY}vh`,
        animation: `shooting-star ${duration}s cubic-bezier(0.1, 0.6, 0.4, 1) forwards`,
      }}
      onAnimationEnd={onComplete}
    >
      <div
        className="absolute"
        style={{
          transformOrigin: "left center",
          transform: `rotate(${angle}deg)`,
        }}
      >
        {/* Glowing head */}
        <div
          className="absolute rounded-full"
          style={{
            width: 3,
            height: 3,
            background: "#fff",
            boxShadow:
              "0 0 4px 1px rgba(255,255,255,0.6), 0 0 10px 4px rgba(255,255,255,0.2)",
            left: 0,
            top: -1,
          }}
        />
        {/* Trail */}
        <div
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: tailLength,
            height: 1,
            background:
              "linear-gradient(to right, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 30%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}

// ── Main Component ──

export function SpaceBackground() {
  const [scrollY, setScrollY] = useState(0);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);

  // Generate everything on mount + resize
  const stars = useMemo(() => {
    if (!dimensions.w || !dimensions.h) return [];
    return generateStars(dimensions.w, dimensions.h, 650);
  }, [dimensions]);

  const galaxies = useMemo(() => {
    if (!dimensions.w || !dimensions.h) return [];
    return generateGalaxies(dimensions.w, dimensions.h);
  }, [dimensions]);

  // Split stars into twinkling and static for performance
  const { twinklingStars, staticStars } = useMemo(() => {
    const twinkling: Star[] = [];
    const static_: Star[] = [];
    for (const s of stars) {
      if (s.twinkle) twinkling.push(s);
      else static_.push(s);
    }
    return { twinklingStars: twinkling, staticStars: static_ };
  }, [stars]);

  useEffect(() => {
    setMounted(true);
    const w = window.innerWidth;
    const h = window.innerHeight;
    setDimensions({ w, h });

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setDimensions({ w: window.innerWidth, h: window.innerHeight });
      }, 300);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Shooting star scheduling ──
  const [shootingStarId, setShootingStarId] = useState(0);
  const [visible, setVisible] = useState(false);
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback(() => {
    const delay = rand(4000, 8000);
    scheduledRef.current = setTimeout(() => {
      setShootingStarId((id) => id + 1);
      setVisible(true);
    }, delay);
  }, []);

  const done = useCallback(() => {
    setVisible(false);
    schedule();
  }, [schedule]);

  useEffect(() => {
    schedule();
    return () => {
      if (scheduledRef.current) clearTimeout(scheduledRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) {
    return (
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ backgroundColor: "#020308" }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Layer 1: Deep space base */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "#020308" }}
      />

      {/* Layer 2: Subtle dark blue gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(5, 10, 30, 0.6) 0%, transparent 70%)",
        }}
      />

      {/* Layer 3: Nebula clouds */}
      <NebulaClouds />

      {/* Layer 4: Galaxy clouds */}
      {galaxies.map((galaxy, i) => (
        <GalaxyCloud key={i} galaxy={galaxy} />
      ))}

      {/* Layer 5: Static stars (no twinkle, rendered as single divs) */}
      {staticStars.length > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translateY(${scrollY * 0.005}px)`,
            willChange: "transform",
          }}
        >
          {staticStars.map((star, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                backgroundColor: `rgb(${star.color})`,
                opacity: star.opacity,
                boxShadow:
                  star.size >= 2
                    ? `0 0 ${star.size * 0.8}px rgba(${star.color}, ${star.opacity * 0.3})`
                    : "none",
              }}
            />
          ))}
        </div>
      )}

      {/* Layer 6: Twinkling stars (slightly more parallax) */}
      {twinklingStars.length > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translateY(${scrollY * 0.012}px)`,
            willChange: "transform",
          }}
        >
          {twinklingStars.map((star, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                backgroundColor: `rgb(${star.color})`,
                opacity: star.opacity,
                boxShadow:
                  star.size >= 2
                    ? `0 0 ${star.size * 0.8}px rgba(${star.color}, ${star.opacity * 0.3})`
                    : "none",
                animation: `star-twinkle ${star.twinkleDuration}s ease-in-out ${star.twinkleDelay}s infinite alternate`,
                willChange: "opacity",
              }}
            />
          ))}
        </div>
      )}

      {/* Shooting star */}
      {visible && (
        <ShootingStar key={shootingStarId} onComplete={done} />
      )}
    </div>
  );
}