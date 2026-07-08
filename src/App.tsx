import React, { useState, useEffect } from "react";
import { Camera, Upload, RefreshCw, Sparkles, HardDrive, ShieldCheck, Cpu, Info, Check, Trash2, Calendar } from "lucide-react";
import { db, BiometricProfile, HistoricalRecord } from "./lib/db";
import { HeadWireframe } from "./components/HeadWireframes";
import { BiometricScanner } from "./components/BiometricScanner";
import { ReportCard } from "./components/ReportCard";
import { RoutineBuilder } from "./components/RoutineBuilder";

export default function App() {
  // Main state managers
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [closeupImage, setCloseupImage] = useState<string | null>(null);

  const [faceShape, setFaceShape] = useState("Oval");
  const [asymmetryIndex, setAsymmetryIndex] = useState(3.2);
  const [postureAngle, setPostureAngle] = useState(14.5);

  const [skinCondition, setSkinCondition] = useState<string>("combination");
  const [groomingStyle, setGroomingStyle] = useState<string>("stubble");

  const [routine, setRoutine] = useState<any | null>(null);
  const [routineChecks, setRoutineChecks] = useState<string[]>([]);
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[]>([]);

  const [dragActive, setDragActive] = useState<Record<string, boolean>>({
    front: false,
    side: false,
    closeup: false,
  });

  const [isInitializing, setIsInitializing] = useState(true);

  // Load and rehydrate all biometric profiles, scores, and routines from Dexie.js
  useEffect(() => {
    const initDatabase = async () => {
      try {
        const savedProfile = await db.profiles.get("current_profile");
        const historyData = await db.history.orderBy("timestamp").toArray();
        setHistoricalRecords(historyData);

        if (savedProfile) {
          setFrontImage(savedProfile.frontImage);
          setSideImage(savedProfile.sideImage);
          setCloseupImage(savedProfile.closeupImage);
          setFaceShape(savedProfile.faceShape);
          setAsymmetryIndex(savedProfile.asymmetryIndex);
          setPostureAngle(savedProfile.postureAngle);
          setSkinCondition(savedProfile.skinCondition || "combination");
          setGroomingStyle(savedProfile.groomingStyle || "stubble");
          setRoutine(savedProfile.routine);
          setRoutineChecks(savedProfile.routineChecks || []);
        } else {
          // Initialize empty profile structure in database if none exists
          const initialProfile: BiometricProfile = {
            id: "current_profile",
            frontImage: null,
            sideImage: null,
            closeupImage: null,
            faceShape: "Oval",
            asymmetryIndex: 3.2,
            postureAngle: 14.5,
            skinCondition: "combination",
            groomingStyle: "stubble",
            subscores: { jawline: 82, skin: 80, grooming: 85, symmetry: 86 },
            currentScore: 83,
            potentialScore: 94,
            routine: null,
            routineChecks: [],
            lastUpdated: Date.now(),
          };
          await db.profiles.add(initialProfile);
        }
      } catch (err) {
        console.error("Dexie initial recovery error:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initDatabase();
  }, []);

  // Save changes automatically to IndexedDB to guarantee zero loss of state on page refresh
  useEffect(() => {
    if (isInitializing) return;

    const saveToIndexedDB = async () => {
      try {
        await db.profiles.update("current_profile", {
          frontImage,
          sideImage,
          closeupImage,
          faceShape,
          asymmetryIndex,
          postureAngle,
          skinCondition,
          groomingStyle,
          routine,
          routineChecks,
          lastUpdated: Date.now(),
        });
      } catch (err) {
        console.error("Database auto-update sync error:", err);
      }
    };

    saveToIndexedDB();
  }, [
    frontImage,
    sideImage,
    closeupImage,
    faceShape,
    asymmetryIndex,
    postureAngle,
    skinCondition,
    groomingStyle,
    routine,
    routineChecks,
    isInitializing,
  ]);

  // Handle native HTML5 file API base64 parser
  const handleImageUpload = (angle: "front" | "side" | "closeup", file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Invalid file: strictly upload high-resolution photography files.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      if (angle === "front") setFrontImage(base64String);
      if (angle === "side") setSideImage(base64String);
      if (angle === "closeup") setCloseupImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop event managers
  const handleDrag = (e: React.DragEvent, angle: "front" | "side" | "closeup", active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [angle]: active }));
  };

  const handleDrop = (e: React.DragEvent, angle: "front" | "side" | "closeup") => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [angle]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(angle, e.dataTransfer.files[0]);
    }
  };

  // Reset current profile images
  const handleClearImage = (angle: "front" | "side" | "closeup") => {
    if (angle === "front") setFrontImage(null);
    if (angle === "side") setSideImage(null);
    if (angle === "closeup") setCloseupImage(null);
  };

  // Save history record handler for progress cycle
  const handleSaveHistory = async (currentScore: number) => {
    try {
      const record: HistoricalRecord = {
        timestamp: Date.now(),
        score: currentScore,
        asymmetryIndex,
        postureAngle,
        subscores: {
          jawline: Math.round(Math.max(45, 95 - postureAngle * 1.5)),
          skin: skinCondition === "congested" ? 62 : skinCondition === "oily" ? 72 : 88,
          grooming: groomingStyle === "clean-shaven" ? 88 : 82,
          symmetry: Math.round(Math.max(35, 100 - asymmetryIndex * 4.5)),
        },
      };

      await db.history.add(record);
      const updatedHistory = await db.history.orderBy("timestamp").toArray();
      setHistoricalRecords(updatedHistory);
    } catch (err) {
      console.error("Failed to record milestone in history:", err);
    }
  };

  // Reset entire database data to factory settings
  const handleFactoryReset = async () => {
    if (confirm("Reset core telemetry and clear all local biometrics databases?")) {
      await db.profiles.clear();
      await db.history.clear();
      window.location.reload();
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-500">
        <div className="flex flex-col items-center gap-3">
          <Cpu className="w-8 h-8 text-emerald-400 animate-pulse" />
          <p className="font-mono text-xs tracking-widest text-zinc-400">AURAMAX_CORE_REHYDRATION</p>
          <p className="text-[10px] text-zinc-600 font-sans">Connecting local IndexedDB matrices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans p-4 sm:p-6 lg:p-8 flex justify-center selection:bg-emerald-500/20 selection:text-emerald-300">
      <div className="w-full max-w-7xl flex flex-col gap-8">
        
        {/* UPPER TITLE BAR & HUD STATE */}
        <header id="auramax-system-header" className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/[0.08] pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold tracking-widest bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                AURAMAX_V1.1
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-[9px] text-emerald-400/80 uppercase">LIVE_CELLULAR_CORE</span>
            </div>
            <h1 className="text-3xl font-black font-mono tracking-tighter text-zinc-100 uppercase">
              AuraMax <span className="text-emerald-400 font-light text-xl lowercase">/ self-optimization</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1 max-w-xl font-sans">
              Precision client-side facial analysis, biomechanical alignment, and targeted routine synthesis engine.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded-lg border border-white/[0.06] w-full md:w-auto">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-zinc-500" />
              <div>
                <p className="text-[9px] font-mono text-zinc-500 leading-none">DATABASE_INTEGRITY</p>
                <p className="text-[10px] font-mono text-zinc-300">DEXIE_INDEXEDDB_LOCAL</p>
              </div>
            </div>
            <div className="h-6 w-[1px] bg-white/[0.08]" />
            <button
              onClick={handleFactoryReset}
              className="ml-auto md:ml-0 text-[10px] font-mono text-red-400/80 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded transition-all"
            >
              FACTORY_RESET
            </button>
          </div>
        </header>

        {/* FEATURE 1: MULTI-ANGLE DIAGNOSTIC UPLOAD AREA */}
        <section id="upload-grid-section" className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-emerald-400" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-zinc-300">
              I. DIAGNOSTIC_IMAGE_UPLOAD
            </h2>
            <span className="h-[1px] flex-1 bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-zinc-500">HTML5_LOCAL_STATE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* FRONT PROFILE UPLOAD */}
            <div
              onDragOver={(e) => handleDrag(e, "front", true)}
              onDragLeave={(e) => handleDrag(e, "front", false)}
              onDrop={(e) => handleDrop(e, "front")}
              className={`relative bg-[#090909] aspect-[4/3] sm:aspect-square rounded-xl border flex flex-col items-center justify-center overflow-hidden transition-all group ${
                dragActive.front
                  ? "border-emerald-400 bg-emerald-500/[0.02]"
                  : "border-white/[0.08] hover:border-white/[0.15]"
              }`}
            >
              {frontImage ? (
                <>
                  <img src={frontImage} alt="Front Profile" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                    <button
                      onClick={() => handleClearImage("front")}
                      className="bg-red-500/15 border border-red-500/40 text-red-400 p-2 rounded-lg text-xs font-mono flex items-center gap-1 hover:bg-red-500/35 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      DELETE
                    </button>
                  </div>
                  <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-zinc-300 bg-black/85 px-2 py-0.5 rounded border border-white/[0.08]">
                    FRONT_PROFILE.JPG
                  </span>
                </>
              ) : (
                <div className="p-4 w-full h-full flex flex-col justify-between items-center relative">
                  <div className="w-full max-w-[150px] aspect-square flex items-center justify-center">
                    <HeadWireframe type="front" />
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <label className="cursor-pointer bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] active:bg-white/[0.12] text-zinc-300 px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      FRONT_PROFILE
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload("front", e.target.files[0])}
                      />
                    </label>
                    <p className="text-[10px] text-zinc-500 mt-2">Drag & drop high-resolution image</p>
                  </div>
                </div>
              )}
            </div>

            {/* SIDE PROFILE UPLOAD */}
            <div
              onDragOver={(e) => handleDrag(e, "side", true)}
              onDragLeave={(e) => handleDrag(e, "side", false)}
              onDrop={(e) => handleDrop(e, "side")}
              className={`relative bg-[#090909] aspect-[4/3] sm:aspect-square rounded-xl border flex flex-col items-center justify-center overflow-hidden transition-all group ${
                dragActive.side
                  ? "border-emerald-400 bg-emerald-500/[0.02]"
                  : "border-white/[0.08] hover:border-white/[0.15]"
              }`}
            >
              {sideImage ? (
                <>
                  <img src={sideImage} alt="Side Profile" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                    <button
                      onClick={() => handleClearImage("side")}
                      className="bg-red-500/15 border border-red-500/40 text-red-400 p-2 rounded-lg text-xs font-mono flex items-center gap-1 hover:bg-red-500/35 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      DELETE
                    </button>
                  </div>
                  <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-zinc-300 bg-black/85 px-2 py-0.5 rounded border border-white/[0.08]">
                    SIDE_PROFILE.JPG
                  </span>
                </>
              ) : (
                <div className="p-4 w-full h-full flex flex-col justify-between items-center relative">
                  <div className="w-full max-w-[150px] aspect-square flex items-center justify-center">
                    <HeadWireframe type="side" />
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <label className="cursor-pointer bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] active:bg-white/[0.12] text-zinc-300 px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      SIDE_PROFILE
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload("side", e.target.files[0])}
                      />
                    </label>
                    <p className="text-[10px] text-zinc-500 mt-2">Drag & drop high-resolution image</p>
                  </div>
                </div>
              )}
            </div>

            {/* CLOSE-UP PROFILE UPLOAD */}
            <div
              onDragOver={(e) => handleDrag(e, "closeup", true)}
              onDragLeave={(e) => handleDrag(e, "closeup", false)}
              onDrop={(e) => handleDrop(e, "closeup")}
              className={`relative bg-[#090909] aspect-[4/3] sm:aspect-square rounded-xl border flex flex-col items-center justify-center overflow-hidden transition-all group ${
                dragActive.closeup
                  ? "border-emerald-400 bg-emerald-500/[0.02]"
                  : "border-white/[0.08] hover:border-white/[0.15]"
              }`}
            >
              {closeupImage ? (
                <>
                  <img src={closeupImage} alt="Close-up Profile" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                    <button
                      onClick={() => handleClearImage("closeup")}
                      className="bg-red-500/15 border border-red-500/40 text-red-400 p-2 rounded-lg text-xs font-mono flex items-center gap-1 hover:bg-red-500/35 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      DELETE
                    </button>
                  </div>
                  <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-zinc-300 bg-black/85 px-2 py-0.5 rounded border border-white/[0.08]">
                    CLOSEUP_SURFACE.JPG
                  </span>
                </>
              ) : (
                <div className="p-4 w-full h-full flex flex-col justify-between items-center relative">
                  <div className="w-full max-w-[150px] aspect-square flex items-center justify-center">
                    <HeadWireframe type="closeup" />
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <label className="cursor-pointer bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] active:bg-white/[0.12] text-zinc-300 px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      CLOSE_UP
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload("closeup", e.target.files[0])}
                      />
                    </label>
                    <p className="text-[10px] text-zinc-500 mt-2">Drag & drop high-resolution image</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* FEATURE 2: CLIENT-SIDE GEOMETRIC MESH SCANNER */}
        <section id="mesh-scanner-section" className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-zinc-300">
              II. CLIENT_SIDE_MESH_CALIBRATION
            </h2>
            <span className="h-[1px] flex-1 bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-zinc-500">478_LANDMARK_GRID</span>
          </div>

          <BiometricScanner
            frontImage={frontImage}
            sideImage={sideImage}
            closeupImage={closeupImage}
            onMetricsChanged={(metrics) => {
              setFaceShape(metrics.faceShape);
              setAsymmetryIndex(metrics.asymmetryIndex);
              setPostureAngle(metrics.postureAngle);
            }}
          />
        </section>

        {/* SKIN & GROOMING SELECTIONS OVERLAY */}
        <section id="lifestyle-selectors-section" className="bg-[#090909] p-5 rounded-xl border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono text-xs font-semibold tracking-wider text-zinc-100">
              BIOMEMBRANE_CLASSIFICATIONS
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Skin classification */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-zinc-400">SKIN_HEALTH_CLASSIFICATION</label>
              <div className="grid grid-cols-5 gap-1 bg-zinc-950 p-1 rounded-lg border border-white/[0.05]">
                {["dry", "oily", "combination", "normal", "congested"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSkinCondition(type)}
                    className={`px-1 py-1.5 text-[9px] font-mono rounded transition-all uppercase ${
                      skinCondition === type
                        ? "bg-zinc-800 text-emerald-400 font-bold border border-white/[0.05]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Grooming Preference */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-zinc-400">GROOMING_PREFERENCE_TARGET</label>
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-white/[0.05]">
                {["clean-shaven", "stubble", "beard"].map((style) => (
                  <button
                    key={style}
                    onClick={() => setGroomingStyle(style)}
                    className={`px-1 py-1.5 text-[9px] font-mono rounded transition-all uppercase ${
                      groomingStyle === style
                        ? "bg-zinc-800 text-emerald-400 font-bold border border-white/[0.05]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {style.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* FEATURE 3: 100-POINT "CURRENT VS POTENTIAL" REPORT CARD */}
        <section id="report-card-section" className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-zinc-300">
              III. OPTIMIZATION_SCORECARD_MATRIX
            </h2>
            <span className="h-[1px] flex-1 bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-zinc-500">POTENTIAL_DELTA_100</span>
          </div>

          <ReportCard
            asymmetryIndex={asymmetryIndex}
            postureAngle={postureAngle}
            skinCondition={skinCondition}
            groomingStyle={groomingStyle}
            historicalRecords={historicalRecords}
            onSaveHistory={handleSaveHistory}
          />
        </section>

        {/* FEATURE 4 & 5: HYPER-TARGETED ROUTINE BUILDER & PERSISTENT DAILY TRACKER */}
        <section id="routine-builder-section" className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-zinc-300">
              IV. STRUCTURAL_OPTIMIZATION_PIPELINE
            </h2>
            <span className="h-[1px] flex-1 bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-zinc-500">AI_BIOMETRIC_PRESET</span>
          </div>

          <RoutineBuilder
            faceShape={faceShape}
            asymmetryIndex={asymmetryIndex}
            postureAngle={postureAngle}
            skinCondition={skinCondition}
            groomingStyle={groomingStyle}
            subscores={{
              jawline: Math.round(Math.max(45, 95 - postureAngle * 1.5)),
              skin: skinCondition === "congested" ? 62 : skinCondition === "oily" ? 72 : 88,
              grooming: groomingStyle === "clean-shaven" ? 88 : 82,
              symmetry: Math.round(Math.max(35, 100 - asymmetryIndex * 4.5)),
            }}
            routine={routine}
            routineChecks={routineChecks}
            onRoutineGenerated={(newRoutine) => setRoutine(newRoutine)}
            onChecksChanged={(newChecks) => setRoutineChecks(newChecks)}
          />
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/[0.08] pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-600 gap-4">
          <div>
            <span>SYSTEM: AURAMAX_CELLULAR_AESTHETICS</span>
            <span className="mx-2">•</span>
            <span>SECURE_LOCAL_DEVICES_STRICT</span>
          </div>
          <div className="flex gap-4">
            <span>DATA_FLOW: ENCRYPTED_INDEXED_DB</span>
            <span>NODE_VERSION: ESM_STABILIZED</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
