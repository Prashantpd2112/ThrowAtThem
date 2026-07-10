"use client";

"use client";

import { motion } from "framer-motion";
import Lottie from "lottie-react";
import tomatoAnimationData from "../../../public/animations/tomato.json";

/**
 * Renders the tomato Lottie animation on the landing page hero section.
 * Uses lottie-react for declarative autoplay, looping, and SVG rendering.
 * Wrapped in a subtle floating animation via Framer Motion.
 */
export function TomatoAnimation() {
  return (
    <motion.div
      aria-hidden="true"
      className="w-full h-full flex items-center justify-center"
      animate={{
        y: [0, -6, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <Lottie
        animationData={tomatoAnimationData}
        loop
        autoplay
        renderer="svg"
        style={{ width: "100%", height: "100%" }}
      />
    </motion.div>
  );
}
