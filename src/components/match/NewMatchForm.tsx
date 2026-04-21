"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMatch } from "@/actions/match";

export function NewMatchForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createMatch();
      if ("error" in res) {
        setError(res.error);
      } else {
        router.push(`/jogar/${res.matchId}`);
      }
    });
  }

  return (
    <div className="w-full flex flex-col items-center gap-8 text-center">
      <div>
        <h1 className="text-gradient-title text-3xl font-bold font-rajdhani">Nova Partida</h1>
        <p className="text-text-muted mt-2 text-sm">A partida começa imediatamente para os dois!</p>
      </div>

      <div className="card-premium rounded-2xl p-6 w-full">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2/50">
          <div className="w-2 h-2 rounded-full bg-jota-400" />
          <span className="text-text-primary text-sm font-medium">Jota vs Iza</span>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 px-4 py-3 rounded-xl w-full text-center">{error}</p>
      )}

      <button
        onClick={handleCreate}
        disabled={pending}
        className="btn-primary w-full py-4 text-lg font-semibold rounded-2xl font-rajdhani tracking-wide disabled:opacity-60"
      >
        {pending ? "Iniciando partida…" : "✦ Iniciar Partida"}
      </button>
    </div>
  );
}
