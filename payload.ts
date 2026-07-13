import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export async function POST(request: Request) {
  // 1. Initialize fallback parameters with default values
  let age = 21;
  let gender = "male";
  let heightCm = 175;
  let weightKg = 70;
  let calculatedBmi = 22.8;
  let estimatedBodyFat = 16;

  let faceShape = "Oval";
  let asymmetryRaw = 4.25;
  let primaryDeviationZone = "balanced";
  let canthalTilt = "positive";

  let structuralType = "Defined/Symmetric";
  let gonialAngleEstimate = 122;
  let submentalFatStorage = "minimal";

  let verticalThirdsRatio = "1:1.0:1.0";
  let bizygomaticToBigonialRatio = 1.2;

  let forwardHeadAngle = 14.5;
  let severityClassification = "mild";
  let cervicalSpineStrainIndex = 25;

  let roundedShoulders = "minimal";
  let scapularProtraction = "minimal";

  let skinCondition = "combination";
  let sebumProduction = "moderate";
  let activePathologies: string[] = [];
  let scarringType = "none";

  let hairTexture = "straight";
  let norwoodScaleRating = 1;
  let hairDensity = "medium";
  let growthDirection = "forward";

  let groomingStyle = "stubble";

  // Define dynamic fallback generator. Previously this returned only `{source, routine}` with
  // no machine-readable signal that it's NOT real AI output — the client had no reliable way
  // to distinguish a genuine Gemini response from this static rule-based one. `ok: false` plus
  // a `reason` fixes that; every UI consumer must now branch on `ok` and show a visible badge
  // when it's false (see RoutineBuilder/ReportCard).
  const getFallbackRoutine = (sourceLabel: string, reason: string) => {
    const faceShapeLower = faceShape.toLowerCase();
    const isRound = faceShapeLower.includes("round");
    const isSquare = faceShapeLower.includes("square");
    const isHeart = faceShapeLower.includes("heart");

    const haircut = isRound
      ? "Textured crop with high fade to add vertical dimension and slim sides"
      : isSquare
      ? "Soft textured pompadour with tapered sides to soften strong jaw angles"
      : isHeart
      ? "Mid-length scissor cut with side parting to balance broad forehead"
      : `Classic low-taper fade with textured volume on top tailored to ${faceShape} face shape`;

    const symmetryScore10 = Math.max(1, Math.min(10, Math.round(10 - asymmetryRaw * 0.45)));
    const calculatedSymmetryPercent = Math.round(symmetryScore10 * 10);

    const structuralKinesiology = [
      {
        title: "Cervical Retraction (Chin Tucks)",
        description: `Pull your head straight back, keeping eyes level, like making a double chin. Reduces forward head load of ${cervicalSpineStrainIndex} lbs equivalent.`,
        frequency: "Daily",
        volume: "3 sets of 12 reps",
        targetMetrics: "Forward head posture angle",
        currentValue: forwardHeadAngle,
        targetValue: 12,
        unit: "deg",
      },
      {
        title: roundedShoulders !== "minimal" ? "Pectoralis Major Doorway Stretch" : "Prone Cobra Posture Lift",
        description: roundedShoulders !== "minimal" 
          ? "Place forearms on doorway frame, step forward gently to stretch pectorals and reverse rounded shoulders."
          : "Lie face down, squeeze shoulder blades together and lift upper chest off the floor, rotating thumbs upward.",
        frequency: "Daily, mid-day",
        volume: "3 holds of 30 seconds",
        targetMetrics: "Shoulder girdle roundedness",
        currentValue: roundedShoulders === "minimal" ? 0 : 1,
        targetValue: 0,
        unit: "severity (0=minimal,1=moderate)",
      },
      {
        title: asymmetryRaw > 4 ? "Asymmetric Mastication Adjustment" : "Symmetric Masseter Release",
        description: asymmetryRaw > 4
          ? `Focus chewing primary boluses on the less-developed side (${primaryDeviationZone.toUpperCase()} deviation detected) to restore lateral masseter balance.`
          : "Use fingers or gua sha to apply firm circular strokes on both masseter muscles to relieve nocturnal clenching.",
        frequency: "With every meal",
        volume: "Conscious 15-minute alignment",
        targetMetrics: "Bilateral asymmetry raw index",
        currentValue: asymmetryRaw,
        targetValue: Math.max(0, asymmetryRaw - 1.5),
        unit: "%",
      }
    ];

    const dermBiochemistry = [
      {
        title: activePathologies.length > 0 
          ? "Targeted Active Treatment (Salicylic Acid / Benzoyl Peroxide)" 
          : (skinCondition === "oily" ? "Niacinamide 10% + Zinc PCA 1%" : "Hyaluronic Acid 2% + Panthenol"),
        purpose: activePathologies.length > 0 
          ? `Mitigate active pathologies: ${activePathologies.join(", ")}` 
          : `Control sebum level (${sebumProduction.toUpperCase()}) and optimize moisture barrier`,
        applicationInstructions: "PM, after gentle non-stripping cleanser",
        scientificNotes: `Optimized for ${skinCondition.toUpperCase()} skin condition at chronological age ${age}Y.`
      },
      {
        title: scarringType !== "none" ? "Micro-peeling Glycolic Acid 5% or Retinol 0.3%" : "Ceramide Complex Barrier Cream",
        purpose: scarringType !== "none" ? `Resurface and improve epidermal texture for ${scarringType}` : "Lock in moisture and repair stratum corneum",
        applicationInstructions: "Nightly, thin layer",
        scientificNotes: "Enhances fibroblast collagen production and accelerates cellular turnover."
      }
    ];

    const geometricGrooming = {
      haircutSuggestion: haircut,
      facialHairGeometry: groomingStyle === "clean-shaven"
        ? `Slick clean finish highlighting the ${structuralType} jaw structure`
        : `Structured grooming lines at the bigonial boundary (bizygomatic ratio: ${bizygomaticToBigonialRatio}) to offset any asymmetry`,
      eyebrowSymmetryMap: `Tapered horizontal map to elevate the ${canthalTilt} canthal tilt alignment`,
      aestheticJustification: `Precision calibrated haircut and facial styling specifically designed to balance the ${faceShape} shape and vertical thirds ratio of ${verticalThirdsRatio}.`
    };

    const lifestyleDirectives = [
      `Adjust workstation monitors to direct eye level to neutralize the ${forwardHeadAngle}° forward cervical angle.`,
      `Sleep on back using a cervical support roll to stabilize shoulders and head posture.`,
      `Adopt a unilateral-free chewing habit to optimize masseter muscle symmetrical volume.`
    ];

    return {
      ok: false,
      source: sourceLabel,
      reason,
      routine: {
        structuralKinesiology,
        skinCondition,
        faceShape,
        dermBiochemistry,
        geometricGrooming,
        lifestyleDirectives
      }
    };
  };

  try {
    // 2. PARAMETER INGESTION: Parse the incoming JSON body safely
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      console.warn("Unable to parse request body JSON, using defaults.");
    }

    // Try to extract from the nested high-fidelity structure:
    const userMetadata = body?.user_metadata || {};
    const craniofacial = body?.craniofacial_geometry || {};
    const posture = body?.cervicothoracic_posture || {};
    const dermTrich = body?.dermatology_and_trichology || {};

    age = typeof userMetadata.age === "number" ? userMetadata.age : (typeof body?.age === "number" ? body.age : 21);
    gender = userMetadata.gender || "male";
    const bodyMetrics = userMetadata.body_metrics || {};
    heightCm = typeof bodyMetrics.height_cm === "number" ? bodyMetrics.height_cm : 175;
    weightKg = typeof bodyMetrics.weight_kg === "number" ? bodyMetrics.weight_kg : 70;
    calculatedBmi = typeof bodyMetrics.calculated_bmi === "number" ? bodyMetrics.calculated_bmi : 22.8;
    estimatedBodyFat = typeof bodyMetrics.estimated_body_fat_percentage === "number" ? bodyMetrics.estimated_body_fat_percentage : 16;

    faceShape = craniofacial.face_shape_classification || body?.faceShape || "Oval";
    const asymmetry = craniofacial.asymmetry || {};
    asymmetryRaw = typeof asymmetry.raw_index === "number" ? asymmetry.raw_index : (typeof body?.asymmetryIndex === "number" ? body.asymmetryIndex : 4.25);
    primaryDeviationZone = asymmetry.primary_deviation_zone || "balanced";
    canthalTilt = asymmetry.canthal_tilt || "positive";

    const jawAndChin = craniofacial.jaw_and_chin || {};
    structuralType = jawAndChin.structural_type || "Defined/Symmetric";
    gonialAngleEstimate = typeof jawAndChin.gonial_angle_estimate === "number" ? jawAndChin.gonial_angle_estimate : 122;
    submentalFatStorage = jawAndChin.submental_fat_storage || "minimal";

    const facialProportions = craniofacial.facial_proportions || {};
    verticalThirdsRatio = facialProportions.vertical_thirds_ratio || "1:1.0:1.0";
    bizygomaticToBigonialRatio = typeof facialProportions.bizygomatic_to_bigonial_ratio === "number" ? facialProportions.bizygomatic_to_bigonial_ratio : 1.2;

    const forwardHeadPosture = posture.forward_head_posture || {};
    forwardHeadAngle = typeof forwardHeadPosture.raw_angle_degrees === "number" ? forwardHeadPosture.raw_angle_degrees : (typeof body?.forwardHeadAngle === "number" ? body.forwardHeadAngle : 14.5);
    severityClassification = forwardHeadPosture.severity_classification || "mild";
    cervicalSpineStrainIndex = typeof forwardHeadPosture.cervical_spine_strain_index === "number" ? forwardHeadPosture.cervical_spine_strain_index : 25;

    const shoulderGirdle = posture.shoulder_girdle || {};
    roundedShoulders = shoulderGirdle.rounded_shoulders || "minimal";
    scapularProtraction = shoulderGirdle.scapular_protraction || "minimal";

    const skinProfile = dermTrich.skin_profile || {};
    skinCondition = skinProfile.type || body?.skinType || body?.skinCondition || "combination";
    sebumProduction = skinProfile.sebum_production || "moderate";
    activePathologies = Array.isArray(skinProfile.active_pathologies) ? skinProfile.active_pathologies : [];
    scarringType = skinProfile.scarring_type || "none";

    const hairProfile = dermTrich.hair_profile || {};
    hairTexture = hairProfile.texture_type || body?.hairTexture || "straight";
    norwoodScaleRating = typeof hairProfile.norwood_scale_rating === "number" ? hairProfile.norwood_scale_rating : 1;
    hairDensity = hairProfile.density || "medium";
    growthDirection = hairProfile.growth_direction || "forward";

    groomingStyle = body?.groomingStyle || "stubble";

    const historicalScans = body?.historical_scans || [];

    const apiKey = process.env.GEMINI_API_KEY;

    // 3. HARDENED FAILSAFE: Return structured fallback instantly if API key is not defined
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Returning offline mode structured fallback routine.");
      return NextResponse.json(getFallbackRoutine("AuraMax Static Calibration Engine (Offline Mode)", "GEMINI_API_KEY is not configured on the server."));
    }

    // Lazy initialize the Gemini client with appropriate headers
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Formulate historical scans context if they exist
    let historicalContext = "";
    if (historicalScans && historicalScans.length > 0) {
      historicalContext = `\n[HISTORICAL SCAN CHRONOLOGY PROGRESSION]\n` +
        historicalScans.map((h: any, i: number) => {
          return `- Record ${i + 1} (${h.date || h.timestamp}): Score: ${h.score}/10, Asymmetry Index: ${h.asymmetry_index}%, Posture Angle: ${h.posture_angle}°, Jaw/Height Ratio: ${h.jaw_height_ratio}`;
        }).join("\n") +
        `\n\nCRITICAL AI DIRECTIVE:\n` +
        `The user has historical milestones recorded. You MUST explicitly analyze the rate of physical adjustment over time (e.g., tracking changes in forward posture from older records to current levels, or stabilization in facial asymmetry indexes). Use this rate of adjustment velocity to dynamically adapt and modify the active cervical kinesiology, structural physical training, and biochemical skin/hair guidelines to target active bottlenecks and accelerate optimization speed.`;
    }

    // 4. STRUCTURED GEMINI PROMPT: Formulate a specialized prompt with live biometrics
    const prompt = `You are the AuraMax Bio-Aesthetic Core AI.
    Calculate a hyper-customized facial aesthetics, skin, hair, and posture routine based on these specific high-fidelity biometric inputs:
    
    [USER PROFILE]
    - Age: ${age}
    - Gender: ${gender}
    - Height: ${heightCm} cm
    - Weight: ${weightKg} kg
    - BMI: ${calculatedBmi}
    - Body Fat Percentage: ${estimatedBodyFat}%

    [CRANIOFACIAL GEOMETRY]
    - Face Shape: ${faceShape}
    - Bilateral Asymmetry Index: ${asymmetryRaw}% (Deviation from center midline)
    - Primary Deviation Zone: ${primaryDeviationZone}
    - Canthal Tilt: ${canthalTilt}
    - Jaw & Chin Structural Type: ${structuralType}
    - Gonial Angle Estimate: ${gonialAngleEstimate}°
    - Submental Fat Storage: ${submentalFatStorage}
    - Vertical Thirds Proportion Ratio: ${verticalThirdsRatio}
    - Bizygomatic-to-Bigonial Width Ratio: ${bizygomaticToBigonialRatio}

    [POSTURE ANALYSIS]
    - Forward Head Posture Angle: ${forwardHeadAngle}° (Normal is <12°, forward angle increases strain)
    - Posture Severity Classification: ${severityClassification}
    - Cervical Spine Strain Index: ${cervicalSpineStrainIndex} lbs equivalent
    - Shoulder Girdle Roundedness: ${roundedShoulders}
    - Scapular Protraction: ${scapularProtraction}

    [DERMATOLOGY & TRICHOLOGY]
    - Skin Profile Type: ${skinCondition}
    - Sebum Production Level: ${sebumProduction}
    - Active Pathologies: ${JSON.stringify(activePathologies)}
    - Scarring Type: ${scarringType}
    - Hair Texture Type: ${hairTexture}
    - Norwood Hair Loss Scale: Class ${norwoodScaleRating}
    - Follicular Density: ${hairDensity}
    - Growth/Spiral Direction: ${growthDirection}
    ${historicalContext}

    Analyze this data with clinical precision and generate a targeted 4-part routine:
    1. structuralKinesiology (cervicothoracic posture corrections, jaw kinesiotherapy, mastication adjustments based on asymmetry and cervical strain).
    2. dermBiochemistry (custom topical chemical actives, application timings, and bio-mechanisms for skin type, pathologies, and scarring).
    3. geometricGrooming (exact haircut and beard/facial hair lines tailored to the face shape, bigonial ratio, hair texture, and growth direction).
    4. lifestyleDirectives (exactly 3 targeted lifestyle habit adjustments for postural relief, hydration, or sleep hygiene).

    You must format your response strictly as a JSON object matching the requested schema.`;

    // 5. STRICT JSON SCHEMA INTERFACE: Requesting schema structured exactly to UI expectations
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            routine: {
              type: Type.OBJECT,
              properties: {
                structuralKinesiology: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "Name of the corrective exercise or posture training (e.g. Cervical Retraction, Chin Tucks)." },
                      description: { type: Type.STRING, description: "Detailed step-by-step instructions on form, mechanics, and biomechanics." },
                      frequency: { type: Type.STRING, description: "How often to perform (e.g., Daily, 3x per week)." },
                      volume: { type: Type.STRING, description: "Reps, sets, or duration (e.g., 3 sets of 10, or hold for 30 seconds)." },
                      targetMetrics: { type: Type.STRING, description: "Short human-readable label for the bio-objective (e.g., 'Forward head posture angle')." },
                      currentValue: { type: Type.NUMBER, description: "The user's current measured value for this metric, taken directly from the input data — must not be invented." },
                      targetValue: { type: Type.NUMBER, description: "The realistic target value for this metric after following this exercise consistently." },
                      unit: { type: Type.STRING, description: "Unit for currentValue/targetValue (e.g. 'deg', '%', 'ratio')." },
                    },
                    required: ["title", "description", "frequency", "volume", "targetMetrics", "currentValue", "targetValue", "unit"],
                  },
                },
                dermBiochemistry: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "The recommended active chemical or ingredient (e.g., Salicylic Acid, Retinol, Ceramide NP)." },
                      purpose: { type: Type.STRING, description: "Biochemical mechanism or why it works on their skin profile." },
                      applicationInstructions: { type: Type.STRING, description: "When and how to apply (e.g., PM, every other night, AM/PM daily)." },
                      scientificNotes: { type: Type.STRING, description: "Underlying skin cellular study note or scientific explanation." },
                    },
                    required: ["title", "purpose", "applicationInstructions", "scientificNotes"],
                  },
                },
                geometricGrooming: {
                  type: Type.OBJECT,
                  properties: {
                    haircutSuggestion: { type: Type.STRING, description: "Precise haircut and styling recommended to balance this face shape and hair texture." },
                    facialHairGeometry: { type: Type.STRING, description: "How to shave, taper, or trim facial hair to optimize jaw structure and symmetry." },
                    eyebrowSymmetryMap: { type: Type.STRING, description: "Grooming instructions for the eyebrows to heighten visual symmetry." },
                    aestheticJustification: { type: Type.STRING, description: "Deep geometric and aesthetic explanation of how these suggestions create face shape harmony." },
                  },
                  required: ["haircutSuggestion", "facialHairGeometry", "eyebrowSymmetryMap", "aestheticJustification"],
                },
                lifestyleDirectives: {
                  type: Type.ARRAY,
                  description: "Exactly 3 daily habit recommendations to assist posture or aesthetic preservation.",
                  items: { type: Type.STRING },
                },
              },
              required: [
                "structuralKinesiology",
                "dermBiochemistry",
                "geometricGrooming",
                "lifestyleDirectives"
              ],
            },
          },
          required: ["routine"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty content returned from the Gemini AI engine.");
    }

    const parsedData = JSON.parse(responseText.trim());
    return NextResponse.json({
      ok: true,
      source: "AuraMax Biometric AI Engine",
      routine: parsedData.routine,
    });

  } catch (error: any) {
    console.error("AuraMax Recommendations core failed, falling back to static rules:", error);
    return NextResponse.json(
      getFallbackRoutine(
        "AuraMax Static Calibration Engine (Failsafe Mode)",
        error?.message ? String(error.message).slice(0, 300) : "Unknown error calling the Gemini API."
      )
    );
  }
}
