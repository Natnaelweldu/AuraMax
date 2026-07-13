"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Activity, 
  Info, 
  ChevronRight, 
  Layers, 
  Check, 
  Compass, 
  Scissors, 
  FlaskConical, 
  HelpCircle,
  TrendingUp,
  Brain,
  Award,
  Zap,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { db, HistoricalRecord } from "@/lib/db";
import { buildRecommendationPayload } from "@/lib/payload";
import { fetchAuraRecommendations } from "@/lib/services/apiService";
import { motion, AnimatePresence } from "framer-motion";

interface Routine {
  structuralKinesiology: Array<{
    title: string;
    description: string;
    frequency: string;
    volume: string;
    targetMetrics: string;
  }>;
  dermBiochemistry: Array<{
    title: string;
    purpose: string;
    applicationInstructions: string;
    scientificNotes: string;
  }>;
  geometricGrooming: {
    haircutSuggestion: string;
    facialHairGeometry: string;
    eyebrowSymmetryMap: string;
    aestheticJustification: string;
  };
  lifestyleDirectives: string[];
}

export default function BlueprintPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<{ ok: boolean; source: string; reason?: string } | null>(null);

  // States required for recommendations request
  const [faceShape, setFaceShape] = useState("Oval");
  const [asymmetryIndex, setAsymmetryIndex] = useState(7.11);
  const [postureAngle, setPostureAngle] = useState(18.0);
  const [tiltAngle, setTiltAngle] = useState(0.0);
  const [jawHeightRatio, setJawHeightRatio] = useState(0.611);
  const [skinCondition, setSkinCondition] = useState<string>("combination");
  const [groomingStyle, setGroomingStyle] = useState<string>("stubble");
  const [hairTexture, setHairTexture] = useState<string>("straight");
  const [age, setAge] = useState<number>(21);

  // Core routine and checklists
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [routineChecks, setRoutineChecks] = useState<string[]>([]);
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[]>([]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"kinesiology" | "biochemistry" | "grooming" | "lifestyle">("kinesiology");

  // Verify auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      if (!activeSession) {
        router.push("/gateway");
      } else {
        setSession(activeSession);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      if (!activeSession) {
        router.push("/gateway");
      } else {
        setSession(activeSession);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Rehydrate state from Dexie & localStorage
  useEffect(() => {
    if (!session) return;

    const initDatabase = async () => {
      try {
        const savedProfile = await db.profiles.get("current_profile");
        const historyData = await db.history.orderBy("timestamp").toArray();
        setHistoricalRecords(historyData);

        const savedMetricsRecord = await db.metricsRecords.get("latest");

        // Load checks from localStorage first (takes priority as specified)
        let loadedChecks: string[] = [];
        const savedChecks = localStorage.getItem("auramax_routine_checks");
        if (savedChecks) {
          try {
            const parsed = JSON.parse(savedChecks);
            if (Array.isArray(parsed)) {
              loadedChecks = parsed;
            }
          } catch (e) {
            console.warn("Failed to parse routine checks from localStorage", e);
          }
        }

        if (savedMetricsRecord && savedMetricsRecord.routine) {
          if (savedProfile) {
            setTiltAngle(savedProfile.tiltAngle ?? 0.0);
            setJawHeightRatio(savedProfile.jawHeightRatio ?? 0.611);
          }
          setFaceShape(savedMetricsRecord.faceShape || "Oval");
          setAsymmetryIndex(savedProfile?.asymmetryIndex ?? 7.11);
          setPostureAngle(savedMetricsRecord.forwardHeadAngle || 18.0);
          setSkinCondition(savedMetricsRecord.skinCondition || "combination");
          setGroomingStyle(savedMetricsRecord.groomingStyle || "stubble");
          setHairTexture(savedMetricsRecord.hairTexture || "straight");
          setAge(savedMetricsRecord.age || 21);
          setRoutine(savedMetricsRecord.routine);
          setRoutineChecks(loadedChecks.length > 0 ? loadedChecks : (savedMetricsRecord.routineChecks || []));
        } else if (savedProfile) {
          setFaceShape(savedProfile.faceShape || "Oval");
          setAsymmetryIndex(savedProfile.asymmetryIndex ?? 7.11);
          setPostureAngle(savedProfile.postureAngle ?? 18.0);
          setTiltAngle(savedProfile.tiltAngle ?? 0.0);
          setJawHeightRatio(savedProfile.jawHeightRatio ?? 0.611);
          setSkinCondition(savedProfile.skinCondition || "combination");
          setGroomingStyle(savedProfile.groomingStyle || "stubble");
          setHairTexture("straight");
          setAge(21);
          setRoutine(savedProfile.routine || null);
          setRoutineChecks(loadedChecks.length > 0 ? loadedChecks : (savedProfile.routineChecks || []));
        } else {
          // Fallback if absolutely empty
          setRoutineChecks(loadedChecks);
        }
      } catch (err) {
        console.error("Dexie database synchronization failure on blueprint page:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initDatabase();
  }, [session]);

  // Sync checklist state directly to browser 'localStorage'
  useEffect(() => {
    if (isInitializing) return;
    localStorage.setItem("auramax_routine_checks", JSON.stringify(routineChecks));
  }, [routineChecks, isInitializing]);

  // Sync routine and checklist state changes to IndexedDB
  useEffect(() => {
    if (isInitializing || !session) return;

    const syncToIndexedDB = async () => {
      try {
        const rawSymmetry = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - asymmetryIndex * 0.45)).toFixed(1));
        const rawJawline = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - Math.abs(jawHeightRatio - 0.65) * 12)).toFixed(1));
        const rawPosture = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - tiltAngle * 0.4)).toFixed(1));
        
        let rawSkin = 8.8;
        if (skinCondition === "congested") rawSkin = 6.2;
        else if (skinCondition === "oily") rawSkin = 7.2;
        else if (skinCondition === "dry") rawSkin = 7.8;
        else if (skinCondition === "combination") rawSkin = 8.0;

        let rawGrooming = 8.5;
        if (groomingStyle === "stubble") rawGrooming = 8.2;
        else if (groomingStyle === "clean-shaven") rawGrooming = 8.8;
        else if (groomingStyle === "beard") rawGrooming = 8.0;

        const calculatedSubscores = {
          jawline: rawJawline,
          skin: rawSkin,
          grooming: rawGrooming,
          symmetry: rawSymmetry,
          posture: rawPosture,
        };
        const currentScore = parseFloat(((calculatedSubscores.jawline + calculatedSubscores.skin + calculatedSubscores.grooming + calculatedSubscores.symmetry + calculatedSubscores.posture) / 5).toFixed(1));
        const potentialScore = 9.5;

        const existingProfile = await db.profiles.get("current_profile");

        await db.profiles.put({
          id: "current_profile",
          frontImage: existingProfile?.frontImage ?? null,
          sideImage: existingProfile?.sideImage ?? null,
          closeupImage: existingProfile?.closeupImage ?? null,
          faceShape,
          asymmetryIndex,
          postureAngle,
          tiltAngle,
          jawHeightRatio,
          skinCondition,
          groomingStyle,
          subscores: calculatedSubscores,
          currentScore,
          potentialScore,
          routine,
          routineChecks,
          lastUpdated: Date.now(),
        });

        const latestRecord = await db.metricsRecords.get("latest");
        if (latestRecord) {
          await db.metricsRecords.update("latest", {
            routineChecks,
            routine
          });
        }
      } catch (err) {
        console.error("Database auto-update sync error in blueprint page:", err);
      }
    };

    const timeout = setTimeout(syncToIndexedDB, 600);
    return () => clearTimeout(timeout);
  }, [routine, routineChecks, isInitializing, session, faceShape, asymmetryIndex, postureAngle, skinCondition, groomingStyle, jawHeightRatio, tiltAngle]);

  // Calculate dynamic subscores
  const subscores = {
    jawline: parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - Math.abs(jawHeightRatio - 0.65) * 12)).toFixed(1)),
    skin: skinCondition === "congested" ? 6.2 : skinCondition === "oily" ? 7.2 : skinCondition === "dry" ? 7.8 : skinCondition === "combination" ? 8.0 : 8.8,
    grooming: groomingStyle === "clean-shaven" ? 8.8 : groomingStyle === "stubble" ? 8.2 : 8.0,
    symmetry: parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - asymmetryIndex * 0.45)).toFixed(1)),
    posture: parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - tiltAngle * 0.4)).toFixed(1)),
  };

  const generateRoutine = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      // Single source of truth: read the persisted Dexie profile and build the request
      // payload via the one shared function (lib/payload.ts) used by every call site —
      // this file previously had its own independent copy of this logic (reading
      // localStorage, with its own hardcoded fallback defaults) that could silently
      // diverge from what MeshScanner/scanner page actually measured.
      const profile = await db.profiles.get("current_profile");
      if (!profile) {
        throw new Error("No scan profile found yet. Run a scan before generating a routine.");
      }
      const payload = buildRecommendationPayload(profile, (historicalRecords as any) || []);

      const data = await fetchAuraRecommendations(payload);
      setLastSource({ ok: data.ok, source: data.source, reason: data.reason });

      if (!data || !data.routine) {
        throw new Error("Invalid routine response received from AuraMax biometric engine.");
      }

      // 3. DATA PERSISTENCE BINDING: Save recommendations and raw parameters inside IndexedDB via Dexie
      await db.metricsRecords.put({
        id: "latest",
        timestamp: Date.now(),
        faceShape,
        symmetryScore: Math.round(subscores.symmetry * 10),
        forwardHeadAngle: postureAngle,
        hairTexture,
        age,
        skinCondition,
        groomingStyle,
        subscores: {
          jawline: Number(subscores.jawline),
          skin: Number(subscores.skin),
          grooming: Number(subscores.grooming),
          symmetry: Number(subscores.symmetry),
        },
        routine: data.routine,
        routineChecks: [], // Reset checklist values for a brand new routine
      });

      // Save routine checks to localStorage immediately on generation
      localStorage.setItem("auramax_routine_checks", JSON.stringify([]));

      // Save routine to Supabase if user is logged in
      if (session?.user?.id) {
        try {
          await supabase.from("user_routines").insert([{
            user_id: session.user.id,
            routine: data.routine,
            subscores: {
              jawline: Number(subscores.jawline),
              skin: Number(subscores.skin),
              grooming: Number(subscores.grooming),
              symmetry: Number(subscores.symmetry),
              posture: Number(subscores.posture),
            },
            created_at: new Date().toISOString()
          }]);
        } catch (supabaseErr) {
          console.warn("Supabase insert exception:", supabaseErr);
        }
      }

      // Update local page state instantly
      setRoutineChecks([]);
      setRoutine(data.routine);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected issue occurred during biochemical mapping.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCheck = (itemId: string) => {
    setRoutineChecks((prev) => {
      const exists = prev.includes(itemId);
      if (exists) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-[#0d0e12] text-zinc-400 flex flex-col items-center justify-center p-6">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border border-teal-500/10" />
          <div className="absolute inset-0 rounded-full border border-teal-500 border-t-transparent animate-spin" />
        </div>
        <p className="font-mono text-xs text-zinc-500 tracking-wider uppercase">HYDRATING_BLUEPRINT_MATRIX...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0e12] text-zinc-300 antialiased font-sans pb-16 px-4 sm:px-6 lg:px-8 pt-8 relative overflow-hidden select-none">
      
      {/* Premium backdrops */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/[0.03] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-blue-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">

        {/* HEADER */}
        <header className="pb-4 border-b border-white/[0.05] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <h1 className="font-display font-black text-xl tracking-tight text-white uppercase">
                AuraMax Routine Implementation Engine
              </h1>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1 uppercase">
              BIOMETRIC-DRIVEN PRECISE BLUEPRINT
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="generate-blueprint-btn"
              onClick={generateRoutine}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-black disabled:opacity-40 disabled:cursor-not-allowed font-mono text-xs font-bold px-4.5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(20,185,129,0.15)] cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  SYNTHESIZING_BIOMETRICS...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {routine ? "RE-SYNTHESIZE ROUTINE" : "GENERATE BIO-ROUTINE"}
                </>
              )}
            </button>
          </div>
        </header>

        {/* QUICK METRIC OVERVIEW CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#12141c]/40 border border-white/[0.04] rounded-2xl p-3.5 font-mono">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider block mb-1">Face Profile</span>
            <div className="text-sm font-bold text-white uppercase truncate">{faceShape}</div>
            <div className="text-[9px] text-teal-400/80 mt-1">{hairTexture} base</div>
          </div>
          <div className="bg-[#12141c]/40 border border-white/[0.04] rounded-2xl p-3.5 font-mono">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider block mb-1">Face Asymmetry</span>
            <div className="text-sm font-bold text-white">{asymmetryIndex.toFixed(2)}%</div>
            <div className="text-[9px] text-zinc-500 mt-1">Rating: {subscores.symmetry.toFixed(1)}/10</div>
          </div>
          <div className="bg-[#12141c]/40 border border-white/[0.04] rounded-2xl p-3.5 font-mono">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider block mb-1">Cervical Angle</span>
            <div className="text-sm font-bold text-white">{postureAngle.toFixed(1)}°</div>
            <div className="text-[9px] text-zinc-500 mt-1">Strain: {subscores.posture.toFixed(1)}/10</div>
          </div>
          <div className="bg-[#12141c]/40 border border-white/[0.04] rounded-2xl p-3.5 font-mono">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider block mb-1">Epidermal Sebum</span>
            <div className="text-sm font-bold text-white uppercase truncate">{skinCondition}</div>
            <div className="text-[9px] text-teal-400/80 mt-1">Rating: {subscores.skin.toFixed(1)}/10</div>
          </div>
          <div className="bg-[#12141c]/40 border border-white/[0.04] rounded-2xl p-3.5 font-mono col-span-2 md:col-span-1">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider block mb-1">Grooming Framework</span>
            <div className="text-sm font-bold text-white uppercase truncate">{groomingStyle}</div>
            <div className="text-[9px] text-zinc-500 mt-1">Rating: {subscores.grooming.toFixed(1)}/10</div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* MAIN BLUEPRINT EXECUTION INTERFACE */}
        {!routine && !isGenerating && (
          <div className="py-20 border border-dashed border-white/[0.05] rounded-3xl text-center flex flex-col items-center justify-center bg-white/[0.01] px-6">
            <Sparkles className="w-10 h-10 text-zinc-700 mb-3 stroke-[1.25]" />
            <p className="font-mono text-xs text-zinc-400 mb-1.5 uppercase tracking-widest">Awaiting Biometric Activation</p>
            <p className="text-xs text-zinc-500 max-w-md leading-relaxed font-sans mb-6">
              Press the &quot;Generate Bio-Routine&quot; button above. AuraMax will compile your scanned metrics and generate a high-fidelity self-optimization prescription.
            </p>
            <button
              onClick={generateRoutine}
              className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:border-teal-500/50 font-mono text-xs font-semibold py-2 px-5 rounded-xl transition-all cursor-pointer"
            >
              Initialize Synthesis Loop
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="space-y-6">
            <div className="p-6 bg-teal-950/20 border border-teal-500/10 rounded-2xl text-center">
              <p className="font-mono text-xs text-teal-400 animate-pulse uppercase tracking-wider">Compiling Craniofacial & Posture Optimization Matrices...</p>
              <p className="text-[10px] text-zinc-500 mt-2 max-w-xs mx-auto leading-relaxed">
                Applying algorithms to balance {asymmetryIndex}% skeletal deviation, map {skinCondition} biochemistry, and correct the {postureAngle}° cervical angle.
              </p>
            </div>

            {/* HIGH-END SKELETON LOADER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#12141c]/20 border border-white/[0.03] p-6 rounded-3xl space-y-4 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-1/3" />
                <div className="h-2.5 bg-zinc-900 rounded w-full" />
                <div className="h-2.5 bg-zinc-900 rounded w-5/6" />
                <div className="h-10 bg-zinc-900 rounded-xl" />
                <div className="h-10 bg-zinc-900 rounded-xl" />
              </div>
              <div className="bg-[#12141c]/20 border border-white/[0.03] p-6 rounded-3xl space-y-4 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-1/3" />
                <div className="h-2.5 bg-zinc-900 rounded w-full" />
                <div className="h-2.5 bg-zinc-900 rounded w-5/6" />
                <div className="h-10 bg-zinc-900 rounded-xl" />
                <div className="h-10 bg-zinc-900 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {!isGenerating && routine && (
          <div className="flex flex-col gap-6">
            {lastSource && !lastSource.ok && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[11px] rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Showing a rule-based routine, not AI-generated ({lastSource.source}
                  {lastSource.reason ? `: ${lastSource.reason}` : ""}). Try regenerating in a moment.
                </span>
              </div>
            )}

            {/* TAB CONTROLS - HIGH CONTRAST TABBED INTERFACE */}
            <div className="flex overflow-x-auto pb-1 gap-2 border-b border-white/[0.04] scrollbar-none select-none">
              <button
                id="kinesiology-tab-btn"
                onClick={() => setActiveTab("kinesiology")}
                className={`flex items-center gap-2 px-5 py-3 font-mono text-[10px] sm:text-xs uppercase tracking-wider border rounded-t-2xl transition-all shrink-0 cursor-pointer ${
                  activeTab === "kinesiology"
                    ? "bg-[#12141c] border-white/[0.06] border-b-transparent text-teal-400 font-bold"
                    : "bg-[#0c0d12] border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                I. KINESIOLOGY
              </button>

              <button
                id="biochemistry-tab-btn"
                onClick={() => setActiveTab("biochemistry")}
                className={`flex items-center gap-2 px-5 py-3 font-mono text-[10px] sm:text-xs uppercase tracking-wider border rounded-t-2xl transition-all shrink-0 cursor-pointer ${
                  activeTab === "biochemistry"
                    ? "bg-[#12141c] border-white/[0.06] border-b-transparent text-teal-400 font-bold"
                    : "bg-[#0c0d12] border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                II. DERM BIOCHEMISTRY
              </button>

              <button
                id="grooming-tab-btn"
                onClick={() => setActiveTab("grooming")}
                className={`flex items-center gap-2 px-5 py-3 font-mono text-[10px] sm:text-xs uppercase tracking-wider border rounded-t-2xl transition-all shrink-0 cursor-pointer ${
                  activeTab === "grooming"
                    ? "bg-[#12141c] border-white/[0.06] border-b-transparent text-teal-400 font-bold"
                    : "bg-[#0c0d12] border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                III. GEOMETRIC GROOMING
              </button>

              <button
                id="lifestyle-tab-btn"
                onClick={() => setActiveTab("lifestyle")}
                className={`flex items-center gap-2 px-5 py-3 font-mono text-[10px] sm:text-xs uppercase tracking-wider border rounded-t-2xl transition-all shrink-0 cursor-pointer ${
                  activeTab === "lifestyle"
                    ? "bg-[#12141c] border-white/[0.06] border-b-transparent text-teal-400 font-bold"
                    : "bg-[#0c0d12] border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                IV. LIFESTYLE DIRECTIVES
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="bg-[#12141c]/30 border border-white/[0.05] rounded-3xl p-6 shadow-xl min-h-[400px]">
              
              <AnimatePresence mode="wait">
                
                {/* TAB 1: KINESIOLOGY */}
                {activeTab === "kinesiology" && (
                  <motion.div
                    key="kinesiology-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white uppercase flex items-center gap-2 mb-1">
                        Skeletal Realignment & Cervicothoracic Kinesiology
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Step-by-step kinetic rehabilitation routines mapped to reverse your cervical angle deviation and shoulder girdle asymmetries.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {routine.structuralKinesiology?.map((ex, idx) => {
                        const id = `kine-${idx}`;
                        const checked = routineChecks.includes(id);
                        return (
                          <div
                            id={`exercise-card-${idx}`}
                            key={id}
                            onClick={() => toggleCheck(id)}
                            className={`group relative p-5 rounded-2xl border cursor-pointer transition-all select-none ${
                              checked
                                ? "bg-teal-500/[0.02] border-teal-500/35"
                                : "bg-[#0c0d12]/60 border-white/[0.04] hover:bg-white/[0.01] hover:border-white/[0.08]"
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="mt-0.5 shrink-0">
                                {checked ? (
                                  <div className="w-5 h-5 rounded-md bg-teal-500/10 border border-teal-500 text-teal-400 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-md border border-zinc-600 group-hover:border-zinc-400" />
                                )}
                              </div>

                              <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className={`font-mono text-sm font-semibold transition-colors ${checked ? "text-zinc-500 line-through" : "text-white"}`}>
                                    {ex.title}
                                  </h4>
                                  <span className="text-[8px] font-mono bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded text-zinc-400 shrink-0 uppercase">
                                    KINE_SEQ_{idx}
                                  </span>
                                </div>

                                <p className={`text-xs leading-relaxed font-sans ${checked ? "text-zinc-600" : "text-zinc-400"}`}>
                                  {ex.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-2 pt-2">
                                  <div className="flex items-center gap-1 font-mono text-[9px] bg-[#07080c] border border-white/[0.04] rounded-lg px-2.5 py-1 text-zinc-300">
                                    <span className="text-zinc-500 uppercase">Frequency:</span>
                                    <span className="text-teal-400 font-bold">{ex.frequency}</span>
                                  </div>
                                  <div className="flex items-center gap-1 font-mono text-[9px] bg-[#07080c] border border-white/[0.04] rounded-lg px-2.5 py-1 text-zinc-300">
                                    <span className="text-zinc-500 uppercase">Volume:</span>
                                    <span className="text-teal-400 font-bold">{ex.volume}</span>
                                  </div>
                                  <div className="flex items-center gap-1 font-mono text-[9px] bg-[#07080c] border border-white/[0.04] rounded-lg px-2.5 py-1 text-zinc-300">
                                    <span className="text-zinc-500 uppercase">Objective:</span>
                                    <span className="text-zinc-400">{ex.targetMetrics}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: DERM BIOCHEMISTRY */}
                {activeTab === "biochemistry" && (
                  <motion.div
                    key="biochemistry-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white uppercase flex items-center gap-2 mb-1">
                        Dermatological Biochemistry Prescription
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Personalized cosmetic active substances matched with lipid synthesis cycles, complete with scientific-grade justifications.
                      </p>
                    </div>

                    {/* Clinical Log Sheet Layout */}
                    <div className="border border-white/[0.05] rounded-2xl bg-[#0c0d12]/50 overflow-hidden font-mono text-xs">
                      
                      {/* Clinical Sheet Header */}
                      <div className="bg-white/[0.02] px-5 py-3 border-b border-white/[0.05] flex justify-between items-center text-[10px] text-zinc-400">
                        <span>PRESCRIBED_ACTIVE_AGENTS</span>
                        <span>CLINIC_LOG_REF_AURA</span>
                      </div>

                      <div className="divide-y divide-white/[0.04]">
                        {routine.dermBiochemistry?.map((act, idx) => {
                          const id = `bio-${idx}`;
                          const checked = routineChecks.includes(id);
                          return (
                            <div 
                              id={`ingredient-card-${idx}`}
                              key={id} 
                              onClick={() => toggleCheck(id)}
                              className={`p-5 transition-all cursor-pointer select-none ${
                                checked 
                                  ? "bg-teal-500/[0.01]" 
                                  : "hover:bg-white/[0.01]"
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="mt-0.5 shrink-0">
                                  {checked ? (
                                    <div className="w-4.5 h-4.5 rounded bg-teal-500/10 border border-teal-500 text-teal-400 flex items-center justify-center">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-4.5 h-4.5 rounded border border-zinc-600" />
                                  )}
                                </div>

                                <div className="flex-1 space-y-3">
                                  {/* Ingredient Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <h4 className={`text-sm font-bold tracking-tight ${checked ? "text-zinc-500 line-through" : "text-white"}`}>
                                      {act.title}
                                    </h4>
                                    <span className="text-[8px] bg-teal-500/10 text-teal-400 border border-teal-500/15 rounded-lg px-2 py-0.5 w-max">
                                      {act.applicationInstructions}
                                    </span>
                                  </div>

                                  {/* Clinical Purpose */}
                                  <p className={`text-xs font-sans ${checked ? "text-zinc-500" : "text-zinc-300"}`}>
                                    <span className="font-mono text-[10px] text-zinc-500 uppercase block mb-0.5">Clinical Purpose</span>
                                    {act.purpose}
                                  </p>

                                  {/* Aesthetic Justification Readout Block */}
                                  <div className="bg-[#07080c] border-l-2 border-teal-500 rounded-r-xl p-3.5 text-zinc-400">
                                    <span className="text-[9px] font-mono text-teal-400 font-bold block mb-1 tracking-wider uppercase">
                                      [Aesthetic Justification Readout]
                                    </span>
                                    <p className="text-[11px] leading-relaxed font-sans">
                                      {act.scientificNotes}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: GEOMETRIC GROOMING */}
                {activeTab === "grooming" && (
                  <motion.div
                    key="grooming-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white uppercase flex items-center gap-2 mb-1">
                        Geometric Grooming & Skull Topology Map
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Visual layout directives indicating haircut taper lines, facial hair balance zones, and eyebrow mapping guidelines calculated for {faceShape} profiles.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Haircut Suggestions */}
                      <div id="haircut-layout-card" className="bg-[#0c0d12]/60 border border-white/[0.04] rounded-2xl p-5 space-y-3 font-mono">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04] text-teal-400">
                          <Scissors className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Haircut Selection</span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-normal">
                          {routine.geometricGrooming?.haircutSuggestion || "Textured Crop Fade"}
                        </h4>
                        <p className="text-[11px] leading-relaxed text-zinc-400 font-sans">
                          Designed to counteract vertical proportion imbalances and complement the lateral width indices.
                        </p>
                      </div>

                      {/* Facial Hair Geometry */}
                      <div id="beard-layout-card" className="bg-[#0c0d12]/60 border border-white/[0.04] rounded-2xl p-5 space-y-3 font-mono">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04] text-teal-400">
                          <Activity className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Facial Hair Border</span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-normal">
                          {routine.geometricGrooming?.facialHairGeometry || "Defined Jawline Stubble"}
                        </h4>
                        <p className="text-[11px] leading-relaxed text-zinc-400 font-sans">
                          Exact shave and lineup boundaries designed to optimize bigonial width profiles.
                        </p>
                      </div>

                      {/* Eyebrow Shaping Maps */}
                      <div id="eyebrow-layout-card" className="bg-[#0c0d12]/60 border border-white/[0.04] rounded-2xl p-5 space-y-3 font-mono">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04] text-teal-400">
                          <Compass className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Eyebrow Shaping Path</span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-normal">
                          {routine.geometricGrooming?.eyebrowSymmetryMap || "Neutral Lateral Arch Map"}
                        </h4>
                        <p className="text-[11px] leading-relaxed text-zinc-400 font-sans">
                          Structured eyebrow paths designed to enhance canthal tilt levels and balance eye asymmetry.
                        </p>
                      </div>

                    </div>

                    {/* Holistic Aesthetic Justification block */}
                    <div id="aesthetic-justification-summary-card" className="bg-[#07080c] border border-teal-500/10 rounded-2xl p-5 font-sans">
                      <span className="text-[9px] font-mono text-teal-400 font-bold block mb-1.5 uppercase tracking-wider">
                        [Geometric Aesthetic Justification Matrix]
                      </span>
                      <p className="text-xs leading-relaxed text-zinc-300">
                        {routine.geometricGrooming?.aestheticJustification}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* TAB 4: LIFESTYLE DIRECTIVES */}
                {activeTab === "lifestyle" && (
                  <motion.div
                    key="lifestyle-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white uppercase flex items-center gap-2 mb-1">
                        Lifestyle Habits & Environmental Controllers
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Actionable environmental controllers that directly prevent structural degradation and accelerate muscle alignment goals.
                      </p>
                    </div>

                    {/* Interactive layout group */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {routine.lifestyleDirectives?.map((directive, idx) => {
                        const id = `life-${idx}`;
                        const checked = routineChecks.includes(id);
                        return (
                          <div
                            id={`lifestyle-card-${idx}`}
                            key={id}
                            onClick={() => toggleCheck(id)}
                            className={`p-5 rounded-2xl border cursor-pointer transition-all select-none flex items-start gap-4 ${
                              checked
                                ? "bg-teal-500/[0.02] border-teal-500/35"
                                : "bg-[#0c0d12]/60 border-white/[0.04] hover:bg-white/[0.01]"
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {checked ? (
                                <div className="w-4.5 h-4.5 rounded bg-teal-500/10 border border-teal-500 text-teal-400 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-4.5 h-4.5 rounded border border-zinc-600" />
                              )}
                            </div>

                            <div className="space-y-1.5 flex-1">
                              <span className="font-mono text-[8px] text-teal-400 block tracking-widest font-bold uppercase">
                                HABIT_VEC_{idx + 1}
                              </span>
                              <p className={`text-xs leading-relaxed font-sans ${checked ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                                {directive}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
