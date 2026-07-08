export interface RecommendationRequest {
  faceShape: string;
  symmetryScore: number;
  forwardHeadAngle: number;
  hairTexture: string;
  age: number;
  skinCondition: string;
  groomingStyle: string;
}

export interface RecommendationResponse {
  source: string;
  routine: {
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
  };
}

/**
 * Executes a native POST request to /api/recommendations using client biometric parameters.
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

  return response.json();
}
