import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewMatchForm } from "@/components/match/NewMatchForm";

export default async function NovaPartidaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check no active match
  const { data: me } = await supabase.from("players").select("id").eq("auth_user_id", user.id).single();
  if (!me) redirect("/login");

  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .in("status", ["aguardando", "em_andamento"])
    .or(`player1_id.eq.${me.id},player2_id.eq.${me.id}`)
    .maybeSingle();

  if (existing) redirect(`/jogar/${existing.id}`);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 gap-8 max-w-md mx-auto">
      <NewMatchForm />
    </div>
  );
}
