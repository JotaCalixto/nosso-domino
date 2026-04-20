"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/jogar", label: "Jogar", icon: DominoIcon },
  { href: "/ranking", label: "Ranking", icon: TrophyIcon },
  { href: "/perfil", label: "Perfil", icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-3 bg-surface-1/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                active
                  ? "text-jota-400 bg-jota-500/10"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Icon size={22} active={active} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DominoIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="4" y="3" width="16" height="18" rx="2" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0}/>
      <rect x="4" y="3" width="16" height="18" rx="2" strokeLinecap="round"/>
      <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round"/>
      <circle cx="12" cy="7.5" r="1.2" fill="currentColor"/>
      <circle cx="9" cy="16" r="1.2" fill="currentColor"/>
      <circle cx="15" cy="16" r="1.2" fill="currentColor"/>
    </svg>
  );
}

function TrophyIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} stroke="currentColor" strokeWidth={1.8}>
      <path d="M8 21h8M12 17v4M5 3H3v5a4 4 0 004 4M19 3h2v5a4 4 0 01-4 4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 3h10v6a5 5 0 01-10 0V3z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function UserIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4" strokeLinecap="round"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
