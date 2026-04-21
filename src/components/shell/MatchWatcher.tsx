"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Listens for new/updated matches in realtime and refreshes the page
 * so the home screen shows the active match card without needing a manual refresh.
 */
export function MatchWatcher() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("home-match-watcher")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
