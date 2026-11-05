import React from 'react';

interface AniDeskLogoProps {
  size?: number;
  className?: string;
}

export const AniDeskLogo: React.FC<AniDeskLogoProps> = ({ size = 36, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none flex-shrink-0 filter drop-shadow-[0_0_12px_rgba(255,30,45,0.65)] ${className}`}
    >
      <defs>
        {/* Vibrant Crimson Base Gradient */}
        <linearGradient id="adLogoGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF334B" />
          <stop offset="55%" stopColor="#E50914" />
          <stop offset="100%" stopColor="#9B0010" />
        </linearGradient>

        {/* Shiny Highlight Rim */}
        <linearGradient id="adBorderGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFA6B2" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FF1E27" stopOpacity="0.2" />
        </linearGradient>

        {/* Core Play Gradient */}
        <linearGradient id="adPlayCore" x1="42" y1="36" x2="64" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFE0E5" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Badge Base */}
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="24"
        fill="url(#adLogoGrad)"
      />

      {/* Glossy Bevel Border */}
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="24"
        fill="none"
        stroke="url(#adBorderGrad)"
        strokeWidth="2.5"
      />

      {/* Stylized Modern Anime 'A' Blade (White Silhouettes) */}
      {/* Left Wing */}
      <path
        d="M50 18 L24 74 L37 74 L46 54 L50 45 L54 54 L63 74 L76 74 L50 18 Z"
        fill="#FFFFFF"
        opacity="0.95"
      />

      {/* Central Cyber Chevron / Play Icon Core */}
      <polygon
        points="44,40 60,50 44,60"
        fill="url(#adPlayCore)"
      />

      {/* Sleek Underline Accent Dot */}
      <circle cx="50" cy="80" r="2.5" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
};
