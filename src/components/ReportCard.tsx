import React, { useState, useEffect } from "react";
import { TrendingUp, ShieldAlert, Award, Calendar, Check, Zap } from "lucide-react";
import { db, HistoricalRecord } from "../lib/db";

interface ReportCardProps {
  asymmetryIndex: number;
  postureAngle: number;
  tiltAngle: number;
  jawHeightRatio: number;
  skinCondition: string;
  groomingStyle: string;
  onSaveHistory: (record: HistoricalRecord) => void;
  historicalRecords: HistoricalRecord[];
}

export const ReportCard: React.FC<ReportCardProps> = ({
  asymmetryIndex,
  postureAngle,
  tiltAngle,
  jawHeightRatio,
  skinCondition,
  groomingStyle,
  onSaveHistory,
  historicalRecords,
}) => {
  // Helper to retrieve standard tier status labels based on 1-10 scores
  const getStatusLabel = (score: number) => {
    if (score >= 9.0) return "Elite Structure";
    if (score >= 7.0) return "Highly Optimized";
    if (score >= 5.0) return "Standard Baseline";
    return "Realignment Advised";
  };

  // Dynamically calculate scores based on biometric metrics on 1-10 scale for integrity
  const [jawlineScore, setJawlineScore] = useState(8.2);
  const [skinScore, setSkinScore] = useState(8.5);
  const [groomingScore, setGroomingScore] = useState(7.8);
  const [symmetryScore, setSymmetryScore] = useState(9.0);
  const [postureScore, setPostureScore] = useState(9.5);

  const [hasScannedThisCycle, setHasScannedThisCycle] = useState(false);
  const [lockCountdown, setLockCountdown] = useState("");

  // Recalculate component scores when input biometrics adjust
  useEffect(() => {
    // Jawline & Frame score based on golden ratio mapping of jaw height to width ratio
    const newJawline = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - Math.abs(jawHeightRatio - 0.65) * 12)).toFixed(1));
    setJawlineScore(newJawline);

    // Symmetry score derived strictly from Facial Asymmetry Index
    const newSymmetry = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - asymmetryIndex * 0.45)).toFixed(1));
    setSymmetryScore(newSymmetry);

    // Skin condition score mapping
    let newSkin = 8.8;
    if (skinCondition === "congested") newSkin = 6.2;
    else if (skinCondition === "oily") newSkin = 7.2;
    else if (skinCondition === "dry") newSkin = 7.8;
    else if (skinCondition === "combination") newSkin = 8.0;
    setSkinScore(newSkin);

    // Grooming style score mapping
    let newGrooming = 8.5;
    if (groomingStyle === "stubble") newGrooming = 8.2;
    else if (groomingStyle === "clean-shaven") newGrooming = 8.8;
    else if (groomingStyle === "beard") newGrooming = 8.0;
    setGroomingScore(newGrooming);

    // Forward Posture / Tilt based on nose bridge angular deviation
    const newPosture = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - tiltAngle * 0.4)).toFixed(1));
    setPostureScore(newPosture);
  }, [asymmetryIndex, postureAngle, tiltAngle, jawHeightRatio, skinCondition, groomingStyle]);

  // Overall calculations
  const currentScore = parseFloat(((jawlineScore + skinScore + groomingScore + symmetryScore + postureScore) / 5).toFixed(1));
  const potentialScore = 9.5;
  const aestheticDelta = parseFloat((potentialScore - currentScore).toFixed(1));

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
    const record: HistoricalRecord = {
      timestamp: Date.now(),
      score: currentScore,
      asymmetryIndex,
      postureAngle, // Keep postureAngle raw as lateral posture angle
      subscores: {
        jawline: Math.round(jawlineScore * 10), // Keep 100-point compatibility for internal structure
        skin: Math.round(skinScore * 10),
        grooming: Math.round(groomingScore * 10),
        symmetry: Math.round(symmetryScore * 10),
      }
    };
    onSaveHistory(record);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            
            {/* Jawline & Frame */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] relative overflow-hidden flex flex-col justify-between min-h-[96px]">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block leading-tight">JAWLINE_FRAME</span>
                    <span className="text-[9px] text-emerald-400 font-mono leading-none">{getStatusLabel(jawlineScore)}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-zinc-100">{jawlineScore}/10</span>
                </div>
                <div className="h-1 bg-graphite-900 rounded-full overflow-hidden my-1.5">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${jawlineScore * 10}%` }} />
                </div>
              </div>
              <p className="text-[9px] text-zinc-500 font-sans leading-relaxed">
                Jaw/height ratio: {jawHeightRatio.toFixed(3)}. Ideal is ~0.650.
              </p>
            </div>

            {/* Symmetry */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] relative overflow-hidden flex flex-col justify-between min-h-[96px]">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block leading-tight">BILATERAL_SYMMETRY</span>
                    <span className="text-[9px] text-emerald-400 font-mono leading-none">{getStatusLabel(symmetryScore)}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-zinc-100">{symmetryScore}/10</span>
                </div>
                <div className="h-1 bg-graphite-900 rounded-full overflow-hidden my-1.5">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${symmetryScore * 10}%` }} />
                </div>
              </div>
              <p className="text-[9px] text-zinc-500 font-sans leading-relaxed">
                Asymmetry index: {asymmetryIndex.toFixed(2)}%. Target deviation is &lt;3%.
              </p>
            </div>

            {/* Forward Head Posture */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] relative overflow-hidden flex flex-col justify-between min-h-[96px]">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block leading-tight">FORWARD_POSTURE</span>
                    <span className="text-[9px] text-emerald-400 font-mono leading-none">{getStatusLabel(postureScore)}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-zinc-100">{postureScore}/10</span>
                </div>
                <div className="h-1 bg-graphite-900 rounded-full overflow-hidden my-1.5">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${postureScore * 10}%` }} />
                </div>
              </div>
              <p className="text-[9px] text-zinc-500 font-sans leading-relaxed">
                Nose tilt: {tiltAngle.toFixed(1)}° | Lateral spine: {postureAngle.toFixed(1)}°.
              </p>
            </div>

            {/* Skin Health */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] relative overflow-hidden flex flex-col justify-between min-h-[96px]">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block leading-tight">SKIN_HEALTH</span>
                    <span className="text-[9px] text-emerald-400 font-mono leading-none">{getStatusLabel(skinScore)}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-zinc-100">{skinScore}/10</span>
                </div>
                <div className="h-1 bg-graphite-900 rounded-full overflow-hidden my-1.5">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${skinScore * 10}%` }} />
                </div>
              </div>
              <p className="text-[9px] text-zinc-500 font-sans leading-relaxed">
                Type: {skinCondition.toUpperCase()} active synthesis state.
              </p>
            </div>

            {/* Hair & Grooming */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] relative overflow-hidden flex flex-col justify-between min-h-[96px] sm:col-span-2">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block leading-tight">GROOM_STYLING</span>
                    <span className="text-[9px] text-emerald-400 font-mono leading-none">{getStatusLabel(groomingScore)}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-zinc-100">{groomingScore}/10</span>
                </div>
                <div className="h-1 bg-graphite-900 rounded-full overflow-hidden my-1.5">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${groomingScore * 10}%` }} />
                </div>
              </div>
              <p className="text-[9px] text-zinc-500 font-sans leading-relaxed">
                Preferred: {groomingStyle.toUpperCase()} structural balance.
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
                  className="text-[9px] font-mono bg-graphite-900 border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-graphite-800 px-2 py-1 rounded"
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
        <div className="bg-graphite-950 p-5 rounded-xl border border-white/[0.08] relative overflow-hidden flex items-center justify-between">
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
              <div className="space-y-4 mt-2">
                {/* SVG Chronological Graph */}
                <div className="w-full h-32 bg-graphite-950/40 rounded border border-white/[0.04] p-2 relative flex flex-col justify-between overflow-hidden">
                  {/* Subtle Gridlines */}
                  <div className="absolute inset-x-0 top-1/4 border-b border-white/[0.02] pointer-events-none" />
                  <div className="absolute inset-x-0 top-2/4 border-b border-white/[0.02] pointer-events-none" />
                  <div className="absolute inset-x-0 top-3/4 border-b border-white/[0.02] pointer-events-none" />
                  
                  <div className="flex-1 w-full relative h-20">
                    {/* SVG Line & Area Plot */}
                    {(() => {
                      const sorted = [...historicalRecords].sort((a, b) => a.timestamp - b.timestamp);
                      const pointsCount = sorted.length;
                      
                      // Normalize scores (which are on 1-10 scale)
                      const scores = sorted.map(r => r.score > 10 ? r.score / 10 : r.score);
                      const minScore = Math.max(0, Math.min(...scores) - 0.5);
                      const maxScore = Math.min(10, Math.max(...scores) + 0.5);
                      const scoreRange = (maxScore - minScore) || 1;

                      // Map each point to X, Y coordinates inside 100x100 viewBox
                      const mappedPoints = sorted.map((r, index) => {
                        const scoreVal = r.score > 10 ? r.score / 10 : r.score;
                        const x = pointsCount > 1 ? (index / (pointsCount - 1)) * 90 + 5 : 50;
                        const y = 90 - ((scoreVal - minScore) / scoreRange) * 80;
                        return { x, y, r, val: scoreVal };
                      });

                      // Construct the SVG path string
                      let pathStr = "";
                      let areaPathStr = "";
                      if (mappedPoints.length > 0) {
                        pathStr = `M ${mappedPoints[0].x} ${mappedPoints[0].y}`;
                        mappedPoints.forEach((p, idx) => {
                          if (idx > 0) {
                            pathStr += ` L ${p.x} ${p.y}`;
                          }
                        });
                        
                        // Close area path under the line
                        areaPathStr = `${pathStr} L ${mappedPoints[mappedPoints.length - 1].x} 95 L ${mappedPoints[0].x} 95 Z`;
                      }

                      return (
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          
                          {/* Area under the path */}
                          {areaPathStr && (
                            <path d={areaPathStr} fill="url(#chart-glow)" className="transition-all duration-300" />
                          )}

                          {/* Line path */}
                          {pathStr && (
                            <path d={pathStr} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />
                          )}

                          {/* Interaction dots */}
                          {mappedPoints.map((pt, idx) => (
                            <g key={idx} className="group/dot cursor-pointer">
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="2.5"
                                className="fill-emerald-400 stroke-black stroke-[1.5] group-hover/dot:r-4 transition-all duration-200"
                              />
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* Dates label track */}
                  <div className="flex justify-between text-[8px] text-zinc-500 font-mono pt-1 px-1 border-t border-white/[0.02]">
                    <span>
                      {new Date(historicalRecords[0].timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <span>CHRONOLOGICAL_VELOCITY</span>
                    <span>
                      {new Date(historicalRecords[historicalRecords.length - 1].timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Legend list of entries */}
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {historicalRecords.slice(-3).reverse().map((rec) => (
                    <div
                      key={rec.id || rec.timestamp}
                      className="flex items-center justify-between p-2 bg-white/[0.01] hover:bg-white/[0.02] rounded border border-white/[0.04] text-[10px] font-mono transition-all"
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
                          ASYM: {rec.asymmetryIndex.toFixed(1)}% | PST: {rec.postureAngle.toFixed(1)}°
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {(rec.score > 10 ? rec.score / 10 : rec.score).toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
