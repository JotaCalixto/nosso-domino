import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/shell/BottomNav";
import { ConnectionStatus } from "@/components/shell/ConnectionStatus";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      {/* Preload player images */}
      <div className="sr-only" aria-hidden>
        <Image src="/images/Jota.png" alt="" width={1} height={1} priority />
        <Image src="/images/Iza.png"  alt="" width={1} height={1} priority />
        <Image src="/images/logo.png" alt="" width={1} height={1} priority />
      </div>
      <ConnectionStatus />
      <main className="min-h-dvh pb-20">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
