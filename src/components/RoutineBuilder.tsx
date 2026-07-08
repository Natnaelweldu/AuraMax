import React, { useState } from "react";
import { Sparkles, CheckSquare, Square, RefreshCw, Layers, Shield, HelpCircle, Activity } from "lucide-react";
import { fetchAuraRecommendations } from "../lib/services/apiService";
import { dbEngine } from "../lib/db";

interface Routine {
  kinesiology: Array<{
    exerciseName: string;
    description: string;
    frequency: string;
    repsSets: string;
    targetPostureAngle: string;
  }>;
  topicalActives: Array<{
    ingredient: string;
    purpose: string;
    applicationFrequency: string;
    scientificJustification: string;
  }>;
  groomingStyle: {
    haircutSuggestion: string;
    facialHairSuggestion: string;
    eyebrowShaping: string;
    reasoning: string;
  };
  lifestyleDirectives: string[];
}

interface RoutineBuilderProps {
  faceShape: string;
  asymmetryIndex: number;
  postureAngle: number;
  skinCondition: string;
  groomingStyle: string;
  hairTexture: string;
  age: number;
  subscores: {
    jawline: number;
    skin: number;
    grooming: number;
    symmetry: number;
  };
  routine: Routine | null;
  routineChecks: string[]; // List of completed item IDs, e.g., ["ex-0", "active-1"]
  onRoutineGenerated: (routine: Routine) => void;
  onChecksChanged: (checks: string[]) => void;
}

