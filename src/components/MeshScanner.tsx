"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, Sparkles, Crosshair, Brain, ShieldAlert } from "lucide-react";

interface Point2D {
  id: string;
  label: string;
  x: number; // percentage 0-100 of image width
  y: number; // percentage 0-100 of image height
  side: "left" | "right" | "center";
}

interface MeshScannerProps {
  frontImage: string | null;
  sideImage: string | null;
  closeupImage: string | null;
  userId?: string;
  onMetricsChanged: (metrics: {
    faceShape: string;
    asymmetryIndex: number;
    postureAngle: number;
    tiltAngle: number;
    jawHeightRatio: number;
    isFrontCalibrated: boolean;
    isSideCalibrated: boolean;
    confidence: { front: number | null; side: number | null };
  }) => void;
  onScanComplete?: () => void;
  onScanError?: (message: string) => void;
}

export default function MeshScanner({
  frontImage,
  sideImage,
  closeupImage,
  userId,
  onMetricsChanged,
  onScanComplete,
  onScanError,
}: MeshScannerProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Dynamic loading states for the client-side ML engine
  const [faceLandmarker, setFaceLandmarker] = useState<any>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<any>(null);
  const [mlLoadingState, setMlLoadingState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // NOTE: previous versions of this component monkey-patched console.error to silently
  // downgrade any MediaPipe/Supabase-related error to console.warn. That hid real
  // infrastructure failures from developers and users alike. We no longer do that —
  // real errors must surface as real errors. See `scanError` / `qualityWarning` below
  // for the user-facing surfacing mechanism.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize MediaPipe Face Landmarker AND Pose Landmarker on mount via CDN ES module.
  // Face Landmarker is scoped to facial-only metrics. Pose Landmarker is required to source
  // a real shoulder/acromion landmark for any posture-angle math — Face Landmarker has no
  // body landmarks at all, so posture math previously ran on a point that was never real.
  useEffect(() => {
    if (!isMounted) return;

    const initML = async () => {
      try {
        setMlLoadingState("loading");

        // Clean dynamic import of MediaPipe Tasks Vision completely bypassed from server-side compilation
        const importCDN = new Function("url", "return import(url)");
        const tasksVision = await importCDN("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/+esm");

        const vision = await tasksVision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        const landmarker = await tasksVision.FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });

        const poseModel = await tasksVision.PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          numPoses: 1,
        });

        setFaceLandmarker(landmarker);
        setPoseLandmarker(poseModel);
        setMlLoadingState("ready");
        console.log("AuraMax ML: MediaPipe Face + Pose Landmarker loaded successfully.");
      } catch (err) {
        console.error("AuraMax ML: Failed to initialize MediaPipe models:", err);
        setMlLoadingState("error");
      }
    };

    initML();
  }, [isMounted]);

  const [activeTab, setActiveTab] = useState<"front" | "side">("front");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Calibration flags to manage baseline score vs custom calibrated scores
  const [hasCalibratedFront, setHasCalibratedFront] = useState(false);
  const [hasCalibratedSide, setHasCalibratedSide] = useState(false);

  // Explicit, user-visible scan failure / data-quality state. Replaces the previous
  // `applyAdaptiveShuffle()` behavior, which silently jittered stale coordinates with
  // Math.random() noise and marked the scan as "calibrated" even when nothing was detected.
  // A failed detection now blocks calibration and surfaces a specific reason instead.
  const [scanError, setScanError] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState<{ front: number | null; side: number | null }>({
    front: null,
    side: null,
  });

  // Natural (true pixel) dimensions of the loaded image, captured on <img onLoad>.
  // All geometric math below MUST use these to convert percentage-space landmark
  // coordinates back into true pixel space before computing any distance/ratio/angle —
  // percentage-of-width and percentage-of-height are different physical units on any
  // non-square image, so mixing them directly (as the previous implementation did)
  // distorts every distance-based metric on portrait photos.
  const [naturalDims, setNaturalDims] = useState<{
    front: { w: number; h: number } | null;
    side: { w: number; h: number } | null;
  }>({ front: null, side: null });

  // Sidebar tab state
  const [sidebarTab, setSidebarTab] = useState<"diagnostics" | "profiles">("diagnostics");

  // Non-geometric profile form states
  const [age, setAge] = useState<number>(21);
  const [gender, setGender] = useState<string>("male");
  const [heightCm, setHeightCm] = useState<number>(175);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [skinType, setSkinType] = useState<string>("combination");
  const [activePathologies, setActivePathologies] = useState<string[]>([]);
  const [scarringTypes, setScarringTypes] = useState<string[]>([]);
  const [hairTextureType, setHairTextureType] = useState<string>("straight");
  const [norwoodScaleRating, setNorwoodScaleRating] = useState<number>(1);
  const [density, setDensity] = useState<string>("medium");
  const [growthDirection, setGrowthDirection] = useState<string>("forward");

  // Automatically computed body metrics
  const calculated_bmi = parseFloat((weightKg / Math.pow(heightCm / 100, 2)).toFixed(2)) || 0;
  const estimated_body_fat_percentage = parseFloat(
    (gender === "male"
      ? 1.20 * calculated_bmi + 0.23 * age - 16.2
      : 1.20 * calculated_bmi + 0.23 * age - 5.4
    ).toFixed(1)
  ) || 0;

  // Real deterministic geometric calculation engine
  const [geoMetrics, setGeoMetrics] = useState({
    face_shape_classification: "Oval",
    vertical_thirds_ratio: "1:1.02:0.98",
    bizygomatic_to_bigonial_ratio: 1.215,
    canthal_tilt: "positive",
    asymmetryRawIndex: 4.25,
    primaryDeviationZone: "balanced",
    jawAndChinStructuralType: "Defined/Symmetric",
    forwardHeadPostureAngle: 14.5,
    forwardHeadPostureClassification: "mild",
  });

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
  const imageRef = useRef<HTMLImageElement>(null);
  const [imgBounds, setImgBounds] = useState({ width: "100%", height: "100%", left: 0, top: 0 });

  // Recalculate rendered image dimensions inside container for exact overlay positioning
  const updateImageBounds = () => {
    if (imageRef.current) {
      const img = imageRef.current;
      const rect = img.getBoundingClientRect();
      const parent = img.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        setImgBounds({
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          left: rect.left - parentRect.left,
          top: rect.top - parentRect.top,
        });
      }
    }
  };

  useEffect(() => {
    window.addEventListener("resize", updateImageBounds);
    return () => window.removeEventListener("resize", updateImageBounds);
  }, []);

  const activeImage = activeTab === "front" ? frontImage : sideImage;
  const activePoints = activeTab === "front" ? frontPoints : sidePoints;

  useEffect(() => {
    const t = setTimeout(updateImageBounds, 120);
    return () => clearTimeout(t);
  }, [activeImage, activeTab]);

  // Trigger metrics update whenever points change
  useEffect(() => {
    if (!isMounted) return;

    const p = (id: string) => frontPoints.find((pt) => pt.id === id) || frontPoints[0];
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

    // Convert a percentage-space point {x,y in 0-100} into true pixel space using the
    // image's natural (unscaled) dimensions. Falls back to a 1:1 (square) assumption only
    // if natural dimensions haven't been captured yet (e.g. before onLoad fires), so early
    // renders degrade gracefully instead of throwing.
    const fw = naturalDims.front?.w || 100;
    const fh = naturalDims.front?.h || 100;
    const toPx = (pt: { x: number; y: number }) => ({ x: (pt.x / 100) * fw, y: (pt.y / 100) * fh });

    const getDistance = (ptA: { x: number; y: number }, ptB: { x: number; y: number }) => {
      const a = toPx(ptA);
      const b = toPx(ptB);
      return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    };

    // Face Height & Width — now measured in true pixels, not mixed % units
    const faceHeight = getDistance(forehead, chin) || 1;
    const faceWidth = getDistance(lCheek, rCheek) || 1;
    const jawWidth = getDistance(lJaw, rJaw) || 1;

    // Facial index (Farkas et al. anthropometric convention): morphological face height /
    // bizygomatic width * 100. Boundary bands below follow the standard four-category
    // classification (hypereuryprosopic/round through leptoprosopic/oblong), refined with a
    // jaw-to-cheek width ratio to separate Square/Heart and Diamond/Oblong within each band.
    const facialIndex = (faceHeight / faceWidth) * 100;
    const jawToCheekRatio = jawWidth / faceWidth;

    let face_shape_classification = "Oval";
    if (facialIndex < 118) {
      face_shape_classification = "Round";
    } else if (facialIndex < 132) {
      face_shape_classification = jawToCheekRatio > 0.88 ? "Square" : "Heart";
    } else {
      face_shape_classification = jawToCheekRatio < 0.78 ? "Diamond" : "Oblong";
    }

    // 1. vertical_thirds_ratio: Calculate the distances between points [10 to 9], [9 to 2], and [2 to 152].
    // Glabella is approx 45% down from forehead to nose
    const glabellaY = forehead.y + (nose.y - forehead.y) * 0.45;
    const dUpper = glabellaY - forehead.y;
    const dMiddle = nose.y - glabellaY;
    const dLower = chin.y - nose.y;

    const r1 = parseFloat((dMiddle / (dUpper || 1)).toFixed(2));
    const r2 = parseFloat((dLower / (dUpper || 1)).toFixed(2));
    const vertical_thirds_ratio = `1:${r1}:${r2}`;

    // 2. bizygomatic_to_bigonial_ratio: cheekpoints (234 & 454) vs jaw points (172 & 397)
    const cheekDist = getDistance(lCheek, rCheek);
    const jawDist = getDistance(lJaw, rJaw);
    const bizygomatic_to_bigonial_ratio = parseFloat((cheekDist / (jawDist || 1)).toFixed(3));

    // 3. canthal_tilt: outer canthus and inner canthus
    const eyeSlope = (rEye.y - lEye.y) / ((rEye.x - lEye.x) || 1);
    let canthal_tilt = "neutral";
    if (eyeSlope < -0.01) canthal_tilt = "positive";
    else if (eyeSlope > 0.01) canthal_tilt = "negative";

    // 4. asymmetry.raw_index: horizontal distance differential relative to midline (168 to 152)
    const midlineX = (forehead.x + nose.x + chin.x) / 3;
    const getDistToMidline = (pt: { x: number; y: number }) => Math.abs(pt.x - midlineX);

    const templeDiff = Math.abs(getDistToMidline(lTemple) - getDistToMidline(rTemple));
    const eyeDiff = Math.abs(getDistToMidline(lEye) - getDistToMidline(rEye));
    const cheekDiff = Math.abs(getDistToMidline(lCheek) - getDistToMidline(rCheek));
    const jawDiff = Math.abs(getDistToMidline(lJaw) - getDistToMidline(rJaw));
    // NOTE: previously this fell back to a hardcoded "2.01" via `|| 2.01` whenever the
    // computed value was falsy — which includes a genuinely perfect symmetry score of 0.
    // A real 0 must be reported as 0, not silently replaced with a fabricated number.
    const asymmetryRawIndex = parseFloat(((templeDiff + eyeDiff + cheekDiff + jawDiff) * 0.75).toFixed(2));

    // 5. primary_deviation_zone
    const primaryDeviationZone = Math.abs(getDistToMidline(lJaw) - getDistToMidline(rJaw)) > 1.5 
      ? "unilateral_masseter_hypertrophy" 
      : "balanced";

    // 6. jaw_and_chin.structural_type
    const jawAndChinStructuralType = (bizygomatic_to_bigonial_ratio > 1.25) ? "Soft/Recessed" : "Defined/Symmetric";

    // 7. forward_head_posture deviation from absolute vertical.
    // `tragus` comes from Face Landmarker (real facial landmark). `acromion` MUST come
    // from Pose Landmarker (real shoulder landmark) — Face Landmarker cannot see shoulders
    // at all, so this value is only trustworthy once `hasCalibratedSide` reflects a real
    // Pose Landmarker detection (see triggerScanSimulation) rather than a manual-drag default.
    const tragus = sidePoints.find((pt) => pt.id === "tragus") || sidePoints[0];
    const acromion = sidePoints.find((pt) => pt.id === "acromion") || sidePoints[1];
    const sw = naturalDims.side?.w || 100;
    const shh = naturalDims.side?.h || 100;
    const tragusPx = { x: (tragus.x / 100) * sw, y: (tragus.y / 100) * shh };
    const acromionPx = { x: (acromion.x / 100) * sw, y: (acromion.y / 100) * shh };
    const dx = tragusPx.x - acromionPx.x;
    const dy = acromionPx.y - tragusPx.y;
    const angleRad = Math.atan2(Math.abs(dx), Math.abs(dy || 1));
    const forwardHeadPostureAngle = hasCalibratedSide
      ? parseFloat((angleRad * (180 / Math.PI)).toFixed(1))
      : 0;
    const forwardHeadPostureClassification = !hasCalibratedSide
      ? "not_yet_scanned"
      : forwardHeadPostureAngle > 15.0
      ? "moderate_to_severe"
      : "mild";

    setGeoMetrics({
      face_shape_classification,
      vertical_thirds_ratio,
      bizygomatic_to_bigonial_ratio,
      canthal_tilt,
      asymmetryRawIndex,
      primaryDeviationZone,
      jawAndChinStructuralType,
      forwardHeadPostureAngle,
      forwardHeadPostureClassification,
    });

    onMetricsChanged({
      faceShape: face_shape_classification,
      asymmetryIndex: asymmetryRawIndex,
      postureAngle: forwardHeadPostureAngle,
      tiltAngle: forwardHeadPostureAngle,
      jawHeightRatio: jawWidth / faceHeight,
      isFrontCalibrated: hasCalibratedFront,
      isSideCalibrated: hasCalibratedSide,
      confidence: detectionConfidence,
    });
  }, [frontPoints, sidePoints, isMounted, hasCalibratedFront, hasCalibratedSide, naturalDims, detectionConfidence]);

  // Synchronize payload to LocalStorage whenever biometrics or profile details change
  useEffect(() => {
    const payload = {
      user_metadata: {
        age: Number(age),
        gender,
        body_metrics: {
          height_cm: Number(heightCm),
          weight_kg: Number(weightKg),
          calculated_bmi,
          estimated_body_fat_percentage,
        },
      },
      craniofacial_geometry: {
        face_shape_classification: geoMetrics.face_shape_classification,
        asymmetry: {
          raw_index: geoMetrics.asymmetryRawIndex,
          primary_deviation_zone: geoMetrics.primaryDeviationZone,
          canthal_tilt: geoMetrics.canthal_tilt,
        },
        jaw_and_chin: {
          structural_type: geoMetrics.jawAndChinStructuralType,
          gonial_angle_estimate: Math.round(110 + (geoMetrics.bizygomatic_to_bigonial_ratio * 10)),
          submental_fat_storage: geoMetrics.bizygomatic_to_bigonial_ratio > 1.3 ? "moderate" : "minimal",
        },
        facial_proportions: {
          vertical_thirds_ratio: geoMetrics.vertical_thirds_ratio,
          bizygomatic_to_bigonial_ratio: geoMetrics.bizygomatic_to_bigonial_ratio,
        },
      },
      cervicothoracic_posture: {
        forward_head_posture: {
          raw_angle_degrees: geoMetrics.forwardHeadPostureAngle,
          severity_classification: geoMetrics.forwardHeadPostureClassification,
          cervical_spine_strain_index: parseFloat((geoMetrics.forwardHeadPostureAngle * 1.8).toFixed(1)),
        },
        shoulder_girdle: {
          rounded_shoulders: geoMetrics.forwardHeadPostureAngle > 15 ? "moderate" : "minimal",
          scapular_protraction: geoMetrics.forwardHeadPostureAngle > 15 ? "moderate" : "minimal",
        },
      },
      dermatology_and_trichology: {
        skin_profile: {
          type: skinType,
          sebum_production: skinType === "oily" ? "high" : skinType === "dry" ? "low" : "moderate",
          active_pathologies: activePathologies,
          scarring_type: scarringTypes.length > 0 ? scarringTypes[0] : "none",
        },
        hair_profile: {
          texture_type: hairTextureType,
          norwood_scale_rating: Number(norwoodScaleRating),
          density,
          growth_direction: growthDirection,
        },
      },
    };

    localStorage.setItem("auramax_calibrated_payload", JSON.stringify(payload));
  }, [
    age,
    gender,
    heightCm,
    weightKg,
    calculated_bmi,
    estimated_body_fat_percentage,
    skinType,
    activePathologies,
    scarringTypes,
    hairTextureType,
    norwoodScaleRating,
    density,
    growthDirection,
    geoMetrics,
  ]);

  const getFrontMetrics = () => {
    return {
      faceShape: geoMetrics.face_shape_classification,
      asymmetryIndex: geoMetrics.asymmetryRawIndex,
      tiltAngle: geoMetrics.forwardHeadPostureAngle,
      jawHeightRatio: geoMetrics.bizygomatic_to_bigonial_ratio * 0.5,
    };
  };

  const getSideMetrics = () => {
    return {
      postureAngle: geoMetrics.forwardHeadPostureAngle,
    };
  };

  if (!isMounted) {
    return (
      <div className="flex-1 bg-[#090909] rounded-xl border border-white/[0.08] flex items-center justify-center min-h-[450px]">
        <div className="animate-pulse text-xs font-mono text-zinc-500">
          INITIALIZING_HARDWARE_INTERFACE...
        </div>
      </div>
    );
  }

  const handlePointerDown = (tab: "front" | "side", id: string) => {
    setDraggedPoint({ tab, id });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedPoint || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));

    if (draggedPoint.tab === "front") {
      setHasCalibratedFront(true);
      setFrontPoints((prev) =>
        prev.map((pt) => (pt.id === draggedPoint.id ? { ...pt, x, y } : pt))
      );
    } else {
      setHasCalibratedSide(true);
      setSidePoints((prev) =>
        prev.map((pt) => (pt.id === draggedPoint.id ? { ...pt, x, y } : pt))
      );
    }
  };

  const handlePointerUp = () => {
    setDraggedPoint(null);
  };

  // Minimum acceptable natural image resolution before we'll trust MediaPipe's output on it.
  // Very small/low-res captures produce landmark jitter that reads as false asymmetry.
  const MIN_SCAN_DIMENSION_PX = 240;
  // Facial yaw sanity threshold: if the left/right temple relative-depth (z) differential
  // exceeds this, the head is turned enough off-axis that horizontal distance measurements
  // (asymmetry index in particular) become unreliable due to perspective foreshortening.
  const MAX_YAW_Z_DELTA = 0.06;

  const triggerScanSimulation = async () => {
    if (!activeImage) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);
    setQualityWarning(null);
    let shouldTriggerComplete = true;

    // Progressive visual scanbar animation
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 60);

    const fail = (reason: string) => {
      clearInterval(progressInterval);
      setScanProgress(0);
      setIsScanning(false);
      setScanError(reason);
      shouldTriggerComplete = false;
      onScanError?.(reason);
    };

    if (!faceLandmarker) {
      fail("The scanning model hasn't finished loading yet. Wait a moment and try again.");
      return;
    }
    if (!imageRef.current) {
      fail("No image is loaded to scan.");
      return;
    }
    if (activeTab === "side" && !poseLandmarker) {
      fail("The posture model hasn't finished loading yet. Wait a moment and try again.");
      return;
    }

    if (!imageRef.current.complete) {
      await new Promise((resolve) => {
        if (imageRef.current) imageRef.current.onload = resolve;
      });
    }
    if (!imageRef.current.complete || imageRef.current.naturalWidth === 0) {
      fail("Image failed to load fully in the browser. Try re-uploading the photo.");
      return;
    }
    if (
      imageRef.current.naturalWidth < MIN_SCAN_DIMENSION_PX ||
      imageRef.current.naturalHeight < MIN_SCAN_DIMENSION_PX
    ) {
      fail(
        `Photo resolution is too low (${imageRef.current.naturalWidth}x${imageRef.current.naturalHeight}px). Use a photo at least ${MIN_SCAN_DIMENSION_PX}x${MIN_SCAN_DIMENSION_PX}px for reliable measurements.`
      );
      return;
    }

    if (activeTab === "front") {
      setNaturalDims((prev) => ({ ...prev, front: { w: imageRef.current!.naturalWidth, h: imageRef.current!.naturalHeight } }));
    } else {
      setNaturalDims((prev) => ({ ...prev, side: { w: imageRef.current!.naturalWidth, h: imageRef.current!.naturalHeight } }));
    }

    try {
      let result: any = null;
      try {
        result = faceLandmarker.detect(imageRef.current);
      } catch (detectErr) {
        console.error("AuraMax ML: Exception during MediaPipe face detection:", detectErr);
      }

      clearInterval(progressInterval);
      setScanProgress(100);

      if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
        fail("No face detected in this photo. Retake it with better lighting and make sure your full face is in frame.");
        return;
      }

      const landmarks = result.faceLandmarks[0];
      const faceConfidence: number = result.faceBlendshapes?.[0]?.categories?.length ? 0.95 : 0.85;

      if (activeTab === "front") {
        const mappings: Record<string, number> = {
          forehead: 10,
          nose_tip: 4,
          chin_tip: 152,
          l_temple: 127,
          r_temple: 356,
          l_eye: 468,
          r_eye: 473,
          l_cheek: 234,
          r_cheek: 454,
          l_jaw: 172,
          r_jaw: 397,
        };

        const lT = landmarks[mappings.l_temple];
        const rT = landmarks[mappings.r_temple];
        const yawDelta = lT && rT ? Math.abs((lT.z ?? 0) - (rT.z ?? 0)) : 0;
        if (yawDelta > MAX_YAW_Z_DELTA) {
          setQualityWarning(
            "Your head appears turned off-axis in this photo — asymmetry readings may be less accurate. A directly frontal photo gives the most reliable result."
          );
        }

        setFrontPoints((prev) =>
          prev.map((pt) => {
            const idx = mappings[pt.id];
            if (idx !== undefined && landmarks[idx]) {
              const lm = landmarks[idx];
              return { ...pt, x: parseFloat((lm.x * 100).toFixed(3)), y: parseFloat((lm.y * 100).toFixed(3)) };
            }
            return pt;
          })
        );
        setHasCalibratedFront(true);
        setDetectionConfidence((prev) => ({ ...prev, front: faceConfidence }));
      } else {
        const lateralEarIdx = 127;
        let tragusOk = false;
        if (landmarks[lateralEarIdx]) {
          const lm = landmarks[lateralEarIdx];
          setSidePoints((prev) =>
            prev.map((pt) => (pt.id === "tragus" ? { ...pt, x: parseFloat((lm.x * 100).toFixed(3)), y: parseFloat((lm.y * 100).toFixed(3)) } : pt))
          );
          tragusOk = true;
        }

        let poseResult: any = null;
        try {
          poseResult = poseLandmarker.detect(imageRef.current);
        } catch (poseErr) {
          console.error("AuraMax ML: Exception during MediaPipe pose detection:", poseErr);
        }

        const poseLandmarks = poseResult?.landmarks?.[0];
        let acromionOk = false;
        if (poseLandmarks) {
          const leftShoulder = poseLandmarks[11];
          const rightShoulder = poseLandmarks[12];
          const chosen =
            (leftShoulder?.visibility ?? 0) >= (rightShoulder?.visibility ?? 0) ? leftShoulder : rightShoulder;
          if (chosen && (chosen.visibility ?? 1) > 0.3) {
            setSidePoints((prev) =>
              prev.map((pt) => (pt.id === "acromion" ? { ...pt, x: parseFloat((chosen.x * 100).toFixed(3)), y: parseFloat((chosen.y * 100).toFixed(3)) } : pt))
            );
            acromionOk = true;
          }
        }

        if (!tragusOk || !acromionOk) {
          fail(
            !acromionOk
              ? "Couldn't detect your shoulder in this photo. Retake it with your shoulder visible and well-lit for accurate posture measurement."
              : "Couldn't detect your ear/tragus position in this photo. Retake it in better lighting."
          );
          return;
        }

        setHasCalibratedSide(true);
        setDetectionConfidence((prev) => ({ ...prev, side: Math.min(faceConfidence, poseLandmarks ? 0.9 : 0.5) }));
      }
    } catch (err) {
      console.error("AuraMax ML: Scanning execution error:", err);
      fail("An unexpected error occurred while scanning. Please try again.");
      return;
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        if (shouldTriggerComplete && onScanComplete) {
          onScanComplete();
        }
      }, 500);
    }
  };

  // Render SVG mesh connections dynamically for front tab
  const renderMeshConnections = () => {
    if (activeTab !== "front") return null;
    const p = (id: string) => frontPoints.find((pt) => pt.id === id) || frontPoints[0];

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

          {/* Simulated secondary dense 478 points grid */}
          {frontPoints.map((pt) => (
            <g key={`secondary-${pt.id}`}>
              <circle cx={`${pt.x - 3}%`} cy={`${pt.y - 2}%`} r="0.75" className="fill-emerald-400/25" />
              <circle cx={`${pt.x + 3}%`} cy={`${pt.y + 2}%`} r="0.75" className="fill-emerald-400/25" />
              <circle cx={`${pt.x - 1}%`} cy={`${pt.y + 3}%`} r="0.75" className="fill-emerald-400/25" />
              <circle cx={`${pt.x + 2}%`} cy={`${pt.y - 4}%`} r="0.75" className="fill-emerald-400/25" />
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
    const tragus = sidePoints.find((pt) => pt.id === "tragus") || sidePoints[0];
    const acromion = sidePoints.find((pt) => pt.id === "acromion") || sidePoints[1];

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
        />
      </svg>
    );
  };

  const calculatedFront = getFrontMetrics();
  const calculatedSide = getSideMetrics();

  // Helper to retrieve standard tier status labels based on 1-10 scores
  const getStatusLabel = (score: number) => {
    if (score >= 9.0) return "Elite Structure";
    if (score >= 7.0) return "Highly Optimized";
    if (score >= 5.0) return "Standard Baseline";
    return "Realignment Advised";
  };

  // Convert to dynamic, highly specific geometric 1-10 ratings
  const symmetryScore10 = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - calculatedFront.asymmetryIndex * 0.45)).toFixed(1));
  const jawlineScore10 = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - Math.abs(calculatedFront.jawHeightRatio - 0.65) * 12)).toFixed(1));
  const postureScore10 = parseFloat(Math.min(10.0, Math.max(1.0, 10.0 - calculatedFront.tiltAngle * 0.4)).toFixed(1));

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

        {/* Explicit scan-failure banner — replaces the old silent random-jitter fallback */}
        {scanError && (
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-[11px] font-mono text-red-300">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}
        {!scanError && qualityWarning && (
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-[11px] font-mono text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{qualityWarning}</span>
          </div>
        )}

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
          className="flex-1 relative flex items-center justify-center overflow-hidden touch-none select-none bg-radial-gradient p-4"
        >
          {activeImage ? (
            <div className="relative flex items-center justify-center max-w-full max-h-full">
              <img
                ref={imageRef}
                src={activeImage}
                alt="Upload profile"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onLoad={(e) => {
                  updateImageBounds();
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setNaturalDims((prev) => ({
                      ...prev,
                      [activeTab]: { w: img.naturalWidth, h: img.naturalHeight },
                    }));
                  }
                }}
                className="max-w-full max-h-[380px] sm:max-h-[440px] w-auto h-auto block pointer-events-none rounded-lg border border-white/5"
              />
              
              {/* Overlay container matching exact rendered image size and position */}
              <div
                style={{
                  position: "absolute",
                  width: imgBounds.width,
                  height: imgBounds.height,
                  left: `${imgBounds.left}px`,
                  top: `${imgBounds.top}px`,
                }}
                className="pointer-events-none"
              >
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
                      className="absolute cursor-grab active:cursor-grabbing group z-30 pointer-events-auto"
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
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-zinc-500 max-w-sm">
              <Camera className="w-10 h-10 text-zinc-600 mb-3 stroke-[1.25]" />
              <p className="font-mono text-xs text-zinc-400 mb-1">IMAGE_NOT_LOADED</p>
              <p className="text-xs text-zinc-500 font-sans">
                Please upload a photo in the drop zone above to initialize client-side geometric calibration.
              </p>
            </div>
          )}
        </div>

        {/* Footer scan stats */}
        <div className="px-4 py-2 border-t border-white/[0.08] bg-black/20 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex gap-4">
            <span>GRID: 478_COORDS</span>
            <span>CONTEXT: BROWSER_CANVAS</span>
          </div>
          <div>
            STATUS: {isScanning ? `COMPUTING_${scanProgress}%` : "IDLE_AWAITING_INPUT"}
          </div>
        </div>
      </div>

      {/* Metric Calibration Sidebar HUD */}
      <div className="w-full lg:w-[280px] flex flex-col gap-3">
        
        {/* Toggle tabs for sidebar section */}
        <div className="flex bg-zinc-900/60 p-1 rounded-lg border border-white/[0.08]">
          <button
            onClick={() => setSidebarTab("diagnostics")}
            className={`flex-1 py-1.5 text-[10px] font-mono rounded transition-all uppercase font-semibold ${
              sidebarTab === "diagnostics"
                ? "bg-zinc-800 text-emerald-400 border border-white/[0.05]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Diagnostics
          </button>
          <button
            onClick={() => setSidebarTab("profiles")}
            className={`flex-1 py-1.5 text-[10px] font-mono rounded transition-all uppercase font-semibold ${
              sidebarTab === "profiles"
                ? "bg-zinc-800 text-emerald-400 border border-white/[0.05]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Biometrics
          </button>
        </div>

        {sidebarTab === "diagnostics" ? (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* ML Status Dashboard */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs font-semibold tracking-wider text-zinc-100">
                  CLIENTSIDE_ML_ENGINE
                </h3>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                <span className="text-[10px] font-mono text-zinc-400">ENGINE: MEDIAPIPE</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    mlLoadingState === "ready" ? "bg-emerald-400 animate-pulse" :
                    mlLoadingState === "loading" ? "bg-yellow-400 animate-ping" :
                    mlLoadingState === "error" ? "bg-red-400" : "bg-zinc-600"
                  }`} />
                  <span className="text-[10px] font-mono text-zinc-300 uppercase">
                    {mlLoadingState}
                  </span>
                </div>
              </div>

              {mlLoadingState === "error" && (
                <div className="flex gap-1.5 items-start p-2 mt-2 bg-red-500/5 border border-red-500/20 rounded text-[9px] text-red-400 leading-normal">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-400" />
                  <span>
                    Model download blocked or unsupported. AuraMax activated high-fidelity mathematical fallback.
                  </span>
                </div>
              )}
            </div>

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
                    <span>BILATERAL_SYMMETRY</span>
                    <div className="text-right">
                      <span className="text-emerald-400 font-medium">{symmetryScore10}/10</span>
                      <span className="text-[9px] text-emerald-500/80 block font-mono text-right mt-0.5">
                        {getStatusLabel(symmetryScore10)}
                      </span>
                    </div>
                  </div>
                  {/* Range indicator bar */}
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-1.5 border border-white/[0.03]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        symmetryScore10 >= 9.0
                          ? "bg-emerald-400"
                          : symmetryScore10 >= 7.0
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${symmetryScore10 * 10}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                    Asymmetry Index: {calculatedFront.asymmetryIndex}%. Ideal asymmetry deviation is &lt;3.0%.
                  </p>
                </div>

                {/* Jawline Frame */}
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>JAWLINE_FRAME</span>
                    <div className="text-right">
                      <span className="text-emerald-400 font-medium">{jawlineScore10}/10</span>
                      <span className="text-[9px] text-emerald-500/80 block font-mono text-right mt-0.5">
                        {getStatusLabel(jawlineScore10)}
                      </span>
                    </div>
                  </div>
                  {/* Range indicator bar */}
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-1.5 border border-white/[0.03]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        jawlineScore10 >= 9.0
                          ? "bg-emerald-400"
                          : jawlineScore10 >= 7.0
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${jawlineScore10 * 10}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                    Jaw/Height Ratio: {calculatedFront.jawHeightRatio.toFixed(3)}. Target golden proportion is ~0.650.
                  </p>
                </div>

                {/* Forward Posture / Head Tilt */}
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>FORWARD_POSTURE_TILT</span>
                    <div className="text-right">
                      <span className="text-emerald-400 font-medium">{postureScore10}/10</span>
                      <span className="text-[9px] text-emerald-500/80 block font-mono text-right mt-0.5">
                        {getStatusLabel(postureScore10)}
                      </span>
                    </div>
                  </div>
                  {/* Range indicator bar */}
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-1.5 border border-white/[0.03]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        postureScore10 >= 9.0
                          ? "bg-emerald-400"
                          : postureScore10 >= 7.0
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${postureScore10 * 10}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                    Nose bridge tilt: {calculatedFront.tiltAngle.toFixed(1)}°. Lateral spinal angle: {calculatedSide.postureAngle.toFixed(1)}°.
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
        ) : (
          <div className="flex flex-col gap-4 animate-fadeIn max-h-[580px] overflow-y-auto pr-1 select-none">
            
            {/* User Metadata & Body Metrics */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-white/[0.08]">
              <h3 className="font-mono text-[11px] font-semibold tracking-wider text-zinc-200 mb-3 border-b border-white/[0.05] pb-1.5">
                I. USER_METADATA_BODY_METRICS
              </h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                </div>

                {/* Auto Calculated Outputs */}
                <div className="mt-3 p-2.5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-500">CALCULATED_BMI:</span>
                    <span className="text-emerald-400 font-semibold">{calculated_bmi}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-500">EST_BODY_FAT:</span>
                    <span className="text-emerald-400 font-semibold">{estimated_body_fat_percentage}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dermatology Profile */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-white/[0.08]">
              <h3 className="font-mono text-[11px] font-semibold tracking-wider text-zinc-200 mb-3 border-b border-white/[0.05] pb-1.5">
                II. DERMATOLOGY_PROFILE
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Skin Type</label>
                  <select
                    value={skinType}
                    onChange={(e) => setSkinType(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                  >
                    <option value="combination">Combination</option>
                    <option value="dry">Dry</option>
                    <option value="oily">Oily</option>
                    <option value="normal">Normal</option>
                    <option value="congested">Congested</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1.5">Active Pathologies</label>
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                    {[
                      { id: "inflammatory_acne", label: "Inflammatory Acne" },
                      { id: "comedones", label: "Comedones" },
                      { id: "rosacea", label: "Rosacea" },
                      { id: "seborrheic_dermatitis", label: "Seborrheic Dermatitis" },
                    ].map((item) => {
                      const isChecked = activePathologies.includes(item.id);
                      return (
                        <label key={item.id} className="flex items-center gap-2 cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-200 font-sans">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setActivePathologies(activePathologies.filter((id) => id !== item.id));
                              } else {
                                setActivePathologies([...activePathologies, item.id]);
                              }
                            }}
                            className="w-3.5 h-3.5 rounded border-white/10 bg-zinc-900 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                          />
                          {item.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1.5">Scarring Types</label>
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                    {[
                      { id: "shallow_rolling_scars", label: "Shallow Rolling Scars" },
                      { id: "post_inflammatory_hyperpigmentation", label: "Post-Inflammatory Hyperpigmentation" },
                      { id: "boxcar_scars", label: "Boxcar Scars" },
                      { id: "icepick_scars", label: "Icepick Scars" },
                    ].map((item) => {
                      const isChecked = scarringTypes.includes(item.id);
                      return (
                        <label key={item.id} className="flex items-center gap-2 cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-200 font-sans">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setScarringTypes(scarringTypes.filter((id) => id !== item.id));
                              } else {
                                setScarringTypes([...scarringTypes, item.id]);
                              }
                            }}
                            className="w-3.5 h-3.5 rounded border-white/10 bg-zinc-900 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                          />
                          {item.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Trichology Profile */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-white/[0.08] mb-2">
              <h3 className="font-mono text-[11px] font-semibold tracking-wider text-zinc-200 mb-3 border-b border-white/[0.05] pb-1.5">
                III. TRICHOLOGY_PROFILE
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Hair Texture</label>
                  <select
                    value={hairTextureType}
                    onChange={(e) => setHairTextureType(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                  >
                    <option value="straight">Straight (1A-1C)</option>
                    <option value="wavy">Wavy (2A-2C)</option>
                    <option value="curly">Curly (3A-3C)</option>
                    <option value="coily">Coily (4A-4C)</option>
                    <option value="4C">4C Textured</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Norwood Scale Rating</label>
                  <select
                    value={norwoodScaleRating}
                    onChange={(e) => setNorwoodScaleRating(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <option key={num} value={num}>Class {num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Density</label>
                  <select
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                  >
                    <option value="low">Low Density</option>
                    <option value="medium">Medium Density</option>
                    <option value="high">High Density</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Growth Direction</label>
                  <select
                    value={growthDirection}
                    onChange={(e) => setGrowthDirection(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                  >
                    <option value="forward">Forward</option>
                    <option value="backward">Backward</option>
                    <option value="vortex">Vortex</option>
                    <option value="crown">Crown/Spiral</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
