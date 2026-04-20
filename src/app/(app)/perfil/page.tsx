import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlayerConfig } from "@/lib/players";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("players").select("*").eq("auth_user_id", user.id).single();
  if (!me) redirect("/login");

  const { data: ranking } = await supabase.from("rankings").select("*").eq("player_id", me.id).single();
  const { data: achievements } = await supabase
    .from("player_achievements")
    .select("*, achievements(code, title, description, icon)")
    .eq("player_id", me.id)
    .order("unlocked_at", { ascending: false });

  const { data: allAchievements } = await supabase.from("achievements").select("*").order("sort_order");

  const config = getPlayerConfig(me.slug);
  const winRate = ranking && ranking.matches_played > 0
    ? Math.round((ranking.wins / ranking.matches_played) * 100)
    : 0;

  const unlockedCodes = new Set(achievements?.map((a) => a.achievement_code) ?? []);

  return (
    <div className="min-h-dvh px-4 pt-8 max-w-md mx-auto flex flex-col gap-6 pb-8">

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3">
        <div className={`relative w-24 h-24 rounded-full border-4 overflow-hidden ${
          me.slug === "jota" ? "border-jota-500 shadow-jota" : "border-iza-400"
        }`}>
          <Image src={config.avatarPath} alt={me.display_name} fill className="object-cover" />
        </div>
        <div className="text-center">
          <h1 className="text-text-primary text-2xl font-bold font-rajdhani">{me.display_name}</h1>
          {me.tagline && <p className="text-text-muted text-sm mt-1">{me.tagline}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Vitórias" value={ranking?.wins ?? 0} color="text-jota-400" />
        <StatCard label="Derrotas" value={ranking?.losses ?? 0} color="text-text-muted" />
        <StatCard label="Aproveit." value={`${winRate}%`} color="text-gold-400" />
      </div>

      {ranking && ranking.best_streak > 1 && (
        <div className="card-premium rounded-2xl p-4 text-center">
          <p className="text-text-muted text-xs mb-1">Maior sequência</p>
          <p className="text-gold-400 text-3xl font-bold font-rajdhani">🔥 {ranking.best_streak}</p>
          <p className="text-text-muted text-xs mt-1">vitórias seguidas</p>
        </div>
      )}

      {/* Achievements */}
      {allAchievements && allAchievements.length > 0 && (
        <div>
          <h2 className="text-text-muted text-xs uppercase tracking-widest mb-3 font-medium">Conquistas</h2>
          <div className="grid grid-cols-2 gap-3">
            {allAchievements.map((ach) => {
              const unlocked = unlockedCodes.has(ach.code);
              return (
                <div
                  key={ach.code}
                  className={`card-premium rounded-xl p-4 flex flex-col gap-2 ${
                    unlocked ? "border border-gold-400/30" : "opacity-40"
                  }`}
                >
                  <span className="text-2xl">{ach.icon}</span>
                  <p className={`text-sm font-semibold ${unlocked ? "text-text-primary" : "text-text-muted"}`}>{ach.title}</p>
                  <p className="text-text-muted text-xs leading-relaxed">{ach.description}</p>
                  {unlocked && <span className="text-gold-400 text-xs">✓ Desbloqueada</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="mt-4">
        <SignOutButton />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="card-premium rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold font-rajdhani ${color}`}>{value}</p>
      <p className="text-text-muted text-xs mt-1">{label}</p>
    </div>
  );
}
