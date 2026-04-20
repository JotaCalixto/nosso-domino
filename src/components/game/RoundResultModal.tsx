"use client";

import { motion } from "framer-motion";

interface RoundResultProps {
  winnerId: string;
  meId: string;
  points: number;
  reason: "batida" | "travada";
  onContinue: () => void;
}

export function RoundResultModal({ winnerId, meId, points, reason, onContinue }: RoundResultProps) {
  const iWon = winnerId === meId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="card-premium rounded-3xl p-8 w-full max-w-sm text-center"
      >
        <div className="text-5xl mb-4">{iWon ? "🏆" : "💔"}</div>
        <h2 className={`text-2xl font-bold font-rajdhani mb-1 ${iWon ? "text-gold-400" : "text-text-muted"}`}>
          {iWon ? "Você venceu a rodada!" : "Adversário venceu!"}
        </h2>
        <p className="text-text-muted text-sm mb-1">
          {reason === "batida" ? "Batida!" : "Jogo travado"}
        </p>
        {points > 0 && (
          <p className="text-text-secondary text-sm mb-6">
            +{points} pontos para {iWon ? "você" : "o adversário"}
          </p>
        )}
        <button onClick={onContinue} className="btn-primary w-full py-3 rounded-xl font-semibold">
          Próxima rodada
        </button>
      </motion.div>
    </motion.div>
  );
}

interface MatchVictoryProps {
  winnerId: string;
  meId: string;
  score1: number;
  score2: number;
  onHome: () => void;
}

export function MatchVictoryModal({ winnerId, meId, score1, score2, onHome }: MatchVictoryProps) {
  const iWon = winnerId === meId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
    >
      <motion.div
        initial={{ scale: 0.7, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 18 }}
        className="card-premium rounded-3xl p-8 w-full max-w-sm text-center"
      >
        <div className="text-6xl mb-4">{iWon ? "👑" : "😔"}</div>
        <h2 className={`text-3xl font-bold font-rajdhani mb-2 ${iWon ? "text-gradient-gold" : "text-text-muted"}`}>
          {iWon ? "CAMPEÃO!" : "Fim de jogo"}
        </h2>
        <p className="text-text-secondary mb-6 text-sm">
          {iWon ? "Você venceu a partida!" : "O adversário venceu desta vez."}
        </p>
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-jota-400">{score1}</div>
            <div className="text-text-muted text-xs mt-1">Pontos</div>
          </div>
          <div className="text-text-muted text-xl self-center">×</div>
          <div className="text-center">
            <div className="text-3xl font-bold text-iza-300">{score2}</div>
            <div className="text-text-muted text-xs mt-1">Pontos</div>
          </div>
        </div>
        <button onClick={onHome} className="btn-primary w-full py-3 rounded-xl font-semibold">
          Voltar ao início
        </button>
      </motion.div>
    </motion.div>
  );
}
