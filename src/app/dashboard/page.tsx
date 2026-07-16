"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Cpu, 
  Calendar, 
  Lock, 
  Unlock, 
  TrendingUp, 
  ShieldCheck, 
  ChevronRight, 
  HelpCircle,
  Clock,
  ArrowUpRight,
  Info
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { db, HistoricalRecord } from "@/lib/db";
import { buildRecommendationPayload } from "@/lib/payload";
import { fetchAuraRecommendations } from "@/lib/services/apiService";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  // Explicit hydration state, replacing reliance on the bare `isInitializing` boolean alone.
  // Every action that reads current biometric state (Generate Routine, checklist edits) must
  // be gated on 'ready' — previously nothing blocked those actions from firing against
  // default/empty state while the async Supabase+Dexie hydration below was still in flight.
  const [hydrationState, setHydrationState] = useState<"loading" | "ready" | "error">("loading");
  // True once we've confirmed the user has at least one real (non-fabricated) historical
  // record. Replaces the previous silent 5-record mock-data injection.
  const [hasRealHistory, setHasRealHistory] = useState(false);

  // Core biometric state derived from latest scan
  const [currentScore, setCurrentScore] = useState(6.2); // Default fallback: 6.2 out of 10 (62%)
  const [potentialScore] = useState(8.8); // Default potential ceiling: 8.8 out of 10 (88%)
  const [jawlineScore, setJawlineScore] = useState(6.2);
  const [skinScore, setSkinScore] = useState(8.0);
  const [groomingScore, setGroomingScore] = useState(8.2);
  const [symmetryScore, setSymmetryScore] = useState(7.1);

  // Baselines for details
  const [asymmetryIndex, setAsymmetryIndex] = useState(4.25);
  const [jawHeightRatio, setJawHeightRatio] = useState(0.611);
  const [skinCondition, setSkinCondition] = useState("combination");
  const [groomingStyle, setGroomingStyle] = useState("stubble");

  // Additional stats for payload harvest
  const [faceShape, setFaceShape] = useState("Oval");
  const [postureAngle, setPostureAngle] = useState(14.5);
  const [tiltAngle, setTiltAngle] = useState(14.5);
  const [hairTexture, setHairTexture] = useState("straight");
  const [age, setAge] = useState(21);
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(72);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [closeupImage, setCloseupImage] = useState<string | null>(null);
  const [hasRoutine, setHasRoutine] = useState(false);

  // Routine generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [lastRoutineSource, setLastRoutineSource] = useState<{ ok: boolean; source: string; reason?: string } | null>(null);

  // Historical records for graphing
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[]>([]);
  const [hoveredDot, setHoveredDot] = useState<any>(null);

  // 30-day Lock State & Countdown parameters
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [latestScanTimestamp, setLatestScanTimestamp] = useState<number | null>(null);
  const [bypassActive, setBypassActive] = useState(false);

  // Verify Auth Session and hydrate
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      if (!activeSession) {
        router.push("/gateway");
      } else {
        setSession(activeSession);
        fetchHistoryAndHydrate(activeSession.user.id);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      if (!activeSession) {
        router.push("/gateway");
      } else {
        setSession(activeSession);
        fetchHistoryAndHydrate(activeSession.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Combined hydration logic (reads Supabase, syncs locally, fallbacks to high-fidelity mock if empty)
  const fetchHistoryAndHydrate = async (userId: string) => {
    try {
      // 1. Fetch latest state from Supabase biometric_scans
      const { data, error } = await supabase
        .from("biometric_scans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      let parsedRecords: HistoricalRecord[] = [];

      if (error) {
        console.warn("Error reading biometric scans from Supabase:", error.message);
      } else if (data && data.length > 0) {
        // Map data from Supabase
        parsedRecords = data.map((item: any) => {
          const rawSymmetry = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - item.asymmetry_index * 0.45)).toFixed(1));
          const rawJawline = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - Math.abs(item.jaw_height_ratio - 0.65) * 12)).toFixed(1));
          
          let rawSkin = 8.0;
          if (item.skin_condition === "congested") rawSkin = 6.2;
          else if (item.skin_condition === "oily") rawSkin = 7.2;
          else if (item.skin_condition === "dry") rawSkin = 7.8;
          else if (item.skin_condition === "combination") rawSkin = 8.0;

          let rawGrooming = 8.2;
          if (item.grooming_style === "stubble") rawGrooming = 8.2;
          else if (item.grooming_style === "clean-shaven") rawGrooming = 8.8;
          else if (item.grooming_style === "beard") rawGrooming = 8.0;

          const calculatedScore = item.score || parseFloat(((rawJawline + rawSkin + rawGrooming + rawSymmetry) / 4).toFixed(1));

          return {
            id: item.id,
            timestamp: new Date(item.created_at).getTime(),
            score: calculatedScore,
            asymmetryIndex: item.asymmetry_index || 4.25,
            postureAngle: item.posture_angle || 14.5,
            tiltAngle: item.tilt_angle || 14.5,
            jawHeightRatio: item.jaw_height_ratio || 0.611,
            subscores: {
              jawline: rawJawline,
              skin: rawSkin,
              grooming: rawGrooming,
              symmetry: rawSymmetry,
            }
          };
        });
      }

      // 2. Fetch local Dexie database records as well to align
      const localProfile = await db.profiles.get("current_profile");
      const localHistory = await db.history.orderBy("timestamp").toArray();

      if (parsedRecords.length === 0 && localHistory.length > 0) {
        parsedRecords = localHistory;
      }

      // NOTE: previously, if absolutely no history existed, this silently injected 5 fabricated
      // "high-fidelity mock records" with no flag distinguishing them from real data — so a
      // broken Supabase connection or first-run empty state looked identical to a real
      // multi-week trend. We no longer fabricate history. An empty `parsedRecords` is now a
      // real, honest empty state, surfaced via `hasRealHistory` below.
      setHasRealHistory(parsedRecords.length > 0);
      setHistoricalRecords(parsedRecords);

      // Extract details from latest record
      const latest = parsedRecords[parsedRecords.length - 1];
      if (latest) {
        setCurrentScore(latest.score);
        setAsymmetryIndex(latest.asymmetryIndex);
        setJawHeightRatio(latest.jawHeightRatio || 0.611);
        setLatestScanTimestamp(latest.timestamp);

        if (latest.subscores) {
          setJawlineScore(latest.subscores.jawline);
          setSkinScore(latest.subscores.skin);
          setGroomingScore(latest.subscores.grooming);
          setSymmetryScore(latest.subscores.symmetry);
        }
      }

      // Rehydrate string and numeric values from localProfile if they exist
      if (localProfile) {
        setSkinCondition(localProfile.skinCondition || "combination");
        setGroomingStyle(localProfile.groomingStyle || "stubble");
        setFaceShape(localProfile.faceShape || "Oval");
        setAsymmetryIndex(localProfile.asymmetryIndex || 4.25);
        setPostureAngle(localProfile.postureAngle || 14.5);
        setTiltAngle(localProfile.tiltAngle || 14.5);
        setJawHeightRatio(localProfile.jawHeightRatio || 0.611);
        setHairTexture(localProfile.hairTexture || "straight");
        setAge(localProfile.age || 21);
        setHeightCm(localProfile.heightCm || 178);
        setWeightKg(localProfile.weightKg || 72);
        setFrontImage(localProfile.frontImage || null);
        setSideImage(localProfile.sideImage || null);
        setCloseupImage(localProfile.closeupImage || null);
        setHasRoutine(!!localProfile.routine);

        // Prioritize local profile scores if they are fresher than parsedRecords (or if empty)
        if (localProfile.currentScore) {
          setCurrentScore(localProfile.currentScore);
        }
        if (localProfile.subscores) {
          setJawlineScore(localProfile.subscores.jawline);
          setSkinScore(localProfile.subscores.skin);
          setGroomingScore(localProfile.subscores.grooming);
          setSymmetryScore(localProfile.subscores.symmetry);
        }
      }

    } catch (err) {
      console.error("Dexie/Supabase synchronization failure on dashboard page:", err);
      setHydrationState("error");
    } finally {
      setIsInitializing(false);
      setHydrationState((prev) => (prev === "error" ? prev : "ready"));
    }
  };

  // Real-time lock clock updater
  useEffect(() => {
    if (!latestScanTimestamp) return;

    const interval = setInterval(() => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - latestScanTimestamp;
      const remainingMs = thirtyDaysMs - elapsed;

      if (remainingMs > 0) {
        setIsLocked(true);
        const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
        setLockCountdown({ days, hours, minutes, seconds });
      } else {
        setIsLocked(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [latestScanTimestamp]);

  // Handler to compile the custom 30-day Kinesiology, Biochemistry, and Geometric Style routines
  const handleGenerateRoutine = async () => {
    // Previously nothing blocked this from firing while the async Supabase+Dexie hydration
    // above was still in flight — a user clicking quickly after navigating in could send
    // default/placeholder state (age=21, asymmetryIndex=4.25, etc.) to Gemini instead of
    // their real scan. Hydration must be confirmed 'ready' first.
    if (hydrationState !== "ready") {
      setGenerationError("Still loading your profile — try again in a moment.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep(0);

    const stepsInterval = setInterval(() => {
      setGenerationStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1500);

    try {
      // Single source of truth: read the persisted Dexie profile and build the payload via
      // the one shared function (lib/payload.ts) used by every other call site. This file
      // previously had its own third independent copy of this payload-construction logic,
      // with its own divergent cervical_spine_strain_index formula and its own hardcoded
      // `|| 4.25` / `|| 14.5` fallbacks that silently replaced real falsy values (including a
      // genuine 0) with fabricated numbers.
      const profile = await db.profiles.get("current_profile");
      if (!profile) {
        throw new Error("No scan profile found yet. Run a scan before generating a routine.");
      }
      const payload = buildRecommendationPayload(profile, historicalRecords);

      const data = await fetchAuraRecommendations(payload);
      setLastRoutineSource({ ok: data.ok, source: data.source, reason: data.reason });

      if (!data || !data.routine) {
        throw new Error("Invalid routine response received from AuraMax biometric engine.");
      }

      // Save routine checks to localStorage immediately on generation
      localStorage.setItem("auramax_routine_checks", JSON.stringify([]));

      // 1. DATA PERSISTENCE BINDING: Save recommendations inside IndexedDB via Dexie
      await db.metricsRecords.put({
        id: "latest",
        timestamp: Date.now(),
        faceShape,
        symmetryScore: Math.round(currentScore * 10),
        forwardHeadAngle: postureAngle,
        hairTexture,
        age,
        skinCondition,
        groomingStyle,
        subscores: {
          jawline: Number(jawlineScore),
          skin: Number(skinScore),
          grooming: Number(groomingScore),
          symmetry: Number(symmetryScore),
        },
        routine: data.routine,
        routineChecks: [],
      });

      // 2. Dexie current_profile update
      await db.profiles.put({
        id: "current_profile",
        frontImage,
        sideImage,
        closeupImage,
        faceShape,
        asymmetryIndex,
        postureAngle,
        tiltAngle,
        jawHeightRatio,
        skinCondition,
        groomingStyle,
        hairTexture,
        age,
        heightCm,
        weightKg,
        subscores: {
          jawline: jawlineScore,
          skin: skinScore,
          grooming: groomingScore,
          symmetry: symmetryScore,
          posture: postureAngle
        },
        currentScore,
        potentialScore,
        routine: data.routine,
        routineChecks: [],
        lastUpdated: Date.now(),
      } as any);

      // 3. Cloud Database/Supabase sync
      if (session?.user?.id) {
        await supabase.from("user_routines").insert([{
          user_id: session.user.id,
          routine: data.routine,
          created_at: new Date().toISOString()
        }]);
      }

      setHasRoutine(true);
      clearInterval(stepsInterval);

      // Redirect directly to Blueprint page
      router.push("/blueprint");

    } catch (err: any) {
      console.error("Routine generation core engine failed:", err);
      setGenerationError(err.message || "ROUTINE_INFERENCE_ENGINE_FAIL");
      clearInterval(stepsInterval);
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-[#15131a] text-zinc-400 flex flex-col items-center justify-center p-6">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border border-brass-500/10" />
          <div className="absolute inset-0 rounded-full border border-brass-500 border-t-transparent animate-spin" />
        </div>
        <p className="font-mono text-xs text-zinc-500 tracking-wider uppercase">HYDRATING_DASHBOARD_MATRIX...</p>
      </div>
    );
  }

  // Delta score calculations (displayed as percentages)
  const currentPercent = Math.round(currentScore * 10);
  const potentialPercent = Math.round(potentialScore * 10);
  const aestheticDeltaPercent = Math.max(0, potentialPercent - currentPercent);

  // Math variables for SVG progress circles
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // 339.292
  const strokeOffset = circumference - (circumference * currentPercent) / 100;

  // Coordinate math for the maximum potential ceiling diamond/dot on the radial arc
  // Angle calculated in radians (-90deg offset from top)
  const potentialAngleRad = (potentialPercent / 100) * 2 * Math.PI - Math.PI / 2;
  const ceilingX = 70 + radius * Math.cos(potentialAngleRad);
  const ceilingY = 70 + radius * Math.sin(potentialAngleRad);

  return (
    <div className="min-h-screen bg-[#15131a] text-zinc-300 antialiased font-sans pb-16 px-4 sm:px-6 lg:px-8 pt-8 relative overflow-hidden select-none">
      
      {/* Absolute cybernetic grid backdrops */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brass-500/[0.03] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-phosphor-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">

        {/* PAGE HEADER */}
        <header className="pb-4 border-b border-white/[0.05] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brass-400 animate-pulse" />
              <h1 className="font-display font-black text-xl tracking-tight text-white uppercase">
                Biometric Optimization Hub
              </h1>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1 uppercase">
              REHYDRATED SECURE BIOMETRICS_SYS_D1
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[9px] text-zinc-500 bg-[#1c1a24]/60 border border-white/[0.04] rounded-lg px-3 py-1.5">
            <span>SUBJECT_ID:</span>
            <span className="text-brass-400 font-bold uppercase">
              {session?.user?.email?.split("@")[0] || "AuraUser"}
            </span>
          </div>
        </header>

        {/* MODULE 4: THE 30-DAY LOCK MILESTONE BANNER */}
        <AnimatePresence>
          {isLocked && !bypassActive && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id="lock-milestone-banner" 
              className="w-full bg-[#161a22]/90 border border-yellow-500/20 rounded-2xl p-5 flex flex-col lg:flex-row items-center justify-between gap-4 backdrop-blur-md relative overflow-hidden"
            >
              {/* Subtle background glow */}
              <div className="absolute top-0 right-1/4 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3.5 w-full lg:w-auto">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest font-bold">
                      Aesthetic Cycle Locked
                    </span>
                    <span className="text-[8px] font-mono bg-yellow-500/10 text-yellow-500/80 px-1.5 py-0.5 rounded uppercase border border-yellow-500/20">
                      Physiological Delta Block
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal max-w-xl mt-1">
                    Your baseline metrics are committed. To ensure structural tissue adaptation and postural muscle training, the diagnostic scanner is held in baseline cycle lock for 30 days.
                  </p>
                </div>
              </div>

              {/* Countdown metrics */}
              <div className="flex items-center gap-2 sm:gap-4 shrink-0 w-full sm:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-white/[0.05] pt-3 lg:pt-0">
                <div className="flex items-center gap-1">
                  <div className="bg-[#090a0f] border border-white/[0.04] px-2.5 py-1.5 rounded-lg text-center min-w-[48px]">
                    <span className="block text-sm font-bold font-mono text-zinc-100">{String(lockCountdown.days).padStart(2, '0')}</span>
                    <span className="text-[7px] text-zinc-500 font-mono block uppercase">Days</span>
                  </div>
                  <span className="text-zinc-600 font-mono">:</span>
                  <div className="bg-[#090a0f] border border-white/[0.04] px-2.5 py-1.5 rounded-lg text-center min-w-[48px]">
                    <span className="block text-sm font-bold font-mono text-zinc-100">{String(lockCountdown.hours).padStart(2, '0')}</span>
                    <span className="text-[7px] text-zinc-500 font-mono block uppercase">Hrs</span>
                  </div>
                  <span className="text-zinc-600 font-mono">:</span>
                  <div className="bg-[#090a0f] border border-white/[0.04] px-2.5 py-1.5 rounded-lg text-center min-w-[48px]">
                    <span className="block text-sm font-bold font-mono text-zinc-100">{String(lockCountdown.minutes).padStart(2, '0')}</span>
                    <span className="text-[7px] text-zinc-500 font-mono block uppercase">Min</span>
                  </div>
                  <span className="text-zinc-600 font-mono">:</span>
                  <div className="bg-[#090a0f] border border-white/[0.04] px-2.5 py-1.5 rounded-lg text-center min-w-[48px]">
                    <span className="block text-sm font-bold font-mono text-yellow-500 animate-pulse">{String(lockCountdown.seconds).padStart(2, '0')}</span>
                    <span className="text-[7px] text-zinc-500 font-mono block uppercase">Sec</span>
                  </div>
                </div>

                <button
                  onClick={() => setBypassActive(true)}
                  className="bg-[#090a0f] border border-yellow-500/20 hover:border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10 text-[9px] font-mono tracking-wider py-2.5 px-3.5 rounded-xl transition-all uppercase cursor-pointer"
                >
                  Bypass Lock
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bypass Active Visual Toast Indicator */}
        {bypassActive && isLocked && (
          <div className="w-full bg-brass-500/5 border border-brass-500/20 rounded-xl px-4 py-2 flex items-center justify-between text-[10px] font-mono">
            <span className="text-brass-400 uppercase flex items-center gap-2">
              <Unlock className="w-3.5 h-3.5 animate-pulse" />
              DEVELOPER_MODE_BYPASS: Biometric diagnostic scan chamber unlocked for prototyping.
            </span>
            <button 
              onClick={() => setBypassActive(false)}
              className="text-zinc-500 hover:text-zinc-300 underline uppercase"
            >
              Restore lock
            </button>
          </div>
        )}

        {/* HIGH-CONTRAST BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT COLUMN: HERO STAT + ACTION BANNER */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* MODULE 1: THE HERO STAT */}
            <div className="bg-[#1c1a24]/40 border border-white/[0.05] rounded-3xl p-6 flex flex-col justify-between backdrop-blur-xl relative overflow-hidden shadow-2xl flex-1">
              {/* Background cybernetic grid details */}
              <div className="absolute right-0 top-0 w-44 h-44 bg-brass-500/[0.04] rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-phosphor-500/[0.02] rounded-full blur-3xl pointer-events-none" />
              
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.04] mb-6">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-brass-400" />
                    <span className="font-mono text-xs font-semibold tracking-wider text-white">
                      I. OPTIMIZATION_VECTORS
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-zinc-500 bg-white/[0.03] border border-white/[0.04] px-2 py-0.5 rounded uppercase">
                    AXIAL_DELTA_TRK
                  </span>
                </div>

                {/* Circular Gauge Presentation */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                  <div className="relative w-40 h-40 shrink-0">
                    <svg viewBox="0 0 140 140" className="w-full h-full rotate-[-90deg]">
                      <defs>
                        <linearGradient id="radialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <filter id="glow-effect">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>

                      {/* Circle Background Track */}
                      <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        className="stroke-zinc-800/40 fill-none"
                        strokeWidth="6"
                        strokeDasharray="4 2"
                      />

                      {/* Current Optimization Path */}
                      <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        className="fill-none"
                        stroke="url(#radialGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeOffset}
                        filter="url(#glow-effect)"
                        style={{ transition: "stroke-dashoffset 1s ease-out" }}
                      />

                      {/* Maximum Potential Ceiling Diamond dot */}
                      <circle
                        cx={ceilingX}
                        cy={ceilingY}
                        r="4.5"
                        className="fill-phosphor-400 stroke-zinc-950 stroke-[1.5] animate-pulse"
                      />
                    </svg>

                    {/* Absolute Center Text Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block leading-none">
                        CURRENT
                      </span>
                      <span className="text-3xl font-display font-black tracking-tighter text-white font-mono leading-tight">
                        {currentPercent}%
                      </span>
                      <span className="text-[9px] font-mono bg-brass-500/10 text-brass-400 border border-brass-500/20 rounded px-1.5 py-0.5 block mt-0.5">
                        +{aestheticDeltaPercent}% DELTA
                      </span>
                    </div>
                  </div>

                  {/* Legend details */}
                  <div className="flex-1 flex flex-col gap-4 self-center font-mono">
                    <div className="bg-zinc-950/40 border border-white/[0.02] p-3 rounded-xl">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] uppercase tracking-wider mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-brass-400" />
                        Current Optimization
                      </div>
                      <p className="text-sm font-bold text-zinc-100">{currentPercent}%</p>
                      <p className="text-[8px] text-zinc-500 font-sans leading-none mt-1">Calculated structural average.</p>
                    </div>

                    <div className="bg-zinc-950/40 border border-white/[0.02] p-3 rounded-xl">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] uppercase tracking-wider mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-phosphor-400" />
                        Aesthetic Ceiling
                      </div>
                      <p className="text-sm font-bold text-zinc-100">{potentialPercent}%</p>
                      <p className="text-[8px] text-zinc-500 font-sans leading-none mt-1">Maximum bio-potential vector.</p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-4 pt-4 border-t border-white/[0.04] text-[10px] text-zinc-500 leading-normal font-sans">
                *The <span className="text-brass-400 font-mono">DELTA</span> represents the biomechanical headroom unlockable via optimized posture, skin lipid synthesis, and facial development habits.
              </div>
            </div>

            {/* PREMIUM HIGH-CONTRAST ACTION BANNER */}
            <div className="bg-[#1c1a24]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brass-400 via-phosphor-500 to-indigo-500" />
              
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brass-400 animate-pulse" />
                  <h3 className="font-mono text-xs font-semibold tracking-wider text-white">
                    BIO_ROUTINE_SYNTHESIZER
                  </h3>
                </div>
                <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full ${hasRoutine ? "bg-brass-500/10 text-brass-400 border border-brass-500/20" : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"}`}>
                  {hasRoutine ? "OPTIMIZATION_ACTIVE" : "AWAITING_GENERATION"}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                Compile your custom 30-day Kinesiology, Biochemistry, and Geometric Style routines powered by our core Gemini biometric inference engine.
              </p>

              {generationError && (
                <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 font-mono text-[9px] tracking-wide leading-relaxed uppercase">
                  ERROR: {generationError}
                </div>
              )}

              {lastRoutineSource && !lastRoutineSource.ok && (
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-amber-400 font-mono text-[9px] tracking-wide leading-relaxed">
                  RULE-BASED FALLBACK, NOT AI-GENERATED ({lastRoutineSource.source}
                  {lastRoutineSource.reason ? `: ${lastRoutineSource.reason}` : ""})
                </div>
              )}

              {!hasRealHistory && hydrationState === "ready" && (
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-zinc-500 font-mono text-[9px] tracking-wide leading-relaxed">
                  No scans yet — run your first scan for a real, personalized routine instead of generic defaults.
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateRoutine}
                disabled={isGenerating || hydrationState !== "ready"}
                title={hydrationState !== "ready" ? "Still loading your profile..." : undefined}
                className="w-full bg-gradient-to-r from-brass-400 to-phosphor-500 text-zinc-950 hover:from-brass-300 hover:to-phosphor-400 font-mono text-xs font-bold uppercase tracking-wider py-4 px-4 rounded-2xl shadow-[0_0_20px_rgba(20,184,166,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Cpu className="w-4 h-4 text-zinc-950" />
                {hydrationState !== "ready" ? "Loading Profile..." : "Generate Optimization Routine"}
              </button>
            </div>

          </div>

          {/* RIGHT BENTO BLOCK (UPPER LAYOUT): MODULE 2: THE FEATURE RATING MATRIX */}
          <div className="lg:col-span-7 bg-[#1c1a24]/40 border border-white/[0.05] rounded-3xl p-6 flex flex-col justify-between backdrop-blur-xl relative overflow-hidden shadow-2xl">
            {/* Background gradients */}
            <div className="absolute right-10 bottom-0 w-32 h-32 bg-brass-500/[0.02] rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.04] mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brass-400" />
                  <span className="font-mono text-xs font-semibold tracking-wider text-white">
                    II. FEATURE_RATING_MATRIX
                  </span>
                </div>
                <span className="text-[8px] font-mono text-zinc-500 bg-white/[0.03] border border-white/[0.04] px-2 py-0.5 rounded uppercase">
                  NON_REDUNDANT_RATING_CELL
                </span>
              </div>

              {/* Custom Borders Table Matrix */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left font-mono border-collapse">
                  <thead>
                    <tr className="text-[9px] text-zinc-500 border-b border-white/[0.04]">
                      <th className="pb-2.5 font-bold uppercase tracking-wider">Diagnostic Domain</th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider text-center">Coordinate Baseline</th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider text-center">Metric Status</th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider text-right">Rating Row</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-xs">
                    
                    {/* Row 1: Jawline Frame */}
                    <tr className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 pr-2 font-semibold text-zinc-200">
                        <span className="block">Jawline Frame</span>
                        <span className="text-[8px] text-zinc-500 block font-normal font-sans">Mandibular vertical/width ratios</span>
                      </td>
                      <td className="py-3 text-center text-[10px] text-zinc-400">
                        {jawHeightRatio.toFixed(3)} / 0.650
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-block text-[8px] font-bold bg-brass-500/10 text-brass-400 border border-brass-500/20 rounded px-2 py-0.5 uppercase tracking-wider">
                          Optimized
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="hidden sm:block w-16 bg-zinc-900 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-brass-400" style={{ width: `${jawlineScore * 10}%` }} />
                          </div>
                          <span className="font-bold text-white text-xs">{jawlineScore.toFixed(1)}/10</span>
                        </div>
                      </td>
                    </tr>

                    {/* Row 2: Skin Health */}
                    <tr className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 pr-2 font-semibold text-zinc-200">
                        <span className="block">Skin Health</span>
                        <span className="text-[8px] text-zinc-500 block font-normal font-sans">Active lipid & epidermal state</span>
                      </td>
                      <td className="py-3 text-center text-[10px] text-zinc-400 uppercase">
                        {skinCondition} Sebum
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-block text-[8px] font-bold bg-phosphor-500/10 text-phosphor-400 border border-phosphor-500/20 rounded px-2 py-0.5 uppercase tracking-wider">
                          Standard
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="hidden sm:block w-16 bg-zinc-900 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-brass-400" style={{ width: `${skinScore * 10}%` }} />
                          </div>
                          <span className="font-bold text-white text-xs">{skinScore.toFixed(1)}/10</span>
                        </div>
                      </td>
                    </tr>

                    {/* Row 3: Groom Styling */}
                    <tr className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 pr-2 font-semibold text-zinc-200">
                        <span className="block">Groom Styling</span>
                        <span className="text-[8px] text-zinc-500 block font-normal font-sans">Symmetric follicle distribution</span>
                      </td>
                      <td className="py-3 text-center text-[10px] text-zinc-400 uppercase">
                        {groomingStyle} Base
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-block text-[8px] font-bold bg-brass-500/10 text-brass-400 border border-brass-500/20 rounded px-2 py-0.5 uppercase tracking-wider">
                          Optimized
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="hidden sm:block w-16 bg-zinc-900 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-brass-400" style={{ width: `${groomingScore * 10}%` }} />
                          </div>
                          <span className="font-bold text-white text-xs">{groomingScore.toFixed(1)}/10</span>
                        </div>
                      </td>
                    </tr>

                    {/* Row 4: Bilateral Parallel Symmetry */}
                    <tr className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 pr-2 font-semibold text-zinc-200">
                        <span className="block">Bilateral Parallel Symmetry</span>
                        <span className="text-[8px] text-zinc-500 block font-normal font-sans">Canthal tilt & facial bilateral midline</span>
                      </td>
                      <td className="py-3 text-center text-[10px] text-zinc-400">
                        {asymmetryIndex.toFixed(2)}% Asym
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-block text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2 py-0.5 uppercase tracking-wider">
                          Elite
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="hidden sm:block w-16 bg-zinc-900 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-brass-400" style={{ width: `${symmetryScore * 10}%` }} />
                          </div>
                          <span className="font-bold text-white text-xs">{symmetryScore.toFixed(1)}/10</span>
                        </div>
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-brass-400" />
                Table represents non-redundant baseline measurements.
              </span>
              <span className="font-mono text-zinc-400">METRIC_CALIBRATION_STANDARD_V2</span>
            </div>
          </div>

          {/* LOWER BENTO BLOCK (FULL WIDTH): MODULE 3: THE VELOCITY PROGRESS CHART */}
          <div className="lg:col-span-12 bg-[#1c1a24]/40 border border-white/[0.05] rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col justify-between">
            <div className="absolute top-0 right-10 w-48 h-48 bg-brass-500/[0.02] rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.04] mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brass-400" />
                    <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                      III. CHRONOLOGICAL_VELOCITY_PROGRESS
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                    Linear trend vector linking chronological diagnostic score events. Hover on coordinates to trace crosshairs.
                  </p>
                </div>

                <div className="flex items-center gap-4 text-[9px] font-mono text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brass-400" />
                    <span>Score Velocity</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-phosphor-400" />
                    <span>Historical Events: {historicalRecords.length}</span>
                  </div>
                </div>
              </div>

              {/* RESPONSIVE SVG GRAPH WRAPPER */}
              <div className="relative w-full h-56 bg-zinc-950/40 rounded-2xl border border-white/[0.03] p-4 flex flex-col justify-between overflow-hidden">
                
                {/* Horizontal gridlines */}
                <div className="absolute inset-x-0 top-[20%] border-b border-white/[0.02] pointer-events-none" />
                <div className="absolute inset-x-0 top-[40%] border-b border-white/[0.02] pointer-events-none" />
                <div className="absolute inset-x-0 top-[60%] border-b border-white/[0.02] pointer-events-none" />
                <div className="absolute inset-x-0 top-[80%] border-b border-white/[0.02] pointer-events-none" />

                <div className="flex-1 w-full relative h-36">
                  {(() => {
                    const sorted = [...historicalRecords].sort((a, b) => a.timestamp - b.timestamp);
                    const count = sorted.length;
                    
                    // Scores array on 1-10 scale
                    const scores = sorted.map(r => r.score);
                    const minScore = Math.max(0, Math.min(...scores) - 0.4);
                    const maxScore = Math.min(10, Math.max(...scores) + 0.4);
                    const scoreRange = (maxScore - minScore) || 1;

                    // Compute percentage-based points (0 to 100 coordinates inside viewBox)
                    const mappedPoints = sorted.map((r, index) => {
                      const x = count > 1 ? (index / (count - 1)) * 90 + 5 : 50;
                      const y = 90 - ((r.score - minScore) / scoreRange) * 80;
                      return { x, y, r };
                    });

                    // Construction of the SVG Line and Shading Area
                    let pathString = "";
                    let areaString = "";
                    if (mappedPoints.length > 0) {
                      pathString = `M ${mappedPoints[0].x} ${mappedPoints[0].y}`;
                      mappedPoints.forEach((p, idx) => {
                        if (idx > 0) {
                          pathString += ` L ${p.x} ${p.y}`;
                        }
                      });
                      // Construct the closed polygon for the fill gradient
                      areaString = `${pathString} L ${mappedPoints[mappedPoints.length - 1].x} 95 L ${mappedPoints[0].x} 95 Z`;
                    }

                    return (
                      <div className="w-full h-full relative">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="svgGradientGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Shading fill area */}
                          {areaString && (
                            <path d={areaString} fill="url(#svgGradientGlow)" />
                          )}

                          {/* Line Graph Path */}
                          {pathString && (
                            <path 
                              d={pathString} 
                              fill="none" 
                              stroke="#14b8a6" 
                              strokeWidth="1.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          )}

                          {/* Active Hover Crosshairs */}
                          {hoveredDot !== null && (
                            <>
                              {/* Vertical tracking line */}
                              <line 
                                x1={mappedPoints[hoveredDot].x} 
                                y1="5" 
                                x2={mappedPoints[hoveredDot].x} 
                                y2="95" 
                                stroke="rgba(20, 184, 166, 0.45)" 
                                strokeDasharray="1.5 1.5" 
                                strokeWidth="0.5"
                              />
                              {/* Horizontal tracking line */}
                              <line 
                                x1="5" 
                                y1={mappedPoints[hoveredDot].y} 
                                x2="95" 
                                y2={mappedPoints[hoveredDot].y} 
                                stroke="rgba(20, 184, 166, 0.45)" 
                                strokeDasharray="1.5 1.5" 
                                strokeWidth="0.5"
                              />
                            </>
                          )}

                          {/* Individual Coordinate circle indicators */}
                          {mappedPoints.map((pt, idx) => {
                            const isHovered = hoveredDot === idx;
                            return (
                              <g 
                                key={idx} 
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredDot(idx)}
                                onMouseLeave={() => setHoveredDot(null)}
                                onClick={() => setHoveredDot(idx)}
                              >
                                {/* Invisible larger touch capture circle */}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="5"
                                  fill="transparent"
                                />
                                {/* Display point circle */}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? "3.5" : "2"}
                                  className={`transition-all duration-150 ${
                                    isHovered 
                                      ? "fill-brass-400 stroke-zinc-950 stroke-[1.5]" 
                                      : "fill-brass-500"
                                  }`}
                                />
                              </g>
                            );
                          })}
                        </svg>

                        {/* Interactive floating popover HUD */}
                        <AnimatePresence>
                          {hoveredDot !== null && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute top-2 left-6 bg-[#090a0f]/95 border border-white/[0.08] rounded-xl p-3 backdrop-blur-md shadow-2xl z-30 font-mono text-[9px] max-w-[200px]"
                            >
                              <div className="flex justify-between items-center pb-1.5 border-b border-white/[0.05] mb-2">
                                <span className="text-zinc-500">
                                  {new Date(sorted[hoveredDot].timestamp).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                                <span className="text-brass-400 font-bold">
                                  {(sorted[hoveredDot].score * 10).toFixed(0)}%
                                </span>
                              </div>
                              <div className="space-y-1 text-zinc-400">
                                <div className="flex justify-between">
                                  <span>JAWLINE:</span>
                                  <span className="text-zinc-200 font-bold">{(sorted[hoveredDot].subscores?.jawline || 6.2).toFixed(1)}/10</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>SKIN:</span>
                                  <span className="text-zinc-200 font-bold">{(sorted[hoveredDot].subscores?.skin || 8.0).toFixed(1)}/10</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>GROOMING:</span>
                                  <span className="text-zinc-200 font-bold">{(sorted[hoveredDot].subscores?.grooming || 8.2).toFixed(1)}/10</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>SYMMETRY:</span>
                                  <span className="text-zinc-200 font-bold">{(sorted[hoveredDot].subscores?.symmetry || 7.1).toFixed(1)}/10</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}
                </div>

                {/* Date axis labels */}
                <div className="flex justify-between text-[8px] text-zinc-500 font-mono pt-2 px-2 border-t border-white/[0.03]">
                  <span>
                    {new Date(historicalRecords[0]?.timestamp || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <span className="uppercase text-zinc-600">Dynamic Velocity Mapping Loop</span>
                  <span>
                    {new Date(historicalRecords[historicalRecords.length - 1]?.timestamp || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>

            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-zinc-500 font-sans">
              <span>Historical velocity maps demonstrate your biological optimization rate over real calendar weeks.</span>
              <span className="font-mono text-zinc-400 uppercase">SYS_TREND: STABLE_GROWTH</span>
            </div>
          </div>

        </div>

      </div>

      {/* LOADING OVERLAY */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-zinc-950/95 backdrop-blur-xl"
          >
            <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
              {/* Spinning cybernetic loader */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-2 border-brass-500/10" />
                <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-brass-400 animate-spin" />
                <div className="absolute inset-4 rounded-full border-2 border-phosphor-500/10" />
                <div className="absolute inset-4 rounded-full border-b-2 border-l-2 border-phosphor-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <Cpu className="absolute inset-0 m-auto w-8 h-8 text-brass-400 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-display font-black text-white uppercase tracking-tight">
                  {generationStep === 0 && "INITIATING_BIO_INFERENCE..."}
                  {generationStep === 1 && "PARSING_CRANIOFACIAL_MESH..."}
                  {generationStep === 2 && "SYNTHESIZING_AESTHETIC_AXIS..."}
                  {generationStep === 3 && "GENERATING_CUSTOM_BLUEPRINT..."}
                </h2>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  {generationStep === 0 && "CONTACTING AURAMAX CORE ENGINES"}
                  {generationStep === 1 && "MAPPING KINESIOLOGY & JAWLINE TARGETS"}
                  {generationStep === 2 && "STRUCTURING 30-DAY BIODEVELOPMENT SCHEDULE"}
                  {generationStep === 3 && "PERSISTING BLUEPRINT RECORD MATRIX"}
                </p>
              </div>

              {/* Progress Bar simulation */}
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/[0.02]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-brass-400 to-phosphor-500" 
                  initial={{ width: "0%" }}
                  animate={{ width: `${(generationStep + 1) * 25}%` }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </div>

              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider animate-pulse">
                PLEASE_KEEP_TAB_ACTIVE_THIRTY_SECONDS
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
