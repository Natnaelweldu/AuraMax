"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  LayoutDashboard,
  Sparkles,
  LogOut,
  Fingerprint,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/gateway");
  };

  const navItems = [
    { name: "Gateway", href: "/gateway", icon: Fingerprint, description: "Secure core auth" },
    { name: "Scanner", href: "/scanner", icon: Camera, description: "Biometric mesh scanner" },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Biometric dashboard" },
    { name: "Blueprint", href: "/blueprint", icon: Sparkles, description: "Aesthetic blueprint" },
  ];

  return (
    <aside
      id="auramax-sidebar"
      className="w-20 md:w-24 h-screen bg-graphite-800/70 backdrop-blur-xl border-r border-white/[0.05] flex flex-col items-center justify-between py-8 shrink-0 relative z-50 select-none"
    >
      {/* Brand mark — the reticle motif, in miniature */}
      <div className="flex flex-col items-center gap-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="reticle relative w-10 h-10 rounded-md bg-graphite-700/60 border border-white/[0.06] flex items-center justify-center overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brass-400/10 to-phosphor-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="font-display font-medium italic text-base text-transparent bg-clip-text bg-gradient-to-br from-brass-300 to-phosphor-300 tracking-tight">
            Æ
          </span>
        </motion.div>
        <div className="w-1 h-1 rounded-full bg-brass-400/80 animate-phosphor-pulse" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-5 w-full px-2">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.name}
              className="relative group w-12 h-12 flex items-center justify-center rounded-md transition-colors duration-300"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-frame"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="reticle absolute inset-0 rounded-md bg-brass-400/[0.07] border border-brass-400/25"
                />
              )}

              {!isActive && (
                <div className="absolute inset-0 rounded-md bg-white/[0.015] border border-transparent group-hover:border-white/[0.06] group-hover:bg-white/[0.03] transition-all duration-300" />
              )}

              <Icon
                className={`w-[18px] h-[18px] relative z-10 transition-all duration-300 group-hover:scale-105 ${
                  isActive
                    ? "text-brass-300"
                    : "text-zinc-500 group-hover:text-zinc-200"
                }`}
                strokeWidth={1.75}
              />

              {isActive && (
                <motion.span
                  layoutId="sidebar-active-tick"
                  className="absolute -left-2 w-[3px] h-5 bg-brass-400 rounded-r-full"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}

              {/* Tooltip */}
              <div className="absolute left-20 ml-2 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 origin-left transition-all duration-200 bg-graphite-800 border border-white/[0.08] rounded-md px-3 py-1.5 pointer-events-none whitespace-nowrap z-50 shadow-xl shadow-black/80">
                <div className="text-xs font-medium text-zinc-100 font-sans">{item.name}</div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mt-0.5">{item.description}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="w-full px-2 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {session ? (
            <motion.button
              key="signed-in"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleSignOut}
              title="Log out"
              className="relative group w-12 h-12 rounded-md bg-red-950/10 hover:bg-red-950/20 border border-red-500/10 hover:border-red-500/30 text-red-400 hover:text-red-300 flex items-center justify-center transition-all duration-300 cursor-pointer"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.75} />
              <div className="absolute left-20 ml-2 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 origin-left transition-all duration-200 bg-graphite-800 border border-red-500/20 rounded-md px-3 py-1.5 pointer-events-none whitespace-nowrap z-50 shadow-xl shadow-black/80">
                <div className="text-xs font-medium text-red-400 font-sans">Log out</div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mt-0.5">End this session</div>
              </div>
            </motion.button>
          ) : (
            <motion.div key="signed-out" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
