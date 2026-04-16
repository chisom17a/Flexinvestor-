
"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export function Logo({ className, iconClassName, textClassName, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3 group select-none cursor-pointer", className)}>
      <div className={cn(
        "relative w-10 h-10 flex items-center justify-center transition-all duration-300 group-hover:scale-110",
        iconClassName
      )}>
        {/* Custom Professional SVG Logo */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          {/* Outer Ring/Base */}
          <rect
            x="4"
            y="4"
            width="32"
            height="32"
            rx="8"
            fill="currentColor"
            className="text-primary"
          />
          {/* Inner Decorative Elements */}
          <path
            d="M20 10L12 14V22C12 27.41 15.41 32.47 20 34C24.59 32.47 28 27.41 28 22V14L20 10Z"
            fill="white"
            fillOpacity="0.2"
          />
          {/* Growth Indicator */}
          <path
            d="M14 26L20 20L26 26"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 20V29"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="11" r="2.5" fill="white" />
        </svg>
      </div>
      {showText && (
        <span className={cn("font-headline font-bold text-2xl tracking-tight flex items-center", textClassName)}>
          <span className="text-foreground">Flex</span>
          <span className="text-primary">Invest</span>
          <div className="ml-2 flex items-center">
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] rounded-sm uppercase tracking-[0.2em] font-black shadow-sm">
              Pro
            </span>
          </div>
        </span>
      )}
    </div>
  );
}
