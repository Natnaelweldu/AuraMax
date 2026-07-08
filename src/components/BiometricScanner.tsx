import React, { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, Layers, Crosshair, Sparkles } from "lucide-react";

interface Point2D {
  id: string;
  label: string;
  x: number; // percentage 0-100 of container width
  y: number; // percentage 0-100 of container height
  side: "left" | "right" | "center";
}

interface BiometricScannerProps {
  frontImage: string | null;
  sideImage: string | null;
  closeupImage: string | null;
  onMetricsChanged: (metrics: {
    faceShape: string;
    asymmetryIndex: number;
    postureAngle: number;
  }) => void;
}

export const BiometricScanner: React.FC<BiometricScannerProps> = ({
  frontImage,
  sideImage,
  closeupImage,
  onMetricsChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"front" | "side">("front");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Front profile landmark points (percentage coordinates on the image)
  const [frontPoints, setFrontPoints] = useState<Point2D[]>([
    { id: "forehead", label: "Forehead Center", x: 50, y: 22, side: "center" },
    { id: "nose_tip", label: "Nose Tip", x: 50, y: 64, side: "center" },
    { id: "chin_tip", label: "Chin Apex", x: 50, y: 94, side: "center" },
    { id: "l_temple", label: "Left Temple", x: 28, y: 34, side: "left" },
    { id: "r_temple", label: "Right Temple", x: 72, y: 34, side: "right" },
    { id: "l_eye", label: "Left Eye", x: 38, y: 48, side: "left" },
    { id: "r_eye", label: "Right Eye", x: 62, y: 48, side: "right" },
    { id: "l_cheek", label: "Left Zygomaticus", x: 23, y: 60, side: "left" },
    { id: "r_cheek", label: "Right Zygomaticus", x: 77, y: 60, side: "right" },
    { id: "l_jaw", label: "Left Jaw Angle", x: 28, y: 80, side: "left" },
    { id: "r_jaw", label: "Right Jaw Angle", x: 72, y: 80, side: "right" },
  ]);

  // Side profile landmark points
  const [sidePoints, setSidePoints] = useState<Point2D[]>([
    { id: "tragus", label: "Ear Tragus", x: 42, y: 48, side: "center" },
    { id: "acromion", label: "Shoulder Acromion", x: 55, y: 92, side: "center" },
  ]);

  const [draggedPoint, setDraggedPoint] = useState<{ tab: "front" | "side"; id: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculations for front profile metrics
  const getFrontMetrics = () => {
    // Find points
    const p = (id: string) => frontPoints.find((pt) => pt.id === id)!;
    
    const forehead = p("forehead");
    const nose = p("nose_tip");
    const chin = p("chin_tip");
    const lTemple = p("l_temple");
    const rTemple = p("r_temple");
    const lEye = p("l_eye");
    const rEye = p("r_eye");
    const lCheek = p("l_cheek");
    const rCheek = p("r_cheek");
    const lJaw = p("l_jaw");
    const rJaw = p("r_jaw");

    // Face Height & Width
    const faceHeight = chin.y - forehead.y;
    const faceWidth = rCheek.x - lCheek.x;
    const jawWidth = rJaw.x - lJaw.x;
    const ratio = faceHeight / faceWidth;

    // Face Shape categorization based on mathematical ratios
    let faceShape = "Oval";
    const jawToCheekRatio = jawWidth / faceWidth;

    if (ratio < 1.18) {
      faceShape = "Round";
    } else if (ratio >= 1.18 && ratio < 1.32) {
      if (jawToCheekRatio > 0.88) {
        faceShape = "Square";
      } else {
        faceShape = "Heart";
      }
    } else {
      if (jawToCheekRatio < 0.78) {
        faceShape = "Diamond";
      } else {
        faceShape = "Oblong";
      }
    }

    // Midline x-coords based on regression of central points
    const midlineX = (forehead.x + nose.x + chin.x) / 3;

    // Asymmetry calculation: compare absolute x-deltas and y-deltas of bilateral elements
    const calcAsym = (left: Point2D, right: Point2D) => {
      const leftDist = midlineX - left.x;
      const rightDist = right.x - midlineX;
      const xDiff = Math.abs(leftDist - rightDist);
      const yDiff = Math.abs(left.y - right.y);
      return xDiff + yDiff * 1.5; // Weight vertical misalignment more
    };

    const templeAsym = calcAsym(lTemple, rTemple);
    const eyeAsym = calcAsym(lEye, rEye);
    const cheekAsym = calcAsym(lCheek, rCheek);
    const jawAsym = calcAsym(lJaw, rJaw);

    const totalAsymRaw = (templeAsym + eyeAsym + cheekAsym + jawAsym) / 4;
    // Normalize to an index between 0.5% and 15%
    const asymmetryIndex = Math.min(15.0, Math.max(0.5, parseFloat((totalAsymRaw * 3).toFixed(2))));

    return { faceShape, asymmetryIndex };
  };

  // Calculations for side profile metrics (Posture angle)
  const getSideMetrics = () => {
    const tragus = sidePoints.find((pt) => pt.id === "tragus")!;
    const acromion = sidePoints.find((pt) => pt.id === "acromion")!;

    // Forward head posture angle calculation: offset from vertical alignment
    const dx = tragus.x - acromion.x;
    const dy = acromion.y - tragus.y; // invert y because coordinates start top-down
    
    // Angle in degrees from the vertical line
    const angleRad = Math.atan2(Math.abs(dx), Math.abs(dy));
    const angleDeg = parseFloat((angleRad * (180 / Math.PI)).toFixed(1));

    return { postureAngle: angleDeg };
  };

  // Trigger metrics update whenever points change
  useEffect(() => {
    const { faceShape, asymmetryIndex } = getFrontMetrics();
    const { postureAngle } = getSideMetrics();
    onMetricsChanged({ faceShape, asymmetryIndex, postureAngle });
  }, [frontPoints, sidePoints]);

  const handlePointerDown = (tab: "front" | "side", id: string) => {
    setDraggedPoint({ tab, id });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedPoint || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));

    if (draggedPoint.tab === "front") {
      setFrontPoints((prev) =>
        prev.map((pt) => (pt.id === draggedPoint.id ? { ...pt, x, y } : pt))
      );
    } else {
      setSidePoints((prev) =>
        prev.map((pt) => (pt.id === draggedPoint.id ? { ...pt, x, y } : pt))
      );
    }
  };

  const handlePointerUp = () => {
    setDraggedPoint(null);
  };

  const triggerScanSimulation = () => {
    setIsScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsScanning(false), 800);
          return 100;
        }
        return prev + 5;
      });
    }, 80);
  };

  const activeImage = activeTab === "front" ? frontImage : sideImage;
  const activePoints = activeTab === "front" ? frontPoints : sidePoints;

  // Render SVG mesh connections dynamically for front tab
  const renderMeshConnections = () => {
    if (activeTab !== "front") return null;
    const p = (id: string) => frontPoints.find((pt) => pt.id === id)!;

    try {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-emerald-500/40 fill-none stroke-[0.75]">
          {/* Midline guide */}
          <line
            x1={`${(p("forehead").x + p("nose_tip").x + p("chin_tip").x) / 3}%`}
            y1="5%"
            x2={`${(p("forehead").x + p("nose_tip").x + p("chin_tip").x) / 3}%`}
            y2="95%"
            strokeDasharray="3,3"
            className="stroke-emerald-500/20"
          />

          {/* Symmetrical bilateral line pairs */}
          <line x1={`${p("l_temple").x}%`} y1={`${p("l_temple").y}%`} x2={`${p("r_temple").x}%`} y2={`${p("r_temple").y}%`} strokeDasharray="1,1" className="stroke-zinc-500/40" />
          <line x1={`${p("l_eye").x}%`} y1={`${p("l_eye").y}%`} x2={`${p("r_eye").x}%`} y2={`${p("r_eye").y}%`} strokeDasharray="1,1" className="stroke-zinc-500/40" />
          <line x1={`${p("l_cheek").x}%`} y1={`${p("l_cheek").y}%`} x2={`${p("r_cheek").x}%`} y2={`${p("r_cheek").y}%`} strokeDasharray="1,1" className="stroke-zinc-500/40" />
          <line x1={`${p("l_jaw").x}%`} y1={`${p("l_jaw").y}%`} x2={`${p("r_jaw").x}%`} y2={`${p("r_jaw").y}%`} strokeDasharray="1,1" className="stroke-zinc-500/40" />

          {/* Outer contours */}
          <path
            d={`M ${p("forehead").x} ${p("forehead").y} 
               L ${p("r_temple").x} ${p("r_temple").y} 
               L ${p("r_cheek").x} ${p("r_cheek").y} 
               L ${p("r_jaw").x} ${p("r_jaw").y} 
               L ${p("chin_tip").x} ${p("chin_tip").y} 
               L ${p("l_jaw").x} ${p("l_jaw").y} 
               L ${p("l_cheek").x} ${p("l_cheek").y} 
               L ${p("l_temple").x} ${p("l_temple").y} Z`}
            className="stroke-emerald-500/40"
          />

          {/* Internal mapping triangulation lines */}
          <line x1={`${p("forehead").x}%`} y1={`${p("forehead").y}%`} x2={`${p("l_eye").x}%`} y2={`${p("l_eye").y}%`} />
          <line x1={`${p("forehead").x}%`} y1={`${p("forehead").y}%`} x2={`${p("r_eye").x}%`} y2={`${p("r_eye").y}%`} />
          
          <line x1={`${p("l_temple").x}%`} y1={`${p("l_temple").y}%`} x2={`${p("l_eye").x}%`} y2={`${p("l_eye").y}%`} />
          <line x1={`${p("r_temple").x}%`} y1={`${p("r_temple").y}%`} x2={`${p("r_eye").x}%`} y2={`${p("r_eye").y}%`} />
          
          <line x1={`${p("l_eye").x}%`} y1={`${p("l_eye").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />
          <line x1={`${p("r_eye").x}%`} y1={`${p("r_eye").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />

          <line x1={`${p("l_cheek").x}%`} y1={`${p("l_cheek").y}%`} x2={`${p("l_eye").x}%`} y2={`${p("l_eye").y}%`} />
          <line x1={`${p("r_cheek").x}%`} y1={`${p("r_cheek").y}%`} x2={`${p("r_eye").x}%`} y2={`${p("r_eye").y}%`} />
          
          <line x1={`${p("l_cheek").x}%`} y1={`${p("l_cheek").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />
          <line x1={`${p("r_cheek").x}%`} y1={`${p("r_cheek").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />

          <line x1={`${p("l_jaw").x}%`} y1={`${p("l_jaw").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />
          <line x1={`${p("r_jaw").x}%`} y1={`${p("r_jaw").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />

          <line x1={`${p("l_jaw").x}%`} y1={`${p("l_jaw").y}%`} x2={`${p("chin_tip").x}%`} y2={`${p("chin_tip").y}%`} />
          <line x1={`${p("r_jaw").x}%`} y1={`${p("r_jaw").y}%`} x2={`${p("chin_tip").x}%`} y2={`${p("chin_tip").y}%`} />

          {/* Mock secondary coordinates - 478 points grid visualization simulation */}
          {frontPoints.map((pt) => (
            <g key={`secondary-${pt.id}`}>
              <circle cx={`${pt.x - 3}%`} cy={`${pt.y - 2}%`} r="1" className="fill-emerald-400/30" />
              <circle cx={`${pt.x + 3}%`} cy={`${pt.y + 2}%`} r="1" className="fill-emerald-400/30" />
              <circle cx={`${pt.x - 1}%`} cy={`${pt.y + 3}%`} r="1" className="fill-emerald-400/30" />
              <circle cx={`${pt.x + 2}%`} cy={`${pt.y - 4}%`} r="1" className="fill-emerald-400/30" />
            </g>
          ))}
        </svg>
      );
    } catch {
      return null;
    }
  };

  const renderPostureGuidelines = () => {
    if (activeTab !== "side") return null;
    const tragus = sidePoints.find((pt) => pt.id === "tragus")!;
    const acromion = sidePoints.find((pt) => pt.id === "acromion")!;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-emerald-500 fill-none stroke-[0.75]">
        {/* Shoulder vertical guide */}
        <line
          x1={`${acromion.x}%`}
          y1="5%"
          x2={`${acromion.x}%`}
          y2={`${acromion.y}%`}
          strokeDasharray="4,4"
          className="stroke-zinc-500/50 stroke-[1]"
        />

        {/* Tragus to shoulder acromion vector */}
        <line
          x1={`${acromion.x}%`}
          y1={`${acromion.y}%`}
          x2={`${tragus.x}%`}
          y2={`${tragus.y}%`}
          className="stroke-emerald-400 stroke-[1.5]"
        />

        {/* Highlight Offset Arc area */}
        <path
          d={`M ${acromion.x} ${acromion.y - 30} A 30 30 0 0 ${tragus.x < acromion.x ? 0 : 1} ${tragus.x} ${tragus.y}`}
          className="stroke-emerald-500/20 fill-emerald-500/5"
          style={{ transform: `scale(${1})` }}
        />
      </svg>
    );
  };

  const calculatedFront = getFrontMetrics();
  const calculatedSide = getSideMetrics();

  return (
    <div id="biometric-scanner-module" className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Visual Canvas Viewport */}
      <div className="flex-1 bg-[#090909] rounded-xl border border-white/[0.08] relative overflow-hidden flex flex-col min-h-[450px]">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-black/40 backdrop-blur-md z-10">
          <div className="flex gap-1.5 bg-zinc-900 p-0.5 rounded-lg border border-white/[0.05]">
            <button
              onClick={() => setActiveTab("front")}
              className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                activeTab === "front"
                  ? "bg-zinc-800 text-emerald-400 font-medium border border-white/[0.08]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              FRONT_MESH
            </button>
            <button
              onClick={() => setActiveTab("side")}
              className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                activeTab === "side"
                  ? "bg-zinc-800 text-emerald-400 font-medium border border-white/[0.08]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              LATERAL_ALIGN
            </button>
          </div>

          <button
            onClick={triggerScanSimulation}
            disabled={!activeImage || isScanning}
            className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 disabled:opacity-40 disabled:pointer-events-none px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            EXECUTE_SCAN
          </button>
        </div>

        {/* Scan line effect */}
        {isScanning && (
          <div
            className="absolute left-0 w-full h-1 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] z-20 pointer-events-none"
            style={{
              top: `${scanProgress}%`,
              transition: "top 0.08s linear",
            }}
          />
        )}

        {/* Main interactive stage */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="flex-1 relative flex items-center justify-center overflow-hidden touch-none select-none bg-radial-gradient"
        >
          {activeImage ? (
            <div className="w-full h-full relative flex items-center justify-center">
              <img
                src={activeImage}
                alt="Upload profile"
                className="max-w-full max-h-full object-contain pointer-events-none"
              />
              {/* Overlay graphics */}
              {renderMeshConnections()}
              {renderPostureGuidelines()}

              {/* Draggable landmarks */}
              {activePoints.map((pt) => {
                const isSelected = draggedPoint?.id === pt.id;
                return (
                  <div
                    key={pt.id}
                    onPointerDown={() => handlePointerDown(activeTab, pt.id)}
                    className="absolute cursor-grab active:cursor-grabbing group z-30"
                    style={{
                      left: `${pt.x}%`,
                      top: `${pt.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {/* Diagnostic Anchor ring */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-emerald-400/40 border-emerald-300 scale-125 shadow-[0_0_10px_#10b981]"
                          : "bg-black/80 border-emerald-500/80 group-hover:bg-emerald-500/20 group-hover:scale-110"
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>

                    {/* Landmark identifier HUD */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/90 border border-white/[0.08] text-[9px] font-mono text-zinc-300 px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {pt.label} ({Math.round(pt.x)}, {Math.round(pt.y)})
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-zinc-500 max-w-sm">
              <Camera className="w-10 h-10 text-zinc-600 mb-3 stroke-[1.25]" />
              <p className="font-mono text-xs text-zinc-400 mb-1">IMAGE_NOT_LOADED</p>
              <p className="text-xs text-zinc-500">
                Please upload a photo in the drop zone above to initialize client-side geometric calibration.
              </p>
            </div>
          )}
        </div>

        {/* Footer scan stats */}
        <div className="px-4 py-2 border-t border-white/[0.08] bg-black/20 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex gap-4">
            <span>GRID: 478_COORDS</span>
            <span>CONTEXT: WEBGL_2D</span>
          </div>
          <div>
            STATUS: {isScanning ? `COMPUTING_${scanProgress}%` : "IDLE_AWAITING_INPUT"}
          </div>
        </div>
      </div>

      {/* Metric Calibration Sidebar HUD */}
      <div className="w-full lg:w-[280px] flex flex-col gap-4">
        
        {/* Real-time Diagnostics HUD */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-3.5">
            <Crosshair className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono text-xs font-semibold tracking-wider text-zinc-100">
              REALTIME_TELEMETRY
            </h3>
          </div>

          <div className="space-y-4">
            {/* Front Profile Diagnostic Outputs */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5">
                <span>FACE_SHAPE</span>
                <span className="text-emerald-400 font-medium text-right">
                  {calculatedFront.faceShape.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                Calculated from vertical facial height vs. lateral zygomatic width ratios.
              </p>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                <span>ASYMMETRY_IDX</span>
                <span className="text-emerald-400 font-medium">
                  {calculatedFront.asymmetryIndex}%
                </span>
              </div>
              {/* Range indicator bar */}
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-1.5 border border-white/[0.03]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    calculatedFront.asymmetryIndex < 3
                      ? "bg-emerald-400"
                      : calculatedFront.asymmetryIndex < 6
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, (calculatedFront.asymmetryIndex / 15) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                Deviation index of corresponding bilateral muscle and skeletal vertices. Target: &lt;3%.
              </p>
            </div>

            {/* Lateral alignment outputs */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                <span>FORWARD_POSTURE</span>
                <span className="text-emerald-400 font-medium">
                  {calculatedSide.postureAngle}°
                </span>
              </div>
              {/* Range indicator bar */}
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-1.5 border border-white/[0.03]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    calculatedSide.postureAngle < 15
                      ? "bg-emerald-400"
                      : calculatedSide.postureAngle < 25
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, (calculatedSide.postureAngle / 45) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                Tragus-to-acromion cervical offset. Values &gt;15° indicate progressive cervical load.
              </p>
            </div>
          </div>
        </div>

        {/* Tip/Info Box */}
        <div className="bg-[#050505] p-3.5 rounded-lg border border-white/[0.04]">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mb-2">
            CALIBRATION_MANUAL
          </span>
          <p className="text-[10px] leading-relaxed text-zinc-500 font-sans">
            To fine-tune geometric calculations, drag the glowing green alignment nodes to match key structural vertices on your uploaded photography.
          </p>
        </div>

      </div>
    </div>
  );
};
