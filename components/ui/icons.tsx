type IconProps = { className?: string };

const base = "w-full h-full";
const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function TodayIcon({ className }: IconProps) {
  return (
    <svg className={className ?? base} {...svgProps}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

export function AccountsIcon({ className }: IconProps) {
  return (
    <svg className={className ?? base} {...svgProps}>
      <path d="M3 21V8l7-5 7 5v13" />
      <path d="M13 21v-6h-4v6M3 21h18" />
    </svg>
  );
}

export function SequencesIcon({ className }: IconProps) {
  return (
    <svg className={className ?? base} {...svgProps}>
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export function CoachIcon({ className }: IconProps) {
  return (
    <svg className={className ?? base} {...svgProps}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.3-.6L3 21l1.7-5.7A8.4 8.4 0 1 1 21 11.5Z" />
    </svg>
  );
}

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={className ?? base} {...svgProps}>
      <rect x="3" y="12" width="4" height="9" />
      <rect x="10" y="6" width="4" height="15" />
      <rect x="17" y="9" width="4" height="12" />
    </svg>
  );
}

export function PlaybookIcon({ className }: IconProps) {
  return (
    <svg className={className ?? base} {...svgProps}>
      <path d="M12 2 3 7v10l9 5 9-5V7Z" />
      <path d="M12 12 3 7M12 12l9-5M12 12v10" />
    </svg>
  );
}

export function TeamIcon({ className }: IconProps) {
  return (
    <svg className={className ?? base} {...svgProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17.5" cy="9" r="2.6" />
      <path d="M15.5 14.5a5.4 5.4 0 0 1 6 5" />
    </svg>
  );
}

export function ReportsIcon({ className }: IconProps) {
  return (
    <svg className={className ?? base} {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M9 15l2 2 4-4" />
    </svg>
  );
}