const SkeletonLoader: React.FC = () => (
  <div className="space-y-6">
    <style>{`
      @keyframes scan {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
      }
      @keyframes shimmer-x {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .animate-scan {
        animation: scan 2.5s linear infinite;
      }
      .animate-shimmer-bg {
        background: linear-gradient(90deg, #09090b 25%, #27272a 50%, #09090b 75%);
        background-size: 200% 100%;
        animation: shimmer-x 1.8s infinite linear;
      }
    `}</style>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      {/* COLUMN 1 KINESIOLOGY SKELETON */}
      <div className="relative bg-[#050505] p-5 rounded-xl border border-white/[0.04] overflow-hidden min-h-[380px] flex flex-col justify-between">
        {/* Laser scanner effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.04] to-transparent h-16 w-full animate-scan pointer-events-none" />
        
        <div className="w-full">
          <div className="flex items-center justify-between mb-5 pb-2 border-b border-white/[0.04]">
            <div className="h-3.5 w-36 bg-zinc-800 rounded animate-shimmer-bg" />
            <div className="h-3 w-12 bg-zinc-900 rounded" />
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3.5 bg-black/40 rounded-lg border border-white/[0.02] flex gap-3">
                <div className="w-4 h-4 bg-zinc-800 rounded animate-shimmer-bg shrink-0 mt-0.5" />
                <div className="space-y-2.5 w-full">
                  <div className="h-3 bg-zinc-800 rounded w-1/2 animate-shimmer-bg" />
                  <div className="space-y-1.5">
                    <div className="h-2 bg-zinc-900 rounded w-11/12 animate-shimmer-bg" />
                    <div className="h-2 bg-zinc-900 rounded w-2/3 animate-shimmer-bg" />
                  </div>
                  <div className="h-3 bg-zinc-950 rounded w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COLUMN 2 DERM BIOCHEMISTRY SKELETON */}
      <div className="relative bg-[#050505] p-5 rounded-xl border border-white/[0.04] overflow-hidden min-h-[380px] flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.04] to-transparent h-16 w-full animate-scan pointer-events-none [animation-delay:0.8s]" />
        
        <div className="w-full">
          <div className="flex items-center justify-between mb-5 pb-2 border-b border-white/[0.04]">
            <div className="h-3.5 w-36 bg-zinc-800 rounded animate-shimmer-bg" />
            <div className="h-3 w-12 bg-zinc-900 rounded" />
          </div>

          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-3.5 bg-black/40 rounded-lg border border-white/[0.02] flex gap-3">
                <div className="w-4 h-4 bg-zinc-800 rounded animate-shimmer-bg shrink-0 mt-0.5" />
                <div className="space-y-2.5 w-full">
                  <div className="h-3 bg-zinc-800 rounded w-3/5 animate-shimmer-bg" />
                  <div className="space-y-1.5">
                    <div className="h-2 bg-zinc-900 rounded w-full animate-shimmer-bg" />
                    <div className="h-2 bg-zinc-900 rounded w-4/5 animate-shimmer-bg" />
                  </div>
                  <div className="h-2.5 bg-zinc-950 rounded w-1/2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COLUMN 3 GEOMETRIC GROOMING SKELETON */}
      <div className="relative bg-[#050505] p-5 rounded-xl border border-white/[0.04] overflow-hidden min-h-[380px] flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.04] to-transparent h-16 w-full animate-scan pointer-events-none [animation-delay:1.6s]" />
        
        <div className="w-full">
          <div className="flex items-center justify-between mb-5 pb-2 border-b border-white/[0.04]">
            <div className="h-3.5 w-36 bg-zinc-800 rounded animate-shimmer-bg" />
            <div className="h-3 w-12 bg-zinc-900 rounded" />
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-black/40 rounded-lg border border-white/[0.02] space-y-1.5">
                <div className="h-2 w-20 bg-zinc-800 rounded animate-shimmer-bg" />
                <div className="h-3.5 w-11/12 bg-zinc-900 rounded animate-shimmer-bg" />
              </div>
            ))}
            <div className="p-3 bg-black/40 rounded-lg border border-white/[0.02] space-y-2">
              <div className="h-2 w-28 bg-zinc-800 rounded" />
              <div className="h-2 w-11/12 bg-zinc-900 rounded" />
            </div>
          </div>
        </div>
      </div>

    </div>

    {/* ROW 4 LIFESTYLE SKELETON */}
    <div className="relative bg-[#050505] p-5 rounded-xl border border-white/[0.04] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent h-16 w-full animate-scan pointer-events-none [animation-delay:2.4s]" />
      
      <div className="h-3.5 w-48 bg-zinc-800 rounded animate-shimmer-bg mb-4 pb-1 border-b border-white/[0.04]" />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-2.5 p-3.5 bg-black/40 rounded-lg border border-white/[0.02]">
            <div className="w-3.5 h-3.5 bg-zinc-800 rounded animate-shimmer-bg shrink-0 mt-0.5" />
            <div className="h-2 bg-zinc-900 rounded w-11/12 animate-shimmer-bg mt-1" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const RoutineBuilder: React.FC<RoutineBuilderProps> = ({
  faceShape,
  asymmetryIndex,
  postureAngle,
  skinCondition,
  groomingStyle,
  hairTexture,
  age,
  subscores,
  routine,
  routineChecks,
  onRoutineGenerated,
  onChecksChanged,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateRoutine = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const calculatedSymmetryScore = Math.round(Math.max(35, 100 - asymmetryIndex * 4.5));
      
      // 1. FRONTEND SERVICE LAYER: POST to /api/recommendations
      const data = await fetchAuraRecommendations({
        faceShape,
        symmetryScore: calculatedSymmetryScore,
        forwardHeadAngle: postureAngle,
        hairTexture,
        age,
        skinCondition,
        groomingStyle,
      });

      // 3. DATA PERSISTENCE BINDING: Save recommendations and raw parameters inside IndexedDB via Dexie
      await dbEngine.metricsRecords.put({
        id: "latest",
        timestamp: Date.now(),
        faceShape,
        symmetryScore: calculatedSymmetryScore,
        forwardHeadAngle: postureAngle,
        hairTexture,
        age,
        skinCondition,
        groomingStyle,
        subscores,
        routine: data.routine,
        routineChecks: [], // Reset checklist values for a brand new routine
      });

      // Update parent component state instantly
      onChecksChanged([]);
      onRoutineGenerated(data.routine);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected issue occurred during biochemical mapping.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCheck = (itemId: string) => {
    if (routineChecks.includes(itemId)) {
      onChecksChanged(routineChecks.filter((id) => id !== itemId));
    } else {
      onChecksChanged([...routineChecks, itemId]);
    }
  };

  return (
    <div id="routine-builder-module" className="bg-[#090909] p-6 rounded-xl border border-white/[0.08]">
      
      {/* Module Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="font-mono text-xs font-semibold tracking-wider text-zinc-100">
              HYPER_TARGETED_ROUTINE_BUILDER
            </h3>
          </div>
          <p className="text-[11px] text-zinc-500 font-sans">
            AI-synthesized cervical kinesiology, topical biochemistry, and face-shape-tailored grooming models.
          </p>
        </div>

        <button
          onClick={generateRoutine}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black disabled:opacity-40 disabled:cursor-not-allowed font-mono text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              SYNTHESIZING_BIOMETRICS...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              GENERATE_STRUCTURAL_ROUTINE
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs rounded">
          {errorMsg}
        </div>
      )}

      {isGenerating && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/10 rounded-lg text-center mb-4">
            <p className="font-mono text-xs text-emerald-400 animate-pulse">OPTIMIZING_BIO_KINESIOLOGY_LAYERS</p>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-xs mx-auto font-sans">
              Mapping neural vectors for {faceShape} structural outline, balancing {asymmetryIndex}% asymmetry points and aligning cervical spinal posture.
            </p>
          </div>
          {/* High-end obsidian and graphite scanning skeleton loaders replacement */}
          <SkeletonLoader />
        </div>
      )}

      {!isGenerating && !routine && (
        <div className="py-12 border border-dashed border-white/[0.05] rounded-lg text-center flex flex-col items-center justify-center bg-white/[0.01]">
          <Sparkles className="w-8 h-8 text-zinc-700 mb-2 stroke-[1.25]" />
          <p className="font-mono text-xs text-zinc-400 mb-1">AWAITING_BIOMETRIC_TRIGGER</p>
          <p className="text-xs text-zinc-500 max-w-md font-sans">
            Press the &quot;Generate Structural Routine&quot; button above. AuraMax will compile your scanned metrics and generate a high-fidelity self-optimization prescription.
          </p>
        </div>
      )}

      {!isGenerating && routine && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: Structural Kinesiology */}
            <div className="bg-white/[0.01] p-4 rounded-xl border border-white/[0.05] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.05]">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-emerald-400">
                    I. STRUCTURAL_KINESIOLOGY
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">EXERCISES: {routine.kinesiology?.length || 0}</span>
                </div>

                <div className="space-y-4">
                  {routine.kinesiology?.map((ex, idx) => {
                    const id = `ex-${idx}`;
                    const checked = routineChecks.includes(id);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleCheck(id)}
                        className={`p-3 rounded-lg border cursor-pointer select-none transition-all ${
                          checked
                            ? "bg-emerald-500/5 border-emerald-500/20 text-zinc-300"
                            : "bg-black/40 border-white/[0.04] hover:bg-white/[0.02] text-zinc-300"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button className="mt-0.5 text-emerald-400 focus:outline-none">
                            {checked ? (
                              <CheckSquare className="w-4 h-4 fill-emerald-500/10" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <h4 className={`text-xs font-mono font-medium ${checked ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                              {ex.exerciseName}
                            </h4>
                            <p className="text-[10px] text-zinc-500 mt-1 font-sans leading-relaxed">
                              {ex.description}
                            </p>
                            <div className="flex gap-2.5 mt-2 text-[9px] font-mono text-zinc-400 bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.03] w-max">
                              <span>FREQ: {ex.frequency}</span>
                              <span>•</span>
                              <span>VOL: {ex.repsSets}</span>
                            </div>
                            <p className="text-[9px] text-emerald-400/70 font-mono mt-1.5 leading-tight">
                              {ex.targetPostureAngle}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMN 2: Topical Actives (Biochemistry) */}
            <div className="bg-white/[0.01] p-4 rounded-xl border border-white/[0.05] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.05]">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-emerald-400">
                    II. DERM_BIOCHEMISTRY
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">ACTIVES: {routine.topicalActives?.length || 0}</span>
                </div>

                <div className="space-y-4">
                  {routine.topicalActives?.map((act, idx) => {
                    const id = `act-${idx}`;
                    const checked = routineChecks.includes(id);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleCheck(id)}
                        className={`p-3 rounded-lg border cursor-pointer select-none transition-all ${
                          checked
                            ? "bg-emerald-500/5 border-emerald-500/20 text-zinc-300"
                            : "bg-black/40 border-white/[0.04] hover:bg-white/[0.02] text-zinc-300"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button className="mt-0.5 text-emerald-400 focus:outline-none">
                            {checked ? (
                              <CheckSquare className="w-4 h-4 fill-emerald-500/10" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <h4 className={`text-xs font-mono font-medium ${checked ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                              {act.ingredient}
                            </h4>
                            <p className="text-[10px] text-zinc-500 mt-1 font-sans leading-relaxed">
                              {act.purpose}
                            </p>
                            <div className="flex gap-2.5 mt-2 text-[9px] font-mono text-zinc-400 bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.03] w-max">
                              <span>APPLICATION: {act.applicationFrequency}</span>
                            </div>
                            <p className="text-[9px] text-zinc-500 font-sans mt-2 italic leading-snug border-l border-zinc-700 pl-2">
                              &quot;{act.scientificJustification}&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMN 3: Geometric Grooming Suggestion */}
            <div className="bg-white/[0.01] p-4 rounded-xl border border-white/[0.05] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.05]">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-emerald-400">
                    III. GEOMETRIC_GROOMING
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">FACE: {faceShape.toUpperCase()}</span>
                </div>

                <div className="space-y-4 text-zinc-300">
                  <div className="p-3.5 bg-black/40 rounded-lg border border-white/[0.04]">
                    <span className="text-[9px] font-mono text-emerald-400 block mb-1">HAIRCUT_SUGGESTION</span>
                    <h5 className="text-xs font-mono text-zinc-200 font-medium mb-1">
                      {routine.groomingStyle?.haircutSuggestion}
                    </h5>
                  </div>

                  <div className="p-3.5 bg-black/40 rounded-lg border border-white/[0.04]">
                    <span className="text-[9px] font-mono text-emerald-400 block mb-1">FACIAL_HAIR_GEOMETRY</span>
                    <h5 className="text-xs font-mono text-zinc-200 font-medium mb-1">
                      {routine.groomingStyle?.facialHairSuggestion}
                    </h5>
                  </div>

                  <div className="p-3.5 bg-black/40 rounded-lg border border-white/[0.04]">
                    <span className="text-[9px] font-mono text-emerald-400 block mb-1">EYEBROW_SYMMETRY_MAP</span>
                    <h5 className="text-xs font-mono text-zinc-200 font-medium mb-1">
                      {routine.groomingStyle?.eyebrowShaping}
                    </h5>
                  </div>

                  <p className="text-[10px] text-zinc-500 leading-relaxed font-sans bg-white/[0.01] p-3 rounded border border-white/[0.02]">
                    <span className="font-mono text-[9px] text-zinc-400 block mb-1">AESTHETIC_JUSTIFICATION</span>
                    {routine.groomingStyle?.reasoning}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* SECTION 4: Lifestyle Directives */}
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-emerald-400 block mb-3 pb-1 border-b border-white/[0.05]">
              IV. DAILY_LIFESTYLE_DIRECTIVES
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {routine.lifestyleDirectives?.map((directive, idx) => {
                const id = `life-${idx}`;
                const checked = routineChecks.includes(id);
                return (
                  <div
                    key={id}
                    onClick={() => toggleCheck(id)}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer select-none transition-all ${
                      checked
                        ? "bg-emerald-500/5 border-emerald-500/10 text-zinc-500"
                        : "bg-black/20 border-white/[0.03] hover:bg-white/[0.01]"
                    }`}
                  >
                    <button className="mt-0.5 text-emerald-400 focus:outline-none">
                      {checked ? (
                        <CheckSquare className="w-3.5 h-3.5 fill-emerald-500/10" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className={`text-[11px] font-sans leading-relaxed ${checked ? "line-through" : "text-zinc-400"}`}>
                      {directive}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
