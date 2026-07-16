import type { RecommendationPayload } from "@/lib/payload";

// The payload is now the single, fully-typed shape produced by buildRecommendationPayload()
// in lib/payload.ts — no more ad-hoc partial objects assembled per call site.
export type RecommendationRequest = RecommendationPayload;

export interface KinesiologyItem {
  title: string;
  description: string;
  frequency: string;
  volume: string;
  targetMetrics: string;
  currentValue: number;
  targetValue: number;
  unit: string;
}

export interface DermBiochemistryItem {
  title: string;
  purpose: string;
  applicationInstructions: string;
  scientificNotes: string;
}

export interface GeometricGrooming {
  haircutSuggestion: string;
  facialHairGeometry: string;
  eyebrowSymmetryMap: string;
  aestheticJustification: string;
}

export interface RecommendationResponse {
  // `ok: false` means this is a static rule-based fallback, NOT real Gemini output — the caller
  // MUST branch on this and show a visible "AI offline" indicator rather than presenting it as
  // an AI-personalized routine. `reason` explains why (missing API key, Gemini error, etc.).
  ok: boolean;
  source: string;
  reason?: string;
  routine: {
    structuralKinesiology: KinesiologyItem[];
    dermBiochemistry: DermBiochemistryItem[];
    geometricGrooming: GeometricGrooming;
    lifestyleDirectives: string[];
  };
}

/**
 * Executes a native POST request to /api/recommendations using the fully-built
 * recommendation payload (see lib/payload.ts#buildRecommendationPayload).
 */
export async function fetchAuraRecommendations(payload: RecommendationRequest): Promise<RecommendationResponse> {
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`AuraMax core response failed with status: ${response.status}`);
  }

  const data = await response.json();
  // Older/partial call sites during migration may still return the pre-envelope shape
  // ({source, routine} with no `ok`). Treat a missing `ok` as "unknown provenance" rather
  // than silently assuming success, so the UI still shows a caution badge.
  if (typeof data.ok !== "boolean") {
    return { ok: false, source: data.source || "unknown", reason: "Response did not include a provenance flag.", routine: data.routine };
  }
  return data as RecommendationResponse;
}
