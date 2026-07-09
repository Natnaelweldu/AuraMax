"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  Trash2, 
  Cpu, 
  RefreshCw, 
  AlertTriangle,
  Activity,
  ShieldCheck,
  Maximize2,
  Sliders,
  Play,
  Pause,
  Anchor,
  Sparkles,
  Info,
  Upload,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { db } from "@/lib/db";

interface Point2D {
  id: string;
  label: string;
  x: number; // percentage 0-100 of image width
  y: number; // percentage 0-100 of image height
}

export default function ScannerPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  // Viewport Router State: 'front' (Front Mesh Landmark) or 'side' (Lateral Align Posture)
  const [activeTab, setActiveTab] = useState<"front" | "side">("front");

  // Node Calibration Mode: Live video vs frozen interactive calibration mesh
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Webcam stream control states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Simulated live feed parameters in case camera is blocked or unavailable
  const [simulatedAngle, setSimulatedAngle] = useState(0);

  // 11-Point Front Profile Nodes (State stored as percentages 0-100)
  const [frontPoints, setFrontPoints] = useState<Point2D[]>([
    { id: "forehead", label: "Forehead Center", x: 50.0, y: 22.0 },
    { id: "nose_tip", label: "Nose Tip", x: 50.0, y: 56.0 },
    { id: "chin_tip", label: "Chin Apex", x: 50.0, y: 88.0 },
    { id: "l_temple", label: "Left Temple", x: 31.0, y: 34.0 },
    { id: "r_temple", label: "Right Temple", x: 69.0, y: 34.0 },
    { id: "l_eye", label: "Left Eye", x: 38.0, y: 46.0 },
    { id: "r_eye", label: "Right Eye", x: 62.0, y: 46.0 },
    { id: "l_cheek", label: "Left Cheekbone", x: 26.0, y: 58.0 },
    { id: "r_cheek", label: "Right Cheekbone", x: 74.0, y: 58.0 },
    { id: "l_jaw", label: "Left Gonial Angle", x: 32.0, y: 78.0 },
    { id: "r_jaw", label: "Right Gonial Angle", x: 68.0, y: 78.0 },
  ]);

  // 5-Point Lateral Profile Nodes (State stored as percentages 0-100)
  const [sidePoints, setSidePoints] = useState<Point2D[]>([
    { id: "tragus", label: "Ear Tragus Anchor", x: 44.0, y: 46.0 },
    { id: "acromion", label: "Shoulder Acromion Joint", x: 38.0, y: 88.0 },
    { id: "nose", label: "Nasal Apex", x: 66.0, y: 49.0 },
    { id: "chin", label: "Chin Projection", x: 61.0, y: 64.0 },
    { id: "neck", label: "Cervicothoracic Base", x: 46.0, y: 76.0 },
  ]);

  // Point dragging tracking state
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);

  // Dynamic Telemetry State Variables
  const [faceShape, setFaceShape] = useState("Oval");
  const [asymmetryIndex, setAsymmetryIndex] = useState(4.25);
  const [postureAngle, setPostureAngle] = useState(14.5);
  const [tiltAngle, setTiltAngle] = useState(14.5);
  const [jawHeightRatio, setJawHeightRatio] = useState(0.611);

  // Standard static properties loaded from profile during hydration
  const [skinCondition, setSkinCondition] = useState<string>("combination");
  const [groomingStyle, setGroomingStyle] = useState<string>("stubble");
  const [hairTexture, setHairTexture] = useState<string>("straight");
  const [age, setAge] = useState<number>(21);
  const [savingRecord, setSavingRecord] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Custom multi-mode scan requirements & permission states
  const [scanMode, setScanMode] = useState<"webcam" | "upload">("webcam");
  const [cameraRequested, setCameraRequested] = useState(false);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [closeupImage, setCloseupImage] = useState<string | null>(null);
  const [activeRequirement, setActiveRequirement] = useState<"front" | "side" | "closeup">("front");

  // Verify Auth Session
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

  // Load and rehydrate from Dexie (IndexedDB)
  useEffect(() => {
    if (!session) return;

    const initDatabase = async () => {
      try {
        const savedProfile = await db.profiles.get("current_profile");
        const savedMetricsRecord = await db.metricsRecords.get("latest");

        if (savedProfile) {
          setFrontImage(savedProfile.frontImage || null);
          setSideImage(savedProfile.sideImage || null);
          setCloseupImage(savedProfile.closeupImage || null);
        }

        if (savedMetricsRecord) {
          setFaceShape(savedMetricsRecord.faceShape || "Oval");
          setPostureAngle(savedMetricsRecord.forwardHeadAngle || 14.5);
          setSkinCondition(savedMetricsRecord.skinCondition || "combination");
          setGroomingStyle(savedMetricsRecord.groomingStyle || "stubble");
          setHairTexture(savedMetricsRecord.hairTexture || "straight");
          setAge(savedMetricsRecord.age || 21);
          if (savedProfile) {
            setAsymmetryIndex(savedProfile.asymmetryIndex ?? 4.25);
            setTiltAngle(savedProfile.tiltAngle ?? 14.5);
            setJawHeightRatio(savedProfile.jawHeightRatio ?? 0.611);
          }
        } else if (savedProfile) {
          setFaceShape(savedProfile.faceShape || "Oval");
          setAsymmetryIndex(savedProfile.asymmetryIndex ?? 4.25);
          setPostureAngle(savedProfile.postureAngle ?? 14.5);
          setTiltAngle(savedProfile.tiltAngle ?? 14.5);
          setJawHeightRatio(savedProfile.jawHeightRatio ?? 0.611);
          setSkinCondition(savedProfile.skinCondition || "combination");
          setGroomingStyle(savedProfile.groomingStyle || "stubble");
        }
      } catch (err) {
        console.error("Dexie database initialization error on scanner page:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initDatabase();
  }, [session]);

  // Auto-sync computed scores back to Dexie Database
  useEffect(() => {
    if (isInitializing || !session) return;

    const syncToIndexedDB = async () => {
      try {
        const rawSymmetry = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - asymmetryIndex * 0.45)).toFixed(1));
        const rawJawline = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - Math.abs(jawHeightRatio - 0.65) * 12)).toFixed(1));
        const rawPosture = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - tiltAngle * 0.4)).toFixed(1));
        
        let rawSkin = 8.0;
        if (skinCondition === "congested") rawSkin = 6.2;
        else if (skinCondition === "oily") rawSkin = 7.2;
        else if (skinCondition === "dry") rawSkin = 7.8;
        else if (skinCondition === "combination") rawSkin = 8.0;

        let rawGrooming = 8.2;
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
          frontImage: frontImage,
          sideImage: sideImage,
          closeupImage: closeupImage,
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
          routine: existingProfile?.routine ?? null,
          routineChecks: existingProfile?.routineChecks ?? [],
          lastUpdated: Date.now(),
        });
      } catch (err) {
        console.error("Database auto-update sync error in scanner:", err);
      }
    };

    const timeout = setTimeout(syncToIndexedDB, 600);
    return () => clearTimeout(timeout);
  }, [faceShape, asymmetryIndex, postureAngle, skinCondition, groomingStyle, isInitializing, session, jawHeightRatio, tiltAngle, frontImage, sideImage, closeupImage]);

  // Hardware-accelerated webcam initialization
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startWebcam() {
      try {
        setCameraError(null);
        const constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().catch(err => {
                console.warn("Video autostart blocked:", err);
              });
            }
          };
          setStreamActive(true);
        }
      } catch (err: any) {
        console.warn("Hardware webcam stream request blocked or unavailable:", err.message);
        setCameraError(err.message || "Camera access denied");
        setStreamActive(false);
      }
    }

    if (cameraRequested && !isInitializing) {
      startWebcam();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isInitializing, cameraRequested]);

  // Simulated breathing/movement cycle in case webcam is unavailable
  useEffect(() => {
    if (streamActive) return;

    const interval = setInterval(() => {
      setSimulatedAngle(prev => (prev + 0.05) % (Math.PI * 2));
    }, 30);

    return () => clearInterval(interval);
  }, [streamActive]);

  // Real-time Canvas overlay drawing loop (Concentric circles, sweep lines, metadata tags)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let sweepY = 0;
    let sweepDirection = 1;

    const drawLoop = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear with slight transparency for a glowing trail effect
      ctx.clearRect(0, 0, width, height);

      if (!isCalibrating) {
        // Draw cybernetic scanlines
        ctx.strokeStyle = "rgba(20, 184, 166, 0.12)";
        ctx.lineWidth = 1;
        for (let i = 0; i < height; i += 8) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(width, i);
          ctx.stroke();
        }

        // Draw animated sweeping scanner line
        ctx.strokeStyle = "rgba(20, 184, 166, 0.5)";
        ctx.shadowColor = "rgba(20, 184, 166, 0.8)";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, sweepY);
        ctx.lineTo(width, sweepY);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow

        sweepY += 2.5 * sweepDirection;
        if (sweepY >= height || sweepY <= 0) {
          sweepDirection *= -1;
        }

        // Draw crosshair/reticle HUD around center
        const centerX = width / 2;
        const centerY = height / 2;
        ctx.strokeStyle = "rgba(20, 184, 166, 0.25)";
        ctx.lineWidth = 1.5;
        
        // Concentric target circles
        ctx.beginPath();
        ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 140, 0, Math.PI * 2);
        ctx.setLineDash([4, 12]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Grid overlay lines
        ctx.strokeStyle = "rgba(20, 184, 166, 0.04)";
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Interactive corners
        const cornerLen = 15;
        ctx.strokeStyle = "rgba(20, 184, 166, 0.7)";
        ctx.lineWidth = 2;
        
        // Top Left
        ctx.beginPath();
        ctx.moveTo(20, 20 + cornerLen);
        ctx.lineTo(20, 20);
        ctx.lineTo(20 + cornerLen, 20);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(width - 20, 20 + cornerLen);
        ctx.lineTo(width - 20, 20);
        ctx.lineTo(width - 20 - cornerLen, 20);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(20, height - 20 - cornerLen);
        ctx.lineTo(20, height - 20);
        ctx.lineTo(20 + cornerLen, height - 20);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(width - 20, height - 20 - cornerLen);
        ctx.lineTo(width - 20, height - 20);
        ctx.lineTo(width - 20 - cornerLen, height - 20);
        ctx.stroke();

        // Text HUD parameters
        ctx.fillStyle = "rgba(20, 184, 166, 0.85)";
        ctx.font = "9px monospace";
        ctx.fillText("MATRIX: AXIAL_REALTIME", 30, 35);
        ctx.fillText("FPS: 60.0_DIRECT_FLOW", 30, 50);
        ctx.fillText(`MODE: ${activeTab === "front" ? "FRONT_MESH" : "LATERAL_POSTURE"}`, 30, 65);

        ctx.fillStyle = "rgba(59, 130, 246, 0.85)";
        ctx.fillText("DEC: 478_LNDMRK_LOOP", width - 150, 35);
        ctx.fillText("CALIBRATOR: STANDBY", width - 150, 50);
      } else {
        // Calibration Mode: static guides or frozen indicator
        ctx.fillStyle = "rgba(239, 68, 68, 0.7)";
        ctx.font = "9px monospace";
        ctx.fillText("MATRIX FRAME: FROZEN (CALIBRATING)", 30, 35);
        ctx.fillText("MANUAL REALIGNMENT ACTIVE", 30, 50);
      }

      animId = requestAnimationFrame(drawLoop);
    };

    drawLoop();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeTab, isCalibrating, streamActive]);

  // Math-Engine: Calculates real-time telemetry whenever nodes are moved
  useEffect(() => {
    if (activeTab === "front") {
      const p = (id: string) => frontPoints.find(pt => pt.id === id) || frontPoints[0];
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

      // Dimensions & Ratio
      const faceHeight = Math.abs(chin.y - forehead.y) || 1;
      const cheekWidth = Math.abs(rCheek.x - lCheek.x) || 1;
      const jawWidth = Math.abs(rJaw.x - lJaw.x) || 1;
      const foreheadWidth = Math.abs(rTemple.x - lTemple.x) || 1;
      const ratio = faceHeight / cheekWidth;
      const jawToCheekRatio = jawWidth / cheekWidth;

      // Classification
      let computedShape = "Oval";
      if (ratio < 1.15) {
        computedShape = "Round";
      } else if (ratio > 1.35) {
        computedShape = "Oblong";
      } else if (jawToCheekRatio > 0.85) {
        computedShape = "Square";
      } else if (jawToCheekRatio < 0.75 && foreheadWidth > cheekWidth * 0.9) {
        computedShape = "Heart";
      } else if (jawToCheekRatio < 0.75) {
        computedShape = "Diamond";
      } else {
        computedShape = "Oval";
      }
      setFaceShape(computedShape);

      // Midline axis (average of forehead, nose, chin)
      const midlineX = (forehead.x + nose.x + chin.x) / 3;
      const distToMidline = (pt: Point2D) => Math.abs(pt.x - midlineX);

      const templeDiff = Math.abs(distToMidline(lTemple) - distToMidline(rTemple));
      const eyeDiff = Math.abs(distToMidline(lEye) - distToMidline(rEye));
      const cheekDiff = Math.abs(distToMidline(lCheek) - distToMidline(rCheek));
      const jawDiff = Math.abs(distToMidline(lJaw) - distToMidline(rJaw));
      
      const calculatedAsymmetry = parseFloat(((templeDiff + eyeDiff + cheekDiff + jawDiff) * 0.75).toFixed(2)) || 2.01;
      setAsymmetryIndex(calculatedAsymmetry);

      const computedJawRatio = parseFloat((jawWidth / faceHeight).toFixed(3));
      setJawHeightRatio(computedJawRatio);
    } else {
      const p = (id: string) => sidePoints.find(pt => pt.id === id) || sidePoints[0];
      const tragus = p("tragus");
      const acromion = p("acromion");

      // Angle in degrees from tragus to shoulder acromion relative to vertical axis
      const dx = tragus.x - acromion.x;
      const dy = acromion.y - tragus.y;
      const angleRad = Math.atan2(Math.abs(dx), Math.abs(dy || 1));
      const angleDeg = parseFloat((angleRad * (180 / Math.PI)).toFixed(1)) || 14.5;
      
      setPostureAngle(angleDeg);
      setTiltAngle(angleDeg);
    }
  }, [frontPoints, sidePoints, activeTab]);

  // Synchronize activeTab and activeRequirement bidirectionally
  useEffect(() => {
    if (activeRequirement === "front" && activeTab !== "front") {
      setActiveTab("front");
    } else if (activeRequirement === "side" && activeTab !== "side") {
      setActiveTab("side");
    }
  }, [activeRequirement]);

  useEffect(() => {
    if (activeTab === "front" && activeRequirement === "side") {
      setActiveRequirement("front");
    } else if (activeTab === "side" && activeRequirement === "front") {
      setActiveRequirement("side");
    }
  }, [activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "front" | "side" | "closeup") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === "front") {
        setFrontImage(dataUrl);
      } else if (type === "side") {
        setSideImage(dataUrl);
      } else {
        setCloseupImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, type: "front" | "side" | "closeup") => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === "front") {
        setFrontImage(dataUrl);
      } else if (type === "side") {
        setSideImage(dataUrl);
      } else {
        setCloseupImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = (type: "front" | "side" | "closeup") => {
    if (type === "front") {
      setFrontImage(null);
    } else if (type === "side") {
      setSideImage(null);
    } else {
      setCloseupImage(null);
    }
  };

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video || !streamActive) return;

    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = video.videoWidth || 640;
      tempCanvas.height = video.videoHeight || 480;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const dataUrl = tempCanvas.toDataURL("image/jpeg");
        
        if (activeRequirement === "front") {
          setFrontImage(dataUrl);
        } else if (activeRequirement === "side") {
          setSideImage(dataUrl);
        } else {
          setCloseupImage(dataUrl);
        }
      }
    } catch (e) {
      console.error("Failed to capture webcam snapshot:", e);
    }
  };

  const getCurrentImage = () => {
    if (activeRequirement === "front") return frontImage;
    if (activeRequirement === "side") return sideImage;
    return closeupImage;
  };
  const currentImage = getCurrentImage();

  // Pointer event handlers for custom SVG node drag-calibration
  const handlePointerDown = (id: string) => {
    if (!isCalibrating) return;
    setDraggedPointId(id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedPointId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    // Boundary constraints 0-100%
    const constrainedX = parseFloat(Math.max(0, Math.min(100, rawX)).toFixed(2));
    const constrainedY = parseFloat(Math.max(0, Math.min(100, rawY)).toFixed(2));

    if (activeTab === "front") {
      setFrontPoints(prev =>
        prev.map(pt => pt.id === draggedPointId ? { ...pt, x: constrainedX, y: constrainedY } : pt)
      );
    } else {
      setSidePoints(prev =>
        prev.map(pt => pt.id === draggedPointId ? { ...pt, x: constrainedX, y: constrainedY } : pt)
      );
    }
  };

  const handlePointerUp = () => {
    setDraggedPointId(null);
  };

  // Toggle node calibration modes (freezing/unfreezing camera feed)
  const toggleCalibrationMode = () => {
    if (isCalibrating) {
      // Unfreeze / Resume live play
      if (videoRef.current && streamActive) {
        videoRef.current.play().catch(err => console.warn(err));
      }
      setIsCalibrating(false);
    } else {
      // Freeze / Pause video playback
      if (videoRef.current && streamActive) {
        videoRef.current.pause();
      }
      setIsCalibrating(true);
    }
  };

  // Save calibrated baseline results to database
  const handleSaveCalibrationRecord = async () => {
    if (!session?.user?.id) return;
    setSavingRecord(true);
    setSaveStatus(null);

    try {
      const rawSymmetry = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - asymmetryIndex * 0.45)).toFixed(1));
      const rawJawline = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - Math.abs(jawHeightRatio - 0.65) * 12)).toFixed(1));
      const rawPosture = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - tiltAngle * 0.4)).toFixed(1));
      
      let rawSkin = 8.0;
      if (skinCondition === "congested") rawSkin = 6.2;
      else if (skinCondition === "oily") rawSkin = 7.2;
      else if (skinCondition === "dry") rawSkin = 7.8;
      else if (skinCondition === "combination") rawSkin = 8.0;

      let rawGrooming = 8.2;
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
        console.warn("Could not push scan record to remote database:", error);
      }

      // Add a physical milestone history entry in Dexie too
      await db.history.add({
        timestamp: Date.now(),
        score: score,
        asymmetryIndex: asymmetryIndex,
        postureAngle: postureAngle,
        tiltAngle: tiltAngle,
        jawHeightRatio: jawHeightRatio,
        subscores: {
          jawline: rawJawline,
          skin: rawSkin,
          grooming: rawGrooming,
          symmetry: rawSymmetry,
          posture: rawPosture
        }
      });

      setSaveStatus("SUCCESS: CALIBRATION_COMMITTED");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus("ERROR_SYNC_FAILED");
    } finally {
      setSavingRecord(false);
    }
  };

  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-[#0d0e12] text-zinc-400 flex flex-col items-center justify-center p-6">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border border-teal-500/10" />
          <div className="absolute inset-0 rounded-full border border-teal-500 border-t-transparent animate-spin" />
        </div>
        <p className="font-mono text-xs text-zinc-500 tracking-wider">SECURE_CHAMBER_LOAD...</p>
      </div>
    );
  }

  // Calculated posture load
  const estimatedCervicalForce = parseFloat((5.0 + (postureAngle * 0.9)).toFixed(1));
  const postureStrainIndex = parseFloat((postureAngle / 10).toFixed(2));

  // Visual helper links for SVG front connections
  const renderInteractiveSVGFront = () => {
    const p = (id: string) => frontPoints.find(pt => pt.id === id) || frontPoints[0];
    const midlineX = (p("forehead").x + p("nose_tip").x + p("chin_tip").x) / 3;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-accent-mint/40 fill-none stroke-[1] z-10">
        {/* Midline guide */}
        <line
          x1={`${midlineX}%`}
          y1="5%"
          x2={`${midlineX}%`}
          y2="95%"
          strokeDasharray="4,4"
          className="stroke-accent-mint/15"
        />

        {/* Symmetric horizontal guides */}
        <line x1={`${p("l_temple").x}%`} y1={`${p("l_temple").y}%`} x2={`${p("r_temple").x}%`} y2={`${p("r_temple").y}%`} strokeDasharray="2,3" className="stroke-zinc-500/30" />
        <line x1={`${p("l_eye").x}%`} y1={`${p("l_eye").y}%`} x2={`${p("r_eye").x}%`} y2={`${p("r_eye").y}%`} strokeDasharray="2,3" className="stroke-zinc-500/30" />
        <line x1={`${p("l_cheek").x}%`} y1={`${p("l_cheek").y}%`} x2={`${p("r_cheek").x}%`} y2={`${p("r_cheek").y}%`} strokeDasharray="2,3" className="stroke-zinc-500/30" />
        <line x1={`${p("l_jaw").x}%`} y1={`${p("l_jaw").y}%`} x2={`${p("r_jaw").x}%`} y2={`${p("r_jaw").y}%`} strokeDasharray="2,3" className="stroke-zinc-500/30" />

        {/* Outer perimeter outline */}
        <path
          d={`M ${p("forehead").x} ${p("forehead").y} 
             L ${p("r_temple").x} ${p("r_temple").y} 
             L ${p("r_cheek").x} ${p("r_cheek").y} 
             L ${p("r_jaw").x} ${p("r_jaw").y} 
             L ${p("chin_tip").x} ${p("chin_tip").y} 
             L ${p("l_jaw").x} ${p("l_jaw").y} 
             L ${p("l_cheek").x} ${p("l_cheek").y} 
             L ${p("l_temple").x} ${p("l_temple").y} Z`}
          className="stroke-accent-mint/40"
        />

        {/* Connection networks */}
        <line x1={`${p("forehead").x}%`} y1={`${p("forehead").y}%`} x2={`${p("l_eye").x}%`} y2={`${p("l_eye").y}%`} />
        <line x1={`${p("forehead").x}%`} y1={`${p("forehead").y}%`} x2={`${p("r_eye").x}%`} y2={`${p("r_eye").y}%`} />
        <line x1={`${p("l_temple").x}%`} y1={`${p("l_temple").y}%`} x2={`${p("l_eye").x}%`} y2={`${p("l_eye").y}%`} />
        <line x1={`${p("r_temple").x}%`} y1={`${p("r_temple").y}%`} x2={`${p("r_eye").x}%`} y2={`${p("r_eye").y}%`} />
        <line x1={`${p("l_eye").x}%`} y1={`${p("l_eye").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />
        <line x1={`${p("r_eye").x}%`} y1={`${p("r_eye").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />
        <line x1={`${p("l_cheek").x}%`} y1={`${p("l_cheek").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />
        <line x1={`${p("r_cheek").x}%`} y1={`${p("r_cheek").y}%`} x2={`${p("nose_tip").x}%`} y2={`${p("nose_tip").y}%`} />
        <line x1={`${p("l_jaw").x}%`} y1={`${p("l_jaw").y}%`} x2={`${p("chin_tip").x}%`} y2={`${p("chin_tip").y}%`} />
        <line x1={`${p("r_jaw").x}%`} y1={`${p("r_jaw").y}%`} x2={`${p("chin_tip").x}%`} y2={`${p("chin_tip").y}%`} />
      </svg>
    );
  };

  // Visual helper links for SVG side connections
  const renderInteractiveSVGSide = () => {
    const p = (id: string) => sidePoints.find(pt => pt.id === id) || sidePoints[0];
    const tragus = p("tragus");
    const acromion = p("acromion");

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-accent-blue/40 fill-none stroke-[1.25] z-10">
        {/* Plumb gravity alignment guide */}
        <line
          x1={`${acromion.x}%`}
          y1="5%"
          x2={`${acromion.x}%`}
          y2={`${acromion.y}%`}
          strokeDasharray="4,4"
          className="stroke-red-500/30"
        />

        {/* Cervical vector link */}
        <line
          x1={`${acromion.x}%`}
          y1={`${acromion.y}%`}
          x2={`${tragus.x}%`}
          y2={`${tragus.y}%`}
          className="stroke-accent-blue stroke-[1.75]"
        />

        {/* Strain indicator shading */}
        <path
          d={`M ${acromion.x} ${acromion.y - 40} A 40 40 0 0 ${tragus.x < acromion.x ? 0 : 1} ${tragus.x} ${tragus.y}`}
          className="stroke-accent-blue/15 fill-accent-blue/5"
        />

        {/* Face indicators mapping */}
        <line x1={`${p("tragus").x}%`} y1={`${p("tragus").y}%`} x2={`${p("nose").x}%`} y2={`${p("nose").y}%`} strokeDasharray="2,3" />
        <line x1={`${p("nose").x}%`} y1={`${p("nose").y}%`} x2={`${p("chin").x}%`} y2={`${p("chin").y}%`} />
        <line x1={`${p("chin").x}%`} y1={`${p("chin").y}%`} x2={`${p("neck").x}%`} y2={`${p("neck").y}%`} />
        <line x1={`${p("neck").x}%`} y1={`${p("neck").y}%`} x2={`${p("acromion").x}%`} y2={`${p("acromion").y}%`} />
      </svg>
    );
  };

  const activePoints = activeTab === "front" ? frontPoints : sidePoints;

  return (
    <div className="min-h-screen bg-[#0d0e12] text-zinc-300 antialiased font-sans pb-16 px-4 sm:px-6 lg:px-8 pt-8 relative overflow-hidden">
      
      {/* Cybernetic ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-mint/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-accent-blue/[0.03] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
        
        {/* Dynamic Navigation Header */}
        <header className="pb-4 border-b border-white/[0.05] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse" />
              <h1 className="font-display font-black text-xl tracking-tight text-white uppercase">
                Acquisition & Diagnostic Chamber
              </h1>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1 uppercase">
              Isolated Computer Vision Loop / Real-time Calibrated Landmarks
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-[10px] text-zinc-500 bg-[#12141c] border border-white/[0.04] px-2.5 py-1 rounded-lg">
              CORE_STREAM: <span className={streamActive ? "text-accent-mint" : "text-yellow-500"}>{streamActive ? "LOCAL_WEBCAM_60FPS" : "FALLBACK_VECTOR_SIM"}</span>
            </span>
          </div>
        </header>

        {/* Viewport Router Tab Selection */}
        <div className="flex flex-col md:flex-row gap-6 items-start lg:items-stretch">
          
          {/* LEFT COLUMN: THE CHAMBER FEED */}
          <div className="flex-1 flex flex-col gap-4 w-full">
            
            {/* Scan Mode Toggle */}
            <div className="flex bg-[#12141c]/40 border border-white/[0.04] p-1 rounded-xl mb-1.5 backdrop-blur-md">
              <button
                onClick={() => setScanMode("webcam")}
                className={`flex-1 py-2 px-4 rounded-lg font-mono text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  scanMode === "webcam"
                    ? "bg-gradient-to-r from-accent-mint/10 to-accent-mint/20 border border-accent-mint/30 text-accent-mint shadow-[0_0_12px_rgba(20,184,166,0.1)]"
                    : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Live Webcam Scan
              </button>
              <button
                onClick={() => setScanMode("upload")}
                className={`flex-1 py-2 px-4 rounded-lg font-mono text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  scanMode === "upload"
                    ? "bg-gradient-to-r from-accent-blue/10 to-accent-blue/20 border border-accent-blue/30 text-accent-blue shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                    : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Photo Upload Scan
              </button>
            </div>

            {/* Three Requirements Tracker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Front Face Scan */}
              <div 
                onClick={() => {
                  setActiveRequirement("front");
                  setActiveTab("front");
                }}
                className={`bg-[#12141c]/50 p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  activeRequirement === "front" 
                    ? "border-accent-mint/40 shadow-[0_0_15px_rgba(20,184,166,0.06)] bg-[#12141c]/80" 
                    : "border-white/[0.04] hover:border-white/[0.08]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {frontImage ? (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-accent-mint/30 bg-zinc-950 shrink-0">
                      <img src={frontImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-dashed border-white/[0.1] flex items-center justify-center text-zinc-600 bg-zinc-950 shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <div className="text-[8px] font-mono tracking-wider text-zinc-500 uppercase leading-none mb-1">Step 1</div>
                    <h3 className="font-display font-bold text-[11px] text-white leading-none">FRONT_MESH</h3>
                  </div>
                </div>
                <div>
                  {frontImage ? (
                    <span className="text-[8px] font-mono bg-accent-mint/10 border border-accent-mint/20 text-accent-mint px-1.5 py-0.5 rounded-full">READY</span>
                  ) : (
                    <span className="text-[8px] font-mono bg-zinc-900 border border-white/[0.04] text-zinc-500 px-1.5 py-0.5 rounded-full">REQ</span>
                  )}
                </div>
              </div>

              {/* Card 2: Lateral Profile */}
              <div 
                onClick={() => {
                  setActiveRequirement("side");
                  setActiveTab("side");
                }}
                className={`bg-[#12141c]/50 p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  activeRequirement === "side" 
                    ? "border-accent-blue/40 shadow-[0_0_15px_rgba(59,130,246,0.06)] bg-[#12141c]/80" 
                    : "border-white/[0.04] hover:border-white/[0.08]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {sideImage ? (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-accent-blue/30 bg-zinc-950 shrink-0">
                      <img src={sideImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-dashed border-white/[0.1] flex items-center justify-center text-zinc-600 bg-zinc-950 shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <div className="text-[8px] font-mono tracking-wider text-zinc-500 uppercase leading-none mb-1">Step 2</div>
                    <h3 className="font-display font-bold text-[11px] text-white leading-none">LATERAL_ALIGN</h3>
                  </div>
                </div>
                <div>
                  {sideImage ? (
                    <span className="text-[8px] font-mono bg-accent-blue/10 border border-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded-full">READY</span>
                  ) : (
                    <span className="text-[8px] font-mono bg-zinc-900 border border-white/[0.04] text-zinc-500 px-1.5 py-0.5 rounded-full">REQ</span>
                  )}
                </div>
              </div>

              {/* Card 3: Upclose View */}
              <div 
                onClick={() => {
                  setActiveRequirement("closeup");
                }}
                className={`bg-[#12141c]/50 p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  activeRequirement === "closeup" 
                    ? "border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.06)] bg-[#12141c]/80" 
                    : "border-white/[0.04] hover:border-white/[0.08]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {closeupImage ? (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-purple-500/30 bg-zinc-950 shrink-0">
                      <img src={closeupImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-dashed border-white/[0.1] flex items-center justify-center text-zinc-600 bg-zinc-950 shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <div className="text-[8px] font-mono tracking-wider text-zinc-500 uppercase leading-none mb-1">Step 3</div>
                    <h3 className="font-display font-bold text-[11px] text-white leading-none">CLOSEUP_VIEW</h3>
                  </div>
                </div>
                <div>
                  {closeupImage ? (
                    <span className="text-[8px] font-mono bg-purple-500/10 border border-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">READY</span>
                  ) : (
                    <span className="text-[8px] font-mono bg-zinc-900 border border-white/[0.04] text-zinc-500 px-1.5 py-0.5 rounded-full">REQ</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Viewport Router Segment Controller */}
            <div className="flex items-center justify-between bg-[#12141c]/50 p-1.5 rounded-xl border border-white/[0.05] backdrop-blur-md">
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setActiveTab("front");
                    setActiveRequirement("front");
                    setIsCalibrating(false);
                  }}
                  className={`px-4 py-2 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                    activeTab === "front"
                      ? "bg-gradient-to-r from-accent-mint/10 to-accent-mint/20 border border-accent-mint/30 text-accent-mint shadow-[0_0_12px_rgba(20,184,166,0.1)]"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  I. FRONT_MESH_LANDMARK
                </button>
                <button
                  onClick={() => {
                    setActiveTab("side");
                    setActiveRequirement("side");
                    setIsCalibrating(false);
                  }}
                  className={`px-4 py-2 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                    activeTab === "side"
                      ? "bg-gradient-to-r from-accent-blue/10 to-accent-blue/20 border border-accent-blue/30 text-accent-blue shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  II. LATERAL_ALIGN_POSTURE
                </button>
              </div>

              {/* Action Toolbar buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleCalibrationMode}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider border transition-all cursor-pointer ${
                    isCalibrating
                      ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                      : "bg-[#090a0f] border-white/[0.08] text-accent-mint hover:bg-white/[0.02]"
                  }`}
                >
                  {isCalibrating ? (
                    <>
                      <Pause className="w-3 h-3" />
                      UNFREEZE_FEED
                    </>
                  ) : (
                    <>
                      <Sliders className="w-3 h-3" />
                      CALIBRATE_NODES
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* THE LIVE CANVAS FRAMEWORK */}
            <div 
              ref={containerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="relative aspect-video w-full rounded-2xl border border-white/[0.06] bg-[#090a0f] overflow-hidden shadow-2xl group flex items-center justify-center select-none touch-none"
            >
              
              {/* Actual Hardware video element */}
              {scanMode === "webcam" && cameraRequested && !currentImage && (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    streamActive ? "opacity-75" : "opacity-0"
                  }`}
                />
              )}

              {/* Display Captured or Uploaded Image */}
              {currentImage && (
                <img 
                  src={currentImage} 
                  alt="Biometric Capture Target" 
                  className="absolute inset-0 w-full h-full object-cover opacity-75 z-10 animate-fade-in"
                  referrerPolicy="no-referrer"
                />
              )}

              {/* Request Camera Permission Overlay */}
              {scanMode === "webcam" && !cameraRequested && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md p-6 text-center z-20">
                  <div className="w-14 h-14 rounded-full bg-accent-mint/10 border border-accent-mint/30 flex items-center justify-center mb-4 text-accent-mint shadow-[0_0_15px_rgba(20,184,166,0.15)] animate-pulse">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-1.5">
                    Webcam Connection Required
                  </h3>
                  <p className="text-[11px] text-zinc-400 max-w-xs mb-5 leading-relaxed">
                    To execute real-time axial tracking and mesh mapping, please grant this secure chamber permission to access your local camera.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCameraRequested(true)}
                    className="bg-gradient-to-r from-accent-mint to-accent-blue text-zinc-950 hover:from-teal-400 hover:to-blue-400 font-mono text-[10px] font-bold uppercase tracking-wider py-2.5 px-5 rounded-lg shadow-[0_0_20px_rgba(20,184,166,0.2)] transition-all cursor-pointer"
                  >
                    Initialize Webcam Stream
                  </button>
                </div>
              )}

              {/* Photo Upload Target Area Overlay */}
              {scanMode === "upload" && !currentImage && (
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, activeRequirement)}
                  onClick={() => {
                    const el = document.getElementById(`upload-input-${activeRequirement}`);
                    if (el) el.click();
                  }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-[#090a0f] p-6 text-center z-20 cursor-pointer border-2 border-dashed border-white/[0.05] hover:border-accent-mint/20 hover:bg-white/[0.01] transition-all rounded-2xl m-3 animate-fade-in"
                >
                  <input 
                    type="file"
                    id={`upload-input-${activeRequirement}`}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, activeRequirement)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="w-14 h-14 rounded-full bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center mb-4 text-accent-blue shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-1.5">
                    Upload {activeRequirement === "front" ? "Front Profile" : activeRequirement === "side" ? "Lateral Posture" : "Upclose Biometric"} Photo
                  </h3>
                  <p className="text-[11px] text-zinc-400 max-w-xs mb-3 leading-relaxed">
                    Drag & drop your image directly here, or <span className="text-accent-mint underline font-mono">BROWSE_FILES</span>.
                  </p>
                  <span className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase">
                    JPEG, PNG / MAX SIZE: 10MB
                  </span>
                </div>
              )}

              {/* Floating Camera Capture Button */}
              {scanMode === "webcam" && cameraRequested && streamActive && !currentImage && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="bg-gradient-to-r from-accent-mint to-accent-blue text-zinc-950 hover:from-teal-400 hover:to-blue-400 px-5 py-2.5 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(20,184,166,0.3)] cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    CAPTURE {activeRequirement.toUpperCase()}_SNAPSHOT
                  </button>
                </div>
              )}

              {/* Floating Photo Retake / Clear Button */}
              {currentImage && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                  <button
                    type="button"
                    onClick={() => handleClearImage(activeRequirement)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {scanMode === "webcam" ? "RETAKE_SNAPSHOT" : "REMOVE_IMAGE"}
                  </button>
                </div>
              )}

              {/* High-Fidelity 3D Vector simulation grid if webcam is unavailable */}
              {!streamActive && !currentImage && !(scanMode === "upload" && !currentImage) && !(scanMode === "webcam" && !cameraRequested) && (
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-radial-gradient">
                  {/* Digital horizon grid line */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_16px] [mask-image:linear-gradient(to_bottom,black,transparent)] pointer-events-none" />
                  
                  {/* Graphic Blueprint projection outline */}
                  <div 
                    className="relative w-72 h-72 rounded-full border border-white/[0.02] flex items-center justify-center transition-all duration-300"
                    style={{
                      transform: `rotateX(${Math.sin(simulatedAngle) * 6}deg) rotateY(${Math.cos(simulatedAngle) * 8}deg)`,
                      perspective: "500px"
                    }}
                  >
                    <div className="absolute w-[220px] h-[280px] border border-accent-mint/10 rounded-[110px] flex items-center justify-center">
                      <div className="w-[180px] h-[220px] border border-accent-blue/5 rounded-full" />
                    </div>
                    
                    {/* Glowing coordinate nodes overlay mapping */}
                    <div className="absolute w-2 h-2 rounded-full bg-accent-mint shadow-[0_0_8px_#14b8a6] animate-ping" />
                    <div className="absolute w-1.5 h-1.5 rounded-full bg-accent-mint" />
                    <div className="absolute -translate-x-12 -translate-y-8 w-1 h-1 rounded-full bg-accent-blue/30" />
                    <div className="absolute translate-x-12 -translate-y-8 w-1 h-1 rounded-full bg-accent-blue/30" />
                  </div>

                  {/* Notification card indicating simulated stream */}
                  <div className="absolute bottom-4 left-4 bg-yellow-500/5 border border-yellow-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-xs backdrop-blur-md">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    <span className="text-[9px] font-mono text-yellow-500 uppercase leading-snug">
                      Webcam not initialized. Running active fallback vectors.
                    </span>
                  </div>
                </div>
              )}

              {/* OVERLAID PRECISE WEB DIAGNOSTIC CANVAS */}
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20 mix-blend-screen"
              />

              {/* NODE CALIBRATION INTERACTIVE SVG AND DRAGGABLES */}
              <div className="absolute inset-0 w-full h-full z-30">
                {isCalibrating && activeRequirement !== "closeup" && (
                  <>
                    {/* Render active vector networks */}
                    {activeTab === "front" ? renderInteractiveSVGFront() : renderInteractiveSVGSide()}

                    {/* Interactive anchor point handles */}
                    {activePoints.map((pt) => {
                      const isDragged = draggedPointId === pt.id;
                      return (
                        <div
                          key={pt.id}
                          onPointerDown={() => handlePointerDown(pt.id)}
                          className="absolute group pointer-events-auto touch-none cursor-grab active:cursor-grabbing"
                          style={{
                            left: `${pt.x}%`,
                            top: `${pt.y}%`,
                            transform: "translate(-50%, -50%)"
                          }}
                        >
                          {/* Targeting HUD Indicator ring */}
                          <div 
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-150 ${
                              isDragged
                                ? "bg-accent-mint/30 border-accent-mint scale-125 shadow-[0_0_15px_#14b8a6]"
                                : "bg-black/95 border-accent-mint/80 group-hover:scale-110 group-hover:bg-accent-mint/15"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-mint" />
                          </div>

                          {/* Dynamic node coordinate popup text */}
                          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#090a0f]/95 border border-white/[0.08] text-[9px] font-mono text-zinc-300 px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            {pt.label} ({Math.round(pt.x)}, {Math.round(pt.y)})
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Absolute Corner Overlay Hud elements */}
              <div className="absolute bottom-4 right-4 z-40 bg-[#090a0f]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.04] flex items-center gap-4 text-[9px] font-mono text-zinc-500">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-mint" />
                  <span>RESOLUTION: 1080P_HD</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                  <span>LATENCY: 4.1MS</span>
                </div>
              </div>
            </div>

            {/* Instruction Callout (Isolated Performance configuration style) */}
            <div className="bg-[#12141c]/40 border border-white/[0.04] p-3.5 rounded-xl flex gap-3 items-start backdrop-blur-md">
              <Info className="w-4 h-4 text-accent-mint shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider">Calibration Instructions</h4>
                <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                  For optimal face shape detection, align your profile with the center target reticles. Click <strong>Calibrate Nodes</strong> to lock the image matrix, then drag the glowing nodes over your landmarks. Once complete, click <strong>Save Calibration Record</strong> to store the updated diagnostic values in your permanent file.
                </p>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: TELEMETRY OUTPUT SIDEBAR */}
          <div className="w-full md:w-[320px] flex flex-col gap-4 shrink-0">
            
            {/* Live Telemetry Title */}
            <div className="bg-[#12141c]/60 border border-white/[0.05] rounded-2xl p-5 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2 pb-3 border-b border-white/[0.04]">
                <Cpu className="w-4 h-4 text-accent-mint" />
                <h3 className="font-mono text-xs font-semibold tracking-wider text-white">
                  REALTIME_DIAGNOSTICS
                </h3>
              </div>

              {/* Tab I Specific outputs */}
              <div className="space-y-4">
                
                <h4 className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase mb-1">
                  I. Craniofacial Metrics
                </h4>

                <div className="bg-zinc-950/40 border border-white/[0.02] p-3.5 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-zinc-400">
                    <span>FACE_SHAPE</span>
                    <span className="text-accent-mint font-bold uppercase text-xs">
                      {faceShape}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans leading-snug">
                    Analyzed via vertical glabella-chin axial height vs bigonial zygomatic width vectors.
                  </p>
                </div>

                <div className="bg-zinc-950/40 border border-white/[0.02] p-3.5 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-zinc-400">
                    <span>ASYMMETRY_INDEX</span>
                    <div className="text-right">
                      <span className="text-accent-mint font-bold text-xs font-mono">
                        {asymmetryIndex}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Custom progress gauge */}
                  <div className="w-full bg-zinc-900 h-1 rounded-full mb-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        asymmetryIndex < 4.0 ? "bg-accent-mint" : asymmetryIndex < 7.5 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, asymmetryIndex * 8)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-zinc-600">
                    <span>Optimal (Symmetric)</span>
                    <span>Asymmetric</span>
                  </div>
                </div>

                <div className="bg-zinc-950/40 border border-white/[0.02] p-3.5 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-zinc-400">
                    <span>GONIAL_RATIO</span>
                    <span className="font-mono text-xs text-accent-blue font-bold">
                      {jawHeightRatio.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans leading-snug">
                    Golden jaw proportion ratio mapped at a standard 0.650 baseline metric.
                  </p>
                </div>

              </div>

              {/* Tab II Specific outputs */}
              <div className="space-y-4 pt-3 border-t border-white/[0.04]">
                
                <h4 className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase mb-1">
                  II. Posture Align Vectors
                </h4>

                <div className="bg-zinc-950/40 border border-white/[0.02] p-3.5 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-zinc-400">
                    <span>FORWARD_TILT</span>
                    <span className="font-mono text-xs text-accent-blue font-bold">
                      {postureAngle}°
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans leading-snug">
                    Acromion-to-tragus sagittal deviation calculated relative to the absolute vertical line of gravity.
                  </p>
                </div>

                <div className="bg-zinc-950/40 border border-white/[0.02] p-3.5 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-zinc-400">
                    <span>CERVICAL_SPINE_FORCE</span>
                    <span className="font-mono text-xs text-red-400 font-bold">
                      {estimatedCervicalForce} kg
                    </span>
                  </div>
                  
                  {/* Custom load gauge */}
                  <div className="w-full bg-zinc-900 h-1 rounded-full mb-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        postureAngle < 10 ? "bg-accent-mint" : postureAngle < 18 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, (postureAngle / 30) * 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-zinc-600">
                    <span>Base (5kg)</span>
                    <span>Max Load (30kg)</span>
                  </div>
                </div>

                <div className="bg-zinc-950/40 border border-white/[0.02] p-3.5 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-zinc-400">
                    <span>SKELETAL_STRAIN_INDEX</span>
                    <span className="font-mono text-xs text-zinc-300 font-bold">
                      SSI {postureStrainIndex} / 3.0
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans leading-snug">
                    Integrated cervical posture load factor index rating.
                  </p>
                </div>

              </div>

              {/* SUBMIT CALIBRATION ACTION BUTTON */}
              <div className="pt-2">
                {(() => {
                  const allRequirementsMet = !!frontImage && !!sideImage && !!closeupImage;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveCalibrationRecord}
                        disabled={savingRecord || !allRequirementsMet}
                        className="w-full bg-gradient-to-r from-accent-mint to-accent-blue text-zinc-950 hover:from-teal-400 hover:to-blue-400 font-mono text-[10px] font-bold uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-[0_0_15px_rgba(20,184,166,0.12)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {!allRequirementsMet ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-zinc-950" />
                            AWAITING_3_PHOTOS
                          </>
                        ) : savingRecord ? (
                          <>
                            <Activity className="w-3.5 h-3.5 animate-spin" />
                            STORING_RECORDS...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            COMMIT_CALIBRATION_RECORDS
                          </>
                        )}
                      </button>

                      {!allRequirementsMet && (
                        <div className="mt-2.5 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-left text-yellow-500/80 font-mono text-[9px] tracking-wide leading-relaxed uppercase">
                          <span className="font-bold text-yellow-500 flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="w-3 h-3" />
                            Required Diagnostic Photos Pending:
                          </span>
                          <ul className="list-disc pl-3.5 space-y-1 text-zinc-400 font-sans normal-case text-[10px]">
                            <li className={frontImage ? "text-accent-mint font-mono text-[9px] uppercase list-none flex items-center gap-1" : ""}>
                              {frontImage ? "✓" : "•"} Step 1: Front Profile Photo {frontImage ? "(Ready)" : "(Required)"}
                            </li>
                            <li className={sideImage ? "text-accent-blue font-mono text-[9px] uppercase list-none flex items-center gap-1" : ""}>
                              {sideImage ? "✓" : "•"} Step 2: Lateral Posture Photo {sideImage ? "(Ready)" : "(Required)"}
                            </li>
                            <li className={closeupImage ? "text-purple-400 font-mono text-[9px] uppercase list-none flex items-center gap-1" : ""}>
                              {closeupImage ? "✓" : "•"} Step 3: Upclose Biometric Photo {closeupImage ? "(Ready)" : "(Required)"}
                            </li>
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })()}

                {saveStatus && (
                  <div className={`mt-2.5 p-2 rounded-lg text-center font-mono text-[9px] tracking-wider border uppercase transition-all ${
                    saveStatus.startsWith("SUCCESS")
                      ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
                      : "bg-red-950/20 border-red-500/20 text-red-400"
                  }`}>
                    {saveStatus}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
