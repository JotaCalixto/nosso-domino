import { create } from "zustand";
import type { Player } from "@/lib/supabase/database.types";

interface AuthStore {
  player: Player | null;
  setPlayer: (player: Player | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  player: null,
  setPlayer: (player) => set({ player }),
}));
