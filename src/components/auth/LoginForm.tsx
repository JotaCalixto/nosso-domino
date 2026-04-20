"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

export function LoginForm() {
  const { signIn } = useAuth();
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(slug.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ background: "var(--gradient-home)" }}
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
        className="mb-8 flex flex-col items-center gap-4"
      >
        <div
          className="relative w-28 h-28 rounded-full overflow-hidden"
          style={{ filter: "drop-shadow(0 0 24px rgba(251,191,36,0.5))" }}
        >
          <Image
            src="/images/logo.png"
            alt="Nosso Dominó"
            fill
            className="object-cover"
            priority
          />
        </div>
        <h1
          className="font-display font-bold text-gradient-title"
          style={{ fontSize: "2.5rem", letterSpacing: "0.05em", lineHeight: 1 }}
        >
          Nosso Dominó
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Só para nós dois
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="card-premium w-full max-w-sm p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="slug"
            className="text-xs font-display uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Usuário
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Jota ou Iza"
            autoComplete="username"
            autoCapitalize="none"
            required
            className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border-medium)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--jota-600)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-medium)")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-xs font-display uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border-medium)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--jota-600)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-medium)")}
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-center rounded-lg px-3 py-2"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Entrando...
            </span>
          ) : (
            "Entrar"
          )}
        </button>
      </motion.form>
    </div>
  );
}
