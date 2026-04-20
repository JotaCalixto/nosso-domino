"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full py-3 rounded-xl border border-surface-3 text-text-muted text-sm hover:border-red-500/50 hover:text-red-400 transition-colors"
    >
      Sair da conta
    </button>
  );
}
