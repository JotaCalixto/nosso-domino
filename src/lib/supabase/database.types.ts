export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MatchStatus = "aguardando" | "em_andamento" | "pausada" | "finalizada" | "abandonada";
export type RoundStatus = "em_andamento" | "encerrada_batida" | "encerrada_travada";
export type MoveType = "jogada" | "compra" | "passa";
export type BoardSide = "esquerda" | "direita";

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          auth_user_id: string;
          slug: "jota" | "iza";
          display_name: string;
          color_primary: string;
          avatar_path: string;
          tagline: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["players"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
      };
      matches: {
        Row: {
          id: string;
          player1_id: string;
          player2_id: string;
          status: MatchStatus;
          score_player1: number;
          score_player2: number;
          winner_id: string | null;
          current_round_id: string | null;
          season_id: string | null;
          last_activity_at: string;
          started_at: string;
          finished_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["matches"]["Row"], "id" | "started_at" | "last_activity_at">;
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
      };
      rounds: {
        Row: {
          id: string;
          match_id: string;
          round_number: number;
          status: RoundStatus;
          starter_id: string;
          current_turn_id: string | null;
          points_earned: number | null;
          round_winner_id: string | null;
          round_state: Json;
          consecutive_passes: number;
          started_at: string;
          finished_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["rounds"]["Row"], "id" | "started_at" | "consecutive_passes">;
        Update: Partial<Database["public"]["Tables"]["rounds"]["Insert"]>;
      };
      hands: {
        Row: {
          id: string;
          round_id: string;
          player_id: string;
          tiles: Json;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["hands"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["hands"]["Insert"]>;
      };
      moves: {
        Row: {
          id: string;
          round_id: string;
          match_id: string;
          player_id: string;
          move_type: MoveType;
          move_number: number;
          tile_left: number | null;
          tile_right: number | null;
          board_side: BoardSide | null;
          drawn_tile_left: number | null;
          drawn_tile_right: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["moves"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["moves"]["Insert"]>;
      };
      rankings: {
        Row: {
          id: string;
          player_id: string;
          wins: number;
          losses: number;
          total_points: number;
          matches_played: number;
          current_streak: number;
          best_streak: number;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["rankings"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["rankings"]["Insert"]>;
      };
      seasons: {
        Row: {
          id: string;
          year: number;
          month: number;
          starts_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["seasons"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["seasons"]["Insert"]>;
      };
      season_stats: {
        Row: {
          id: string;
          season_id: string;
          player_id: string;
          wins: number;
          losses: number;
          points: number;
        };
        Insert: Omit<Database["public"]["Tables"]["season_stats"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["season_stats"]["Insert"]>;
      };
      achievements: {
        Row: {
          code: string;
          title: string;
          description: string;
          icon: string;
          rule: Json;
          sort_order: number;
        };
        Insert: Database["public"]["Tables"]["achievements"]["Row"];
        Update: Partial<Database["public"]["Tables"]["achievements"]["Row"]>;
      };
      player_achievements: {
        Row: {
          id: string;
          player_id: string;
          achievement_code: string;
          unlocked_at: string;
          match_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["player_achievements"]["Row"], "id" | "unlocked_at">;
        Update: Partial<Database["public"]["Tables"]["player_achievements"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_player_id: { Args: Record<never, never>; Returns: string };
      is_authorized_player: { Args: Record<never, never>; Returns: boolean };
    };
    Enums: {
      match_status: "aguardando" | "em_andamento" | "pausada" | "finalizada" | "abandonada";
      round_status: "em_andamento" | "encerrada_batida" | "encerrada_travada";
      move_type: "jogada" | "compra" | "passa";
      board_side: "esquerda" | "direita";
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Round = Database["public"]["Tables"]["rounds"]["Row"];
export type Hand = Database["public"]["Tables"]["hands"]["Row"];
export type Move = Database["public"]["Tables"]["moves"]["Row"];
export type Ranking = Database["public"]["Tables"]["rankings"]["Row"];
export type Season = Database["public"]["Tables"]["seasons"]["Row"];
export type SeasonStat = Database["public"]["Tables"]["season_stats"]["Row"];
export type Achievement = Database["public"]["Tables"]["achievements"]["Row"];
export type PlayerAchievement = Database["public"]["Tables"]["player_achievements"]["Row"];
