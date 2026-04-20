export const PLAYERS = {
  jota: {
    slug: "jota",
    displayName: "Jota",
    email: "jota@nossodominó.app",
    color: "#2563eb",
    avatarPath: "/images/Jota.png",
    tagline: "Azul de coração",
    avatarClass: "avatar-jota",
    glowClass: "shadow-jota",
    textClass: "text-jota",
    borderClass: "border-jota",
    bgClass: "bg-jota/10",
  },
  iza: {
    slug: "iza",
    displayName: "Iza",
    email: "iza@nossodominó.app",
    color: "#f1f5f9",
    avatarPath: "/images/Iza.png",
    tagline: "Branca e imbatível",
    avatarClass: "avatar-iza",
    glowClass: "shadow-iza",
    textClass: "text-iza-500",
    borderClass: "border-iza",
    bgClass: "bg-iza/10",
  },
} as const;

export type PlayerSlug = keyof typeof PLAYERS;

export function getPlayerConfig(slug: string) {
  return PLAYERS[slug as PlayerSlug] ?? PLAYERS.jota;
}

export function getOpponentSlug(slug: string): PlayerSlug {
  return slug === "jota" ? "iza" : "jota";
}
