"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { slugToEmail } from "@/lib/utils";
import type { Player } from "@/lib/supabase/database.types";

export function useAuth() {
  const { player, setPlayer } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && !player) {
        const { data } = await supabase
          .from("players")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();
        if (data) setPlayer(data as Player);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setPlayer(null);
      } else if (session?.user && !player) {
        const { data } = await supabase
          .from("players")
          .select("*")
          .eq("auth_user_id", session.user.id)
          .single();
        if (data) setPlayer(data as Player);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(slug: string, password: string): Promise<{ error?: string }> {
    const email = slugToEmail(slug);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Usuário ou senha incorretos" };

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();
      if (data) setPlayer(data as Player);
    }

    router.push("/");
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPlayer(null);
    router.push("/login");
  }

  return { player, signIn, signOut };
}
