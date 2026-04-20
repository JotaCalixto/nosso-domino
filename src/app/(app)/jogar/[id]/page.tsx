import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GameClient } from "@/components/game/GameClient";
import type { Tile } from "@/engine/types";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("players").select("*").eq("auth_user_id", user.id).single();
  if (!me) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();

  if (!match) notFound();

  const { data: opponent } = await supabase
    .from("players")
    .select("*")
    .eq("id", me.id === match.player1_id ? match.player2_id : match.player1_id)
    .single();

  if (!opponent) notFound();

  let round = null;
  let myHand: Tile[] = [];

  if (match.current_round_id) {
    const { data: roundData } = await supabase
      .from("rounds")
      .select("*")
      .eq("id", match.current_round_id)
      .single();

    round = roundData;

    if (round) {
      const { data: handData } = await supabase
        .from("hands")
        .select("tiles")
        .eq("round_id", round.id)
        .eq("player_id", me.id)
        .single();

      myHand = (handData?.tiles as unknown as Tile[]) ?? [];
    }
  }

  return (
    <GameClient
      match={match as Parameters<typeof GameClient>[0]["match"]}
      round={round as Parameters<typeof GameClient>[0]["round"]}
      me={{ id: me.id, slug: me.slug, display_name: me.display_name }}
      opponent={{ id: opponent.id, slug: opponent.slug, display_name: opponent.display_name }}
      initialHand={myHand}
    />
  );
}
