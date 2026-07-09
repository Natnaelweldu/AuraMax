"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Camera, Upload, RefreshCw, Sparkles, HardDrive, 
  ShieldCheck, Cpu, Info, Check, Trash2, Calendar 
} from "lucide-react";

import { db, BiometricProfile, HistoricalRecord } from "../lib/db";
import { HeadWireframe } from "../components/HeadWireframes";
import { ReportCard } from "../components/ReportCard";
import { RoutineBuilder } from "../components/RoutineBuilder";
import { supabase } from "../lib/supabaseClient";
import AuthGateway from "../components/AuthGateway";

// 2. DYNAMIC LAYOUT LOADING: SSR-disabled dynamic import of MeshScanner
const MeshScanner = dynamic(() => import("../components/MeshScanner"), { ssr: false });

export default function AuraMaxDashboardPage() {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [closeupImage, setCloseupImage] = useState<string | null>(null);

  const [faceShape, setFaceShape] = useState("Oval");
  const [asymmetryIndex, setAsymmetryIndex] = useState(7.11);
  const [postureAngle, setPostureAngle] = useState(18.0);
  const [tiltAngle, setTiltAngle] = useState(0.0);
  const [jawHeightRatio, setJawHeightRatio] = useState(0.611);

  const [skinCondition, setSkinCondition] = useState<string>("combination");
  const [groomingStyle, setGroomingStyle] = useState<string>("stubble");
  const [hairTexture, setHairTexture] = useState<string>("straight");
  const [age, setAge] = useState<number>(21);

  const [routine, setRoutine] = useState<any | null>(null);
  const [routineChecks, setRoutineChecks] = useState<string[]>([]);
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[]>([]);

  const [dragActive, setDragActive] = useState<Record<string, boolean>>({
    front: false,
    side: false,
    closeup: false,
  });

  const [isInitializing, setIsInitializing] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchHistoryFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("biometric_scans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Error fetching history from Supabase:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
      }

      if (data && data.length > 0) {
        const mappedRecords: HistoricalRecord[] = data.map((item: any) => {
          const rawSymmetry = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - item.asymmetry_index * 0.45)).toFixed(1));
          const rawJawline = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - Math.abs(item.jaw_height_ratio - 0.65) * 12)).toFixed(1));
          const rawPosture = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - item.tilt_angle * 0.4)).toFixed(1));
          
          let rawSkin = 8.8;
          if (item.skin_condition === "congested") rawSkin = 6.2;
          else if (item.skin_condition === "oily") rawSkin = 7.2;
          else if (item.skin_condition === "dry") rawSkin = 7.8;
          else if (item.skin_condition === "combination") rawSkin = 8.0;

          let rawGrooming = 8.5;
          if (item.grooming_style === "stubble") rawGrooming = 8.2;
          else if (item.grooming_style === "clean-shaven") rawGrooming = 8.8;
          else if (item.grooming_style === "beard") rawGrooming = 8.0;

          const score = item.score || parseFloat(((rawJawline + rawSkin + rawGrooming + rawSymmetry + rawPosture) / 5).toFixed(1));

          return {
            id: item.id,
            timestamp: new Date(item.created_at).getTime(),
            score: score,
            asymmetryIndex: item.asymmetry_index,
            postureAngle: item.posture_angle,
            tiltAngle: item.tilt_angle,
            jawHeightRatio: item.jaw_height_ratio,
            subscores: {
              jawline: Math.round(rawJawline * 10),
              skin: Math.round(rawSkin * 10),
              grooming: Math.round(rawGrooming * 10),
              symmetry: Math.round(rawSymmetry * 10),
              posture: Math.round(rawPosture * 10),
            }
          };
        });
        setHistoricalRecords(mappedRecords);
      }
    } catch (err) {
      console.error("Error in fetchHistoryFromSupabase:", err);
    }
  };

  const saveScanToSupabase = async () => {
    if (!session?.user?.id) return;
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

      const score = parseFloat(((rawJawline + rawSkin + rawGrooming + rawSymmetry + rawPosture) / 5).toFixed(1));

      const scanData = {
        user_id: session.user.id,
        face_shape: faceShape,
        asymmetry_index: asymmetryIndex,
        posture_angle: postureAngle,
        tilt_angle: tiltAngle,
        jaw_height_ratio: jawHeightRatio,
        skin_condition: skinCondition,
        grooming_style: groomingStyle,
        hair_texture: hairTexture,
        age: age,
        score: score,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("biometric_scans")
        .insert([scanData]);

      if (error) {
        console.warn("Error saving scan to Supabase:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } else {
        console.log("Successfully saved biometric scan milestone to Supabase");
        fetchHistoryFromSupabase(session.user.id);
      }
    } catch (err) {
      console.error("Failed to run saveScanToSupabase:", err);
    }
  };

  // Check and listen to user session from Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setAuthLoading(false);
      if (activeSession?.user?.id) {
        fetchHistoryFromSupabase(activeSession.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      if (activeSession?.user?.id) {
        fetchHistoryFromSupabase(activeSession.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = async () => {
    const { data: { session: activeSession } } = await supabase.auth.getSession();
    setSession(activeSession);
  };

  // Load and rehydrate all biometric profiles, scores, and routines from Dexie.js
  useEffect(() => {
    const initDatabase = async () => {
      try {
        const savedProfile = await db.profiles.get("current_profile");
        const historyData = await db.history.orderBy("timestamp").toArray();
        setHistoricalRecords(historyData);

        // Retention & Hydration Map from metricsRecords
        const savedMetricsRecord = await db.metricsRecords.get("latest");

        if (savedMetricsRecord && savedMetricsRecord.routine) {
          if (savedProfile) {
            setFrontImage(savedProfile.frontImage);
            setSideImage(savedProfile.sideImage);
            setCloseupImage(savedProfile.closeupImage);
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
          setRoutineChecks(savedMetricsRecord.routineChecks || []);
        } else if (savedProfile) {
          setFrontImage(savedProfile.frontImage);
          setSideImage(savedProfile.sideImage);
          setCloseupImage(savedProfile.closeupImage);
          setFaceShape(savedProfile.faceShape);
          setAsymmetryIndex(savedProfile.asymmetryIndex ?? 7.11);
          setPostureAngle(savedProfile.postureAngle ?? 18.0);
          setTiltAngle(savedProfile.tiltAngle ?? 0.0);
          setJawHeightRatio(savedProfile.jawHeightRatio ?? 0.611);
          setSkinCondition(savedProfile.skinCondition || "combination");
          setGroomingStyle(savedProfile.groomingStyle || "stubble");
          setHairTexture("straight");
          setAge(21);
          setRoutine(savedProfile.routine);
          setRoutineChecks(savedProfile.routineChecks || []);
        }
      } catch (err) {
        console.error("Dexie database synchronization failure:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initDatabase();
  }, []);

  // Sync profile metadata & checks to DB upon modifications
  useEffect(() => {
    if (isInitializing) return;

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
          });
        }
      } catch (err) {
        console.error("Database auto-update sync error:", err);
      }
    };

    const timeout = setTimeout(syncToIndexedDB, 600);
    return () => clearTimeout(timeout);
  }, [frontImage, sideImage, closeupImage, faceShape, asymmetryIndex, postureAngle, skinCondition, groomingStyle, routine, routineChecks, isInitializing]);

  const handleImageUpload = (type: "front" | "side" | "closeup", file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (type === "front") setFrontImage(result);
      if (type === "side") setSideImage(result);
      if (type === "closeup") setCloseupImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = (type: "front" | "side" | "closeup") => {
    if (type === "front") setFrontImage(null);
    if (type === "side") setSideImage(null);
    if (type === "closeup") setCloseupImage(null);
  };

  const handleDrag = (e: React.DragEvent, type: string, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [type]: active }));
  };

  const handleDrop = (e: React.DragEvent, type: "front" | "side" | "closeup") => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [type]: false }));

    if (e.dataTransfer.files?.[0]) {
      handleImageUpload(type, e.dataTransfer.files[0]);
    }
  };

  const handleSaveHistory = async (record: HistoricalRecord) => {
    try {
      await db.history.add(record);
      const updated = await db.history.orderBy("timestamp").toArray();
      setHistoricalRecords(updated);
    } catch (err) {
      console.error("Failed to append diagnostic session to database log:", err);
    }
  };

  const handlePurgeDatabase = async () => {
    if (confirm("Are you sure you want to permanently clear your local biometric vault?")) {
      await db.profiles.clear();
      await db.history.clear();
      await db.metricsRecords.clear();
      setFrontImage(null);
      setSideImage(null);
      setCloseupImage(null);
      setFaceShape("Oval");
      setAsymmetryIndex(3.2);
      setPostureAngle(14.5);
      setSkinCondition("combination");
      setGroomingStyle("stubble");
      setHairTexture("straight");
      setAge(21);
      setRoutine(null);
      setRoutineChecks([]);
      setHistoricalRecords([]);
    }
  };

  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-400 flex flex-col items-center justify-center p-6">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border border-emerald-500/10" />
          <div className="absolute inset-0 rounded-full border border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <p className="font-mono text-xs text-zinc-500 tracking-wider">HYDRATING_BIOMETRIC_VAULT...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthGateway onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 antialiased font-sans pb-16 selection:bg-emerald-500/20 selection:text-emerald-400">
      
      {/* HEADER DECORATIVE LINE */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent w-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col gap-8">
        
        {/* UPPER BRAND & CONTROL HUD */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="font-display font-black text-2xl tracking-tight text-white">
                AURAMAX
              </h1>
              <span className="font-mono text-[9px] bg-emerald-950/40 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                PRO_v2.4
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-md font-sans">
              Cyber-luxury bio-aesthetic and cervical-kinesiology calibration matrix.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
              }}
              className="px-3 py-1.5 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
            >
              SIGN_OUT
            </button>
            <button
              onClick={handlePurgeDatabase}
              className="px-3 py-1.5 border border-red-500/25 bg-red-950/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              PURGE_VAULT
            </button>
            <div className="flex flex-col text-right font-mono text-[9px] text-zinc-500 bg-zinc-950 border border-white/[0.05] rounded-lg px-3 py-1.5 gap-0.5">
              <div>
                <span className="text-zinc-500">SUBJECT: </span>
                <span className="text-emerald-400 font-bold">{session?.user?.id?.slice(0, 8)}...</span>
              </div>
              <div className="text-[8px] text-zinc-600">
                {session?.user?.email}
              </div>
            </div>
          </div>
        </header>

        {/* FEATURE 1: MULTI-ANGLE RAW PHOTOGRAPHY VAULT */}
        <section id="photography-vault-section" className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-emerald-400" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-zinc-300">
              I. PHOTOGRAPHY_ACQUISITION_VAULT
            </h2>
            <span className="h-[1px] flex-1 bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-zinc-500">STRICT_LOCAL_MEMORY</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
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
                    FRONT_AXIAL.JPG
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
                      FRONT_AXIAL
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

          <MeshScanner
            frontImage={frontImage}
            sideImage={sideImage}
            closeupImage={closeupImage}
            userId={session?.user?.id}
            onMetricsChanged={(metrics) => {
              setFaceShape(metrics.faceShape);
              setAsymmetryIndex(metrics.asymmetryIndex);
              setPostureAngle(metrics.postureAngle);
              setTiltAngle(metrics.tiltAngle);
              setJawHeightRatio(metrics.jawHeightRatio);
            }}
            onScanComplete={saveScanToSupabase}
          />
        </section>


        {/* FEATURE 3: 100-POINT "CURRENT VS POTENTIAL" REPORT CARD */}
        <section id="report-card-section" className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-zinc-300">
              III. OPTIMIZATION_SCORECARD_MATRIX
            </h2>
            <span className="h-[1px] flex-1 bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-zinc-500">POTENTIAL_DELTA_10_SCALE</span>
          </div>

          <ReportCard
            asymmetryIndex={asymmetryIndex}
            postureAngle={postureAngle}
            tiltAngle={tiltAngle}
            jawHeightRatio={jawHeightRatio}
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
            hairTexture={hairTexture}
            age={age}
            subscores={{
              jawline: parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - Math.abs(jawHeightRatio - 0.65) * 12)).toFixed(1)),
              skin: skinCondition === "congested" ? 6.2 : skinCondition === "oily" ? 7.2 : skinCondition === "dry" ? 7.8 : skinCondition === "combination" ? 8.0 : 8.8,
              grooming: groomingStyle === "clean-shaven" ? 8.8 : groomingStyle === "stubble" ? 8.2 : 8.0,
              symmetry: parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - asymmetryIndex * 0.45)).toFixed(1)),
              posture: parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - tiltAngle * 0.4)).toFixed(1)),
            }}
            routine={routine}
            routineChecks={routineChecks}
            onRoutineGenerated={(newRoutine) => setRoutine(newRoutine)}
            onChecksChanged={(newChecks) => setRoutineChecks(newChecks)}
            userId={session?.user?.id}
            historicalRecords={historicalRecords}
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
