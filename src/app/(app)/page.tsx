import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlayerConfig, getOpponentSlug } from "@/lib/players";
import { MatchWatcher } from "@/components/shell/MatchWatcher";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("players").select("*").eq("auth_user_id", user.id).single();
  if (!me) redirect("/login");

  const { data: opponent } = await supabase.from("players").select("*").neq("id", me.id).single();
  const { data: rankings } = await supabase.from("rankings").select("*, players(slug, display_name)");

  const myRanking   = rankings?.find((r) => r.player_id === me.id);
  const oppRanking  = rankings?.find((r) => r.player_id !== me.id);

  // active match
  const { data: activeMatch } = await supabase
    .from("matches")
    .select("*, rounds(id, current_turn_id, round_number)")
    .in("status", ["aguardando", "em_andamento"])
    .or(`player1_id.eq.${me.id},player2_id.eq.${me.id}`)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // recent finished matches
  const { data: recentMatches } = await supabase
    .from("matches")
    .select("id, winner_id, score_player1, score_player2, finished_at, player1_id, player2_id")
    .eq("status", "finalizada")
    .or(`player1_id.eq.${me.id},player2_id.eq.${me.id}`)
    .order("finished_at", { ascending: false })
    .limit(5);

  const myConfig  = getPlayerConfig(me.slug);
  const oppConfig = opponent ? getPlayerConfig(opponent.slug) : null;

  return (
    <div className="min-h-dvh flex flex-col items-center px-4 pt-8 pb-4 gap-6 max-w-md mx-auto">
      <MatchWatcher />

      {/* Logo + title */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gold-400/20 blur-xl scale-150" />
          <Image src="/images/logo.png" alt="Nosso Dominó" width={72} height={72} className="relative rounded-2xl shadow-gold" />
        </div>
        <h1 className="text-gradient-title text-2xl font-bold font-rajdhani tracking-wide">Nosso Dominó</h1>
      </div>

      {/* Score banner */}
      <div className="w-full card-premium rounded-2xl p-4">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
          <PlayerScore
            name={me.display_name}
            avatar={myConfig.avatarPath}
            wins={myRanking?.wins ?? 0}
            losses={myRanking?.losses ?? 0}
            isMe
            slug={me.slug}
          />
          <div className="flex flex-col items-center gap-1">
            <span className="text-text-muted text-xs font-medium uppercase tracking-widest">VS</span>
            <div className="text-gold-400 font-bold text-xl font-rajdhani">
              {myRanking?.wins ?? 0} — {oppRanking?.wins ?? 0}
            </div>
          </div>
          {opponent && oppConfig && (
            <PlayerScore
              name={opponent.display_name}
              avatar={oppConfig.avatarPath}
              wins={oppRanking?.wins ?? 0}
              losses={oppRanking?.losses ?? 0}
              isMe={false}
              slug={opponent.slug}
            />
          )}
        </div>
      </div>

      {/* Active match card */}
      {activeMatch ? (
        <ActiveMatchCard match={activeMatch} meId={me.id} />
      ) : (
        <Link
          href="/nova-partida"
          className="btn-primary w-full py-4 text-center text-lg font-semibold rounded-2xl font-rajdhani tracking-wide"
        >
          ✦ Nova Partida
        </Link>
      )}

      {/* Recent results */}
      {recentMatches && recentMatches.length > 0 && (
        <div className="w-full">
          <h2 className="text-text-muted text-xs uppercase tracking-widest mb-3 font-medium">Resultados recentes</h2>
          <div className="flex flex-col gap-2">
            {recentMatches.map((m) => {
              const iWon = m.winner_id === me.id;
              const myScore   = m.player1_id === me.id ? m.score_player1 : m.score_player2;
              const oppScore  = m.player1_id === me.id ? m.score_player2 : m.score_player1;
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    iWon
                      ? "border-jota-500/30 bg-jota-500/5"
                      : "border-surface-3 bg-surface-2/50"
                  }`}
                >
                  <span className={`text-sm font-semibold ${iWon ? "text-jota-400" : "text-text-muted"}`}>
                    {iWon ? "Vitória" : "Derrota"}
                  </span>
                  <span className="text-text-primary font-mono text-sm">{myScore} × {oppScore}</span>
                  <span className="text-text-muted text-xs">
                    {m.finished_at ? new Date(m.finished_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerScore({ name, avatar, wins, losses, isMe, slug }: {
  name: string; avatar: string; wins: number; losses: number; isMe: boolean; slug: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${isMe ? "items-center" : "items-center"}`}>
      <div className={`relative w-12 h-12 rounded-full border-2 overflow-hidden flex-shrink-0 ${
        slug === "jota" ? "border-jota-500 shadow-jota" : "border-iza-400"
      }`}>
        <Image src={avatar} alt={name} fill className="object-cover" />
      </div>
      <span className="text-text-primary text-sm font-semibold text-center">{name}</span>
      <span className="text-text-muted text-xs text-center">{wins}V {losses}D</span>
    </div>
  );
}

function ActiveMatchCard({ match, meId }: { match: { id: string; status: string; rounds?: { current_turn_id: string | null; round_number: number }[] | null }; meId: string }) {
  const round = match.rounds?.[0];
  const isMyTurn = round?.current_turn_id === meId;

  return (
    <div className="w-full card-premium rounded-2xl p-4 border border-gold-400/30">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-gold-400 text-xs font-semibold uppercase tracking-widest">Partida ativa</p>
          {round && <p className="text-text-muted text-xs mt-0.5">Rodada {round.round_number}</p>}
        </div>
        {match.status === "aguardando" && (
          <span className="text-xs bg-gold-400/20 text-gold-400 px-2 py-1 rounded-full">Aguardando</span>
        )}
        {isMyTurn && match.status === "em_andamento" && (
          <span className="text-xs bg-jota-500/20 text-jota-400 px-2 py-1 rounded-full animate-pulse">Sua vez!</span>
        )}
      </div>
      <Link
        href={`/jogar/${match.id}`}
        className="btn-primary w-full py-3 text-center text-base font-semibold rounded-xl block"
      >
        {match.status === "aguardando" ? "Ver convite" : "Continuar jogo →"}
      </Link>
    </div>
  );
}
