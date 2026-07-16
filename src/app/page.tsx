"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuraMaxIndexPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/gateway");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#15131a] flex flex-col items-center justify-center p-6">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border border-brass-500/10" />
        <div className="absolute inset-0 rounded-full border border-brass-500 border-t-transparent animate-spin" />
      </div>
      <p className="font-mono text-xs text-zinc-500 tracking-wider uppercase">routing_to_bio_matrix...</p>
    </div>
  );
}
