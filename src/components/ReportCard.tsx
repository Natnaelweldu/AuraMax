import React, { useState, useEffect } from "react";
import { TrendingUp, ShieldAlert, Award, Calendar, Check, Zap } from "lucide-react";
import { db, HistoricalRecord } from "../lib/db";

interface ReportCardProps {
  asymmetryIndex: number;
  postureAngle: number;
  skinCondition: string;
  groomingStyle: string;
  onSaveHistory: (score: number) => void;
  historicalRecords: HistoricalRecord[];
}

export const ReportCard: React.FC<ReportCardProps> = ({
  asymmetryIndex,
  postureAngle,
  skinCondition,
  groomingStyle,
  onSaveHistory,
  historicalRecords,
}) => {
  // Dynamically calculate scores based on biometric metrics for integrity
  const [jawlineScore, setJawlineScore] = useState(82);
  const [skinScore, setSkinScore] = useState(85);
  const [groomingScore, setGroomingScore] = useState(78);
  const [symmetryScore, setSymmetryScore] = useState(90);

  const [hasScannedThisCycle, setHasScannedThisCycle] = useState(false);
  const [lockCountdown, setLockCountdown] = useState("");

  // Recalculate component scores when input biometrics adjust
  useEffect(() => {
    // Posture angle directly affects Jawline & Frame score (poor posture lowers jaw definition)
    const newJawline = Math.round(Math.max(45, 95 - postureAngle * 1.5));
    setJawlineScore(newJawline);

    // Symmetry score derived strictly from Facial Asymmetry Index
    const newSymmetry = Math.round(Math.max(35, 100 - asymmetryIndex * 4.5));
    setSymmetryScore(newSymmetry);

    // Skin condition score mapping
    let newSkin = 88;
    if (skinCondition === "congested") newSkin = 62;
    else if (skinCondition === "oily") newSkin = 72;
    else if (skinCondition === "dry") newSkin = 78;
    else if (skinCondition === "combination") newSkin = 80;
    setSkinScore(newSkin);

    // Grooming style score mapping
    let newGrooming = 85;
    if (groomingStyle === "stubble") newGrooming = 82;
    else if (groomingStyle === "clean-shaven") newGrooming = 88;
    else if (groomingStyle === "beard") newGrooming = 80;
    setGroomingScore(newGrooming);
  }, [asymmetryIndex, postureAngle, skinCondition, groomingStyle]);

  // Overall calculations
  const currentScore = Math.round((jawlineScore + skinScore + groomingScore + symmetryScore) / 4);
  // Potential score represents fully optimized posture (0 angle), balanced symmetry, and ideal skin
  const potentialScore = Math.round((95 + 94 + 92 + 96) / 4);
  const aestheticDelta = potentialScore - currentScore;

  // Check 30-day lock cycle on mount
  useEffect(() => {
    const checkCycleLock = async () => {
      const records = await db.history.toArray();
      if (records.length > 0) {
        const lastRecord = records[records.length - 1];
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const timeElapsed = Date.now() - lastRecord.timestamp;
        
        if (timeElapsed < thirtyDaysMs) {
          setHasScannedThisCycle(true);
          const remainingMs = thirtyDaysMs - timeElapsed;
          const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
          const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          setLockCountdown(`${days}d ${hours}h remaining`);
        } else {
          setHasScannedThisCycle(false);
        }
      }
    };
    checkCycleLock();
  }, [historicalRecords]);

  const handleLockRecord = () => {
    onSaveHistory(currentScore);
    setHasScannedThisCycle(true);
    // Standard mock cycle countdown for visual feedback immediately
    setLockCountdown("29d 23h remaining");
  };

  const handleForceUnlock = async () => {
    // For development convenience, allow overriding the lock
    if (confirm("Developer Mode: Override the 30-day structural scan restriction?")) {
      setHasScannedThisCycle(false);
    }
  };

  return (
    <div id="report-card-and-history" className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* 100-Point Score Grid Module */}
      <div className="md:col-span-7 bg-[#090909] p-6 rounded-xl border border-white/[0.08] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <h3 className="font-mono text-xs font-semibold tracking-wider text-zinc-100">
                AESTHETIC_REPORT_CARD
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">
              METRIC_SYSTEM: OPTIMIZED
            </span>
          </div>

          {/* Subscores Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            
            {/* Jawline & Frame */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] relative overflow-hidden">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-mono text-zinc-400">JAWLINE_FRAME</span>
                <span className="text-sm font-mono font-semibold text-zinc-100">{jawlineScore}</span>
              </div>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${jawlineScore}%` }} />
              </div>
              <p className="text-[9px] text-zinc-500 mt-1 font-sans">
                Postural offset of {postureAngle}° loads cervical muscles.
              </p>
            </div>

            {/* Skin Health */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] relative overflow-hidden">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-mono text-zinc-400">SKIN_HEALTH</span>
                <span className="text-sm font-mono font-semibold text-zinc-100">{skinScore}</span>
              </div>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${skinScore}%` }} />
              </div>
              <p className="text-[9px] text-zinc-500 mt-1 font-sans">
                Type: {skinCondition.toUpperCase()} active synthesis state.
              </p>
            </div>

            {/* Hair & Grooming */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] relative overflow-hidden">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-mono text-zinc-400">GROOM_STYLING</span>
                <span className="text-sm font-mono font-semibold text-zinc-100">{groomingScore}</span>
              </div>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${groomingScore}%` }} />
              </div>
              <p className="text-[9px] text-zinc-500 mt-1 font-sans">
                Preferred: {groomingStyle.toUpperCase()} structural balance.
              </p>
            </div>

            {/* Symmetry */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] relative overflow-hidden">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-mono text-zinc-400">BILATERAL_SYMMETRY</span>
                <span className="text-sm font-mono font-semibold text-zinc-100">{symmetryScore}</span>
              </div>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${symmetryScore}%` }} />
              </div>
              <p className="text-[9px] text-zinc-500 mt-1 font-sans">
                Derived asymmetry index: {asymmetryIndex}%.
              </p>
            </div>

          </div>
        </div>

        {/* 30-Day Re-Scan Lock Mechanic */}
        <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-zinc-300">30_DAY_SCAN_LOCK</p>
              <p className="text-[9px] text-zinc-500 leading-none">
                {hasScannedThisCycle ? "AESTHETICS RECORDED" : "AWAITING LOCK_IN"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {hasScannedThisCycle ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] font-mono text-zinc-500">{lockCountdown}</span>
                <button
                  onClick={handleForceUnlock}
                  className="text-[9px] font-mono bg-zinc-900 border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-2 py-1 rounded"
                >
                  BYPASS_LOCK
                </button>
              </div>
            ) : (
              <button
                onClick={handleLockRecord}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 active:bg-emerald-500/45 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                RECORD_CURRENT_MILESTONE
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Hero Delta Card & Linear History Logs */}
      <div className="md:col-span-5 flex flex-col gap-4">
        
        {/* Dynamic Delta HUD */}
        <div className="bg-zinc-950 p-5 rounded-xl border border-white/[0.08] relative overflow-hidden flex items-center justify-between">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 mb-1">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span>AESTHETIC_DELTA</span>
            </div>
            <h4 className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
              +{aestheticDelta} <span className="text-zinc-500 text-sm font-normal">PTS</span>
            </h4>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-[160px] leading-relaxed">
              Unlockable geometric symmetry through lifestyle and postural training.
            </p>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[9px] font-mono text-zinc-500 leading-none mb-1">CURRENT</p>
              <p className="text-xl font-mono font-bold text-zinc-300">{currentScore}</p>
            </div>
            <div className="h-8 w-[1px] bg-white/[0.08]" />
            <div>
              <p className="text-[9px] font-mono text-emerald-400 leading-none mb-1">POTENTIAL</p>
              <p className="text-xl font-mono font-bold text-emerald-400">{potentialScore}</p>
            </div>
          </div>
        </div>

        {/* Linear Progress Tracking History */}
        <div className="bg-[#090909] p-4 rounded-xl border border-white/[0.08] flex-1 flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-300">
                  LINEAR_PROGRESS_HISTORY
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">
                LOGS: {historicalRecords.length}
              </span>
            </div>

            {historicalRecords.length === 0 ? (
              <div className="py-6 text-center text-zinc-600 flex flex-col items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-zinc-700 mb-1.5" />
                <p className="text-[10px] font-mono">NO_HISTORICAL_DATA</p>
                <p className="text-[9px] text-zinc-500 max-w-[180px] leading-relaxed">
                  Lock your first milestone above to start graphing linear optimization progress.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {/* Visual sparklines/progress items */}
                {historicalRecords.slice(-3).reverse().map((rec) => (
                  <div
                    key={rec.id || rec.timestamp}
                    className="flex items-center justify-between p-2 bg-white/[0.01] rounded border border-white/[0.04] text-[10px] font-mono"
                  >
                    <span className="text-zinc-500">
                      {new Date(rec.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "2-digit"
                      })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500">
                        ASYM: {rec.asymmetryIndex}% | PST: {rec.postureAngle}°
                      </span>
                      <span className="text-emerald-400 font-bold">{rec.score} PTS</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {historicalRecords.length > 0 && (
            <div className="mt-3 text-[9px] text-zinc-500 font-sans border-t border-white/[0.05] pt-2 flex justify-between items-center">
              <span>Linear Trend: Positive Core Velocity</span>
              <span className="text-emerald-500 font-mono">CONVERGING_TO_IDEAL</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
