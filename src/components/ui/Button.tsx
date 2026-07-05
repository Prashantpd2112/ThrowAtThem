"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants = {
  primary:
    "bg-gradient-to-r from-wt-orange to-wt-pink text-white shadow-lg shadow-wt-orange/25 hover:shadow-wt-orange/40",
  secondary:
    "glass-strong text-wt-dark hover:bg-white/90 shadow-lg",
  ghost:
    "bg-transparent text-white/80 hover:text-white hover:bg-white/10",
  danger:
    "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25",
  success:
    "bg-gradient-to-r from-wt-green to-emerald-500 text-white shadow-lg shadow-green-500/25",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-base rounded-xl",
  lg: "px-7 py-3.5 text-lg rounded-2xl",
  xl: "px-10 py-5 text-xl rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      type,
      onClick,
      onKeyDown,
      style,
      id,
      title,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    // Only pass safe DOM props to motion.button, excluding framer-motion-incompatible types
    const safeProps = Object.fromEntries(
      Object.entries(props).filter(
        ([key]) => !key.startsWith("onAnimation") && !key.startsWith("onDrag")
      )
    );

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        type={type}
        disabled={disabled || isLoading}
        onClick={onClick}
        onKeyDown={onKeyDown}
        style={style}
        id={id}
        title={title}
        aria-label={ariaLabel}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-wt-orange/50 focus:ring-offset-2 focus:ring-offset-transparent",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
          variants[variant],
          sizes[size],
          className
        )}
        {...safeProps}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
