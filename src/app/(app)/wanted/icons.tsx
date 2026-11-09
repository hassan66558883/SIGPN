import type { ReactNode } from "react";

/** Small line icons of the search screen (the client's mock-up), inline so the screen adds no dependency. */
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const Svg = ({ children, size = 20, className }: { children: ReactNode; size?: number; className?: string }) => (
  <svg {...base} width={size} height={size} className={className}>
    {children}
  </svg>
);

export const IconSearch = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
export const IconUser = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </Svg>
);
export const IconTarget = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </Svg>
);
export const IconCheckCircle = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 3 3 5-6" />
  </Svg>
);
export const IconEye = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const IconPin = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);
export const IconPrinter = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <path d="M7 9V3h10v6" />
    <rect x="4" y="9" width="16" height="8" rx="2" />
    <path d="M7 14h10v7H7z" />
  </Svg>
);
export const IconRefresh = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" />
  </Svg>
);
export const IconClock = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IconInfo = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);
export const IconAlert = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17h.01" />
  </Svg>
);
export const IconDocSearch = ({ size, className }: { size?: number; className?: string }) => (
  <Svg size={size} className={className}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
    <path d="M14 3v5h5v2" />
    <path d="M8 12h4M8 16h2" />
    <circle cx="16" cy="17" r="3" />
    <path d="m21 22-2.4-2.4" />
  </Svg>
);
