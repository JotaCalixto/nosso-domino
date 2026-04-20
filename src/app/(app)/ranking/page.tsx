import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlayerConfig } from "@/lib/players";

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rankings } = await supabase
    .from("rankings")
    .select("*, players(id, slug, display_name)")
    .order("wins", { ascending: false });

  const { data: recentMatches } = await supabase
    .from("matches")
    .select("id, winner_id, score_player1, score_player2, finished_at, player1_id, player2_id, players!matches_player1_id_fkey(display_name, slug)")
    .eq("status", "finalizada")
    .order("finished_at", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-dvh px-4 pt-8 max-w-md mx-auto flex flex-col gap-6">
      <h1 className="text-gradient-title text-2xl font-bold font-rajdhani">Ranking</h1>

      {/* Player cards */}
      <div className="flex flex-col gap-3">
        {rankings?.map((r, i) => {
          const player = r.players as { id: string; slug: string; display_name: string };
          const config = getPlayerConfig(player.slug);
          const winRate = r.matches_played > 0 ? Math.round((r.wins / r.matches_played) * 100) : 0;

          return (
            <div key={r.id} className={`card-premium rounded-2xl p-5 flex items-center gap-4 ${i === 0 ? "border border-gold-400/30" : ""}`}>
              <span className="text-2xl font-bold text-text-muted font-rajdhani w-6 text-center">{i + 1}</span>
              <div className={`relative w-14 h-14 rounded-full border-2 overflow-hidden flex-shrink-0 ${
                player.slug === "jota" ? "border-jota-500 shadow-jota" : "border-iza-400"
              }`}>
                <Image src={config.avatarPath} alt={player.display_name} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-text-primary font-semibold">{player.display_name}</p>
                <p className="text-text-muted text-xs">{r.wins}V · {r.losses}D · {winRate}% aproveitamento</p>
                {r.current_streak > 1 && (
                  <p className="text-gold-400 text-xs mt-0.5">🔥 {r.current_streak} vitórias seguidas</p>
                )}
              </div>
              {i === 0 && <span className="text-2xl">👑</span>}
            </div>
          );
        })}
      </div>

      {/* Head-to-head history */}
      {recentMatches && recentMatches.length > 0 && (
        <div>
          <h2 className="text-text-muted text-xs uppercase tracking-widest mb-3 font-medium">Histórico de partidas</h2>
          <div className="flex flex-col gap-2">
            {recentMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-2/50 border border-surface-3">
                <span className="text-text-muted text-xs">
                  {m.finished_at ? new Date(m.finished_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                </span>
                <span className="text-text-primary font-mono text-sm font-semibold">
                  {m.score_player1} × {m.score_player2}
                </span>
                <span className={`text-xs font-semibold ${m.winner_id === m.player1_id ? "text-jota-400" : "text-iza-300"}`}>
                  {m.winner_id === m.player1_id ? "Jota" : "Iza"} venceu
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
