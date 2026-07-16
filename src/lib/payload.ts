/**
 * Single source of truth for building the /api/recommendations request payload.
 *
 * PREVIOUSLY: this payload was built independently in three places (MeshScanner.tsx,
 * scanner/page.tsx's save handler, and dashboard/page.tsx's regenerate handler), each with
 * its own slightly different derivation formulas (e.g. cervical_spine_strain_index computed
 * as `angle*1.8` in one file and `angle*0.9+5` in another) and each with its own set of
 * hardcoded fallback defaults (`|| 4.25`, `|| 14.5`, `|| 22.8`, etc.) that silently replaced
 * real falsy values — including a genuine 0 — with fabricated numbers.
 *
 * NOW: every call site imports `buildRecommendationPayload` from here and passes it the
 * persisted Dexie `BiometricProfile` (the single source of truth for "what was actually
 * measured") plus recent `HistoricalRecord`s (so the AI can genuinely reason about
 * progression — see the `historical_scans` field, which the API route already supported
 * but no client ever populated).
 */

import type { BiometricProfile, HistoricalRecord } from "./db";

export interface HistoricalScanSummary {
  timestamp: number;
  score: number;
  asymmetryIndex: number;
  postureAngle: number;
}

export interface RecommendationPayload {
  user_metadata: {
    age: number;
    gender: string;
    body_metrics: {
      height_cm: number;
      weight_kg: number;
      calculated_bmi: number;
      estimated_body_fat_percentage: number;
    };
  };
  craniofacial_geometry: {
    face_shape_classification: string;
    asymmetry: {
      raw_index: number;
      primary_deviation_zone: string;
      canthal_tilt: string;
    };
    jaw_and_chin: {
      structural_type: string;
      gonial_angle_estimate: number;
      submental_fat_storage: string;
    };
    facial_proportions: {
      vertical_thirds_ratio: string;
      bizygomatic_to_bigonial_ratio: number;
    };
  };
  cervicothoracic_posture: {
    forward_head_posture: {
      raw_angle_degrees: number;
      severity_classification: string;
      cervical_spine_strain_index: number;
    };
    shoulder_girdle: {
      rounded_shoulders: string;
      scapular_protraction: string;
    };
  };
  dermatology_and_trichology: {
    skin_profile: {
      type: string;
      sebum_production: string;
      active_pathologies: string[];
      scarring_type: string;
    };
    hair_profile: {
      texture_type: string;
      norwood_scale_rating: number;
      density: string;
      growth_direction: string;
    };
  };
  // Wires up the trend-aware directive in route.ts that previously received no data from
  // any client — the "month-long adaptive blueprint" premise depends on this being populated.
  historical_scans: HistoricalScanSummary[];
  // Lets the API (and, transparently, the UI) know whether the underlying measurements came
  // from a real MediaPipe detection or were only ever manually placed / never calibrated.
  data_quality: {
    front_calibrated: boolean;
    side_calibrated: boolean;
  };
}

/** A single cervical-spine-strain-index formula, used everywhere — no more divergent copies. */
function cervicalSpineStrainIndex(postureAngleDeg: number): number {
  return parseFloat((5.0 + postureAngleDeg * 0.9).toFixed(1));
}

function postureSeverity(postureAngleDeg: number): string {
  if (postureAngleDeg <= 0) return "not_yet_scanned";
  if (postureAngleDeg < 10) return "mild";
  if (postureAngleDeg < 18) return "moderate";
  return "severe";
}

export function buildRecommendationPayload(
  profile: BiometricProfile,
  recentHistory: HistoricalRecord[] = []
): RecommendationPayload {
  const heightM = (profile.heightCm ?? 0) / 100;
  const calculatedBmi = heightM > 0 ? parseFloat(((profile as any).weightKg / (heightM * heightM)).toFixed(2)) : 0;

  return {
    user_metadata: {
      age: (profile as any).age ?? 0,
      gender: (profile as any).gender ?? "unspecified",
      body_metrics: {
        height_cm: profile.heightCm ?? 0,
        weight_kg: (profile as any).weightKg ?? 0,
        calculated_bmi: calculatedBmi,
        estimated_body_fat_percentage: (profile as any).estimatedBodyFatPercentage ?? 0,
      },
    },
    craniofacial_geometry: {
      face_shape_classification: profile.faceShape || "unclassified",
      asymmetry: {
        raw_index: profile.asymmetryIndex ?? 0,
        primary_deviation_zone: (profile as any).primaryDeviationZone || "balanced",
        canthal_tilt: (profile as any).canthalTilt || "neutral",
      },
      jaw_and_chin: {
        structural_type: (profile as any).jawStructuralType || "unclassified",
        gonial_angle_estimate: Math.round(110 + (profile.jawHeightRatio ?? 0) * 10),
        submental_fat_storage: (profile.jawHeightRatio ?? 0) > 1.3 ? "moderate" : "minimal",
      },
      facial_proportions: {
        vertical_thirds_ratio: (profile as any).verticalThirdsRatio || "unknown",
        bizygomatic_to_bigonial_ratio: profile.jawHeightRatio ?? 0,
      },
    },
    cervicothoracic_posture: {
      forward_head_posture: {
        raw_angle_degrees: profile.postureAngle ?? 0,
        severity_classification: postureSeverity(profile.postureAngle ?? 0),
        cervical_spine_strain_index: cervicalSpineStrainIndex(profile.postureAngle ?? 0),
      },
      shoulder_girdle: {
        rounded_shoulders: (profile.postureAngle ?? 0) > 15 ? "moderate" : "minimal",
        scapular_protraction: (profile.postureAngle ?? 0) > 15 ? "moderate" : "minimal",
      },
    },
    dermatology_and_trichology: {
      skin_profile: {
        type: profile.skinCondition || "unspecified",
        sebum_production: profile.skinCondition === "oily" ? "high" : profile.skinCondition === "dry" ? "low" : "moderate",
        active_pathologies: (profile as any).activePathologies || [],
        scarring_type: (profile as any).scarringTypes?.[0] || "none",
      },
      hair_profile: {
        texture_type: (profile as any).hairTexture || "unspecified",
        norwood_scale_rating: (profile as any).norwoodScaleRating ?? 1,
        density: (profile as any).density || "medium",
        growth_direction: (profile as any).growthDirection || "forward",
      },
    },
    historical_scans: recentHistory
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-5)
      .map((h) => ({
        timestamp: h.timestamp,
        score: h.score,
        asymmetryIndex: h.asymmetryIndex,
        postureAngle: h.postureAngle,
      })),
    data_quality: {
      front_calibrated: !!(profile as any).isFrontCalibrated,
      side_calibrated: !!(profile as any).isSideCalibrated,
    },
  };
}
