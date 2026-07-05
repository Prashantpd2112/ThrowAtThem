"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hoverable = false, onClick }: CardProps) {
  const Component = hoverable ? motion.div : "div";
  const motionProps = hoverable
    ? {
        whileHover: { y: -4, scale: 1.01 },
        whileTap: { scale: 0.99 },
        onClick,
      }
    : {};

  return (
    <Component
      className={cn(
        "glass-strong rounded-2xl p-4 md:p-6 shadow-lg",
        "border border-white/20",
        hoverable && "cursor-pointer transition-shadow hover:shadow-xl",
        className
      )}
      {...motionProps}
    >
      {children}
    </Component>
  );
}
