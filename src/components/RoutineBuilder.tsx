import React, { useState } from "react";
import { Sparkles, CheckSquare, Square, RefreshCw, Layers, Shield, HelpCircle, Activity } from "lucide-react";

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

export const RoutineBuilder: React.FC<RoutineBuilderProps> = ({
  faceShape,
  asymmetryIndex,
  postureAngle,
  skinCondition,
  groomingStyle,
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
      const response = await fetch("/api/gemini/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceShape,
          asymmetryIndex,
          postureAngle,
          skinCondition,
          groomingStyle,
          subscores
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to contact optimization node: ${response.statusText}`);
      }

      const data = await response.json();
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
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/10" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
            <div className="absolute inset-2 rounded-full border border-emerald-500/40 border-b-transparent animate-spin [animation-duration:1s] [animation-direction:reverse]" />
          </div>
          <p className="font-mono text-xs text-zinc-300 animate-pulse">OPTIMIZING_BIO_KINESIOLOGY_LAYERS</p>
          <p className="text-[10px] text-zinc-500 mt-1 max-w-xs font-sans">
            Mapping neural vectors for {faceShape} structural outline, balancing {asymmetryIndex}% asymmetry points and aligning cervical spinal posture.
          </p>
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
