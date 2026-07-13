"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Camera, 
  LayoutDashboard, 
  Sparkles, 
  LogOut,
  Fingerprint
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
    {
      name: "Gateway",
      href: "/gateway",
      icon: Fingerprint,
      description: "Secure Core Auth",
    },
    {
      name: "Scanner",
      href: "/scanner",
      icon: Camera,
      description: "Bio Mesh Scanner",
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Biometric Dashboard",
    },
    {
      name: "Blueprint",
      href: "/blueprint",
      icon: Sparkles,
      description: "Aesthetic Blueprint",
    },
  ];

  return (
    <aside id="auramax-sidebar" className="w-20 md:w-24 h-screen bg-[#12141c]/60 backdrop-blur-xl border-r border-white/[0.05] flex flex-col items-center justify-between py-8 shrink-0 relative z-50 select-none">
      {/* Top Brand Marker */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10 border border-white/[0.08] flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.05)] overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-mint/20 to-accent-blue/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="font-display font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-accent-mint to-accent-blue tracking-tighter">
            AM
          </span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse mt-2" />
      </div>

      {/* Navigation Options */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-6 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link 
              key={item.href} 
              href={item.href}
              title={item.name}
              className="relative group w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300"
            >
              {/* Glow Behind Active Icon */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-mint/10 to-accent-blue/10 border border-white/[0.12] shadow-[0_0_20px_rgba(20,184,166,0.15)]" />
              )}
              
              {/* Hover Effect Frame */}
              {!isActive && (
                <div className="absolute inset-0 rounded-xl bg-white/[0.02] border border-transparent group-hover:border-white/[0.05] group-hover:bg-white/[0.04] transition-all duration-300" />
              )}

              {/* Icon */}
              <Icon 
                className={`w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-105 ${
                  isActive 
                    ? "text-accent-mint drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]" 
                    : "text-zinc-500 group-hover:text-zinc-200"
                }`} 
              />

              {/* Indicator Dot */}
              {isActive && (
                <span className="absolute -left-1 w-1 h-4 bg-gradient-to-b from-accent-mint to-accent-blue rounded-r" />
              )}

              {/* Premium Floating Tooltip */}
              <div className="absolute left-20 ml-2 scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100 origin-left transition-all duration-300 bg-[#12141c] border border-white/[0.08] rounded-lg px-3 py-1.5 pointer-events-none whitespace-nowrap z-50 shadow-xl shadow-black/80">
                <div className="text-xs font-semibold text-zinc-100 font-sans">{item.name}</div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mt-0.5">{item.description}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Log-Out Button */}
      <div className="w-full px-2 flex flex-col items-center">
        {session ? (
          <button
            onClick={handleSignOut}
            title="Log Out"
            className="w-12 h-12 rounded-xl bg-red-950/10 hover:bg-red-950/20 border border-red-500/10 hover:border-red-500/30 text-red-400 hover:text-red-300 flex items-center justify-center transition-all duration-300 group cursor-pointer"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            
            {/* Tooltip */}
            <div className="absolute left-20 ml-2 scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100 origin-left transition-all duration-300 bg-[#12141c] border border-red-500/20 rounded-lg px-3 py-1.5 pointer-events-none whitespace-nowrap z-50 shadow-xl shadow-black/80">
              <div className="text-xs font-semibold text-red-400 font-sans">LOG_OUT</div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mt-0.5">Terminate Session</div>
            </div>
          </button>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
        )}
      </div>
    </aside>
  );
}
