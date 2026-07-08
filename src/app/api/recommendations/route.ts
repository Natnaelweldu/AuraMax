import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export async function POST(request: Request) {
  // Define fallback variables at the top level
  let faceShape = "Oval";
  let symmetryScore = 85;
  let forwardHeadAngle = 14.5;
  let hairTexture = "straight";
  let age = 21;
  let skinCondition = "combination";
  let groomingStyle = "stubble";

  const getFallbackRoutine = (sourceLabel: string) => {
    const faceShapeLower = faceShape.toLowerCase();
    const haircut = faceShapeLower === "round"
      ? "Textured crop with high fade to add vertical dimension"
      : faceShapeLower === "square"
      ? "Soft textured pompadour with tapered sides to soften angles"
      : faceShapeLower === "heart"
      ? "Mid-length scissor cut with side parting to balance forehead"
      : "Classic low-taper fade with textured volume on top";

    return {
      source: sourceLabel,
      routine: {
        structuralKinesiology: [
          {
            title: "Cervical Retraction (Chin Tucks)",
            description: "Pull your head straight back, keeping eyes level, like making a double chin. Hold 5s.",
            frequency: "Daily",
            volume: "3 sets of 10 reps",
            targetMetrics: `< 12° (Current Forward Tilt: ${forwardHeadAngle}°)`,
          },
          {
            title: "Suboccipital Release Stretch",
            description: "Gently tuck chin and pull the base of the skull upward to release deep cervical extensors.",
            frequency: "Twice daily",
            volume: "4 holds of 20 seconds",
            targetMetrics: `< 12° (Current Forward Tilt: ${forwardHeadAngle}°)`,
          },
          {
            title: "Symmetric Masseter Massage & Release",
            description: "Apply firm circular pressure to masseter muscles on both sides to release unilateral biting tension.",
            frequency: "Daily, before rest",
            volume: "2 minutes per side",
            targetMetrics: `Symmetry Target: > 92% (Current symmetry: ${symmetryScore}%)`,
          },
        ],
        dermBiochemistry: [
          {
            title: skinCondition === "oily" ? "Salicylic Acid (BHA) 2%" : "Niacinamide 5%",
            purpose: skinCondition === "oily" ? "Deep follicular sebum control and pore clearing" : "Barrier support and sebum stabilization",
            applicationInstructions: "PM, every other night",
            scientificNotes: `Regulates lipid production optimized for ${skinCondition} skin profiles.`,
          },
          {
            title: "Hyaluronic Acid & Ceramide NP Complex",
            purpose: "Transepidermal water loss reduction",
            applicationInstructions: "AM/PM daily",
            scientificNotes: "Maintains optimal stratum corneum hydration to support cellular turnover.",
          },
        ],
        geometricGrooming: {
          haircutSuggestion: haircut,
          facialHairGeometry: groomingStyle === "clean-shaven"
            ? "Slick, clean-shaven definition with straight lines across cheeks"
            : "Structured low-cheek stubble to contour jaw symmetry",
          eyebrowSymmetryMap: "Neat horizontal shape with subtle arch tapering",
          aestheticJustification: `Structured to complement a ${faceShape} shape and maximize facial harmony.`,
        },
        lifestyleDirectives: [
          `Maintain monitor height at direct eye level to decrease cervical load from current ${forwardHeadAngle}°`,
          "Sleep on an ergonomic contoured pillow to prevent unilateral facial compression",
          "Perform symmetric chewing exercises to balance jaw masseter muscle hypertrophy",
        ],
      },
    };
  };

  try {
    // 1. PARAMETER INGESTION: Parse the incoming JSON body to extract specific metrics
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      console.warn("Unable to parse request body JSON, using defaults.");
    }

    // Try to extract from the nested high-fidelity structure first:
    const userMetadata = body?.user_metadata || {};
    const craniofacial = body?.craniofacial_geometry || {};
    const posture = body?.cervicothoracic_posture || {};
    const dermTrich = body?.dermatology_and_trichology || {};

    faceShape = craniofacial.face_shape_classification || body?.faceShape || "Oval";
    
    // Support either old style symmetryScore or new style bilateralSymmetry (1-10)
    symmetryScore = typeof body?.bilateralSymmetry === "number" 
      ? Math.round(body.bilateralSymmetry * 10) 
      : (typeof craniofacial.asymmetry?.raw_index === "number" 
         ? Math.round((10 - craniofacial.asymmetry.raw_index * 0.45) * 10)
         : (typeof body?.symmetryScore === "number" ? body.symmetryScore : 85));

    const asymmetryRaw = typeof craniofacial.asymmetry?.raw_index === "number"
      ? craniofacial.asymmetry.raw_index
      : (typeof body?.asymmetryIndex === "number" ? body.asymmetryIndex : 4.25);
    
    // Support either old style forwardHeadAngle or new style forwardPosture (1-10) score
    if (typeof body?.forwardHeadAngle === "number") {
      forwardHeadAngle = body.forwardHeadAngle;
    } else if (typeof posture.forward_head_posture?.raw_angle_degrees === "number") {
      forwardHeadAngle = posture.forward_head_posture.raw_angle_degrees;
    } else if (typeof body?.forwardPosture === "number") {
      forwardHeadAngle = parseFloat((12.0 + (10.0 - body.forwardPosture) * 2.0).toFixed(1));
    } else {
      forwardHeadAngle = 14.5;
    }

    hairTexture = dermTrich.hair_profile?.texture_type || body?.hairTexture || "straight";
    age = typeof userMetadata.age === "number" ? userMetadata.age : (typeof body?.age === "number" ? body.age : 21);
    skinCondition = dermTrich.skin_profile?.type || body?.skinType || body?.skinCondition || "combination";
    groomingStyle = body?.groomingStyle || "stubble";

    // Extra subscores from the active dashboard state payload
    const jawlineFrame = typeof body?.jawlineFrame === "number" ? body.jawlineFrame : 8.0;
    const bilateralSymmetry = typeof body?.bilateralSymmetry === "number" ? body.bilateralSymmetry : 8.5;
    const forwardPosture = typeof body?.forwardPosture === "number" ? body.forwardPosture : 8.0;
    const skinHealth = typeof body?.skinHealth === "number" ? body.skinHealth : 8.0;
    const groomStyling = typeof body?.groomStyling === "number" ? body.groomStyling : 8.2;

    const apiKey = process.env.GEMINI_API_KEY;

    // 2. HARDENED FAILSAFE: Return structured fallback instantly if API key is not defined
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Returning offline mode structured fallback routine.");
      return NextResponse.json(getFallbackRoutine("AuraMax Static Calibration Engine (Offline Mode)"));
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

    // 3. STRUCTURED GEMINI PROMPT: Formulate a specialized prompt with live biometrics
    const prompt = `You are the AuraMax Bio-Aesthetic Core AI.
    Calculate a hyper-customized facial aesthetics, skin, hair, and posture routine based on these specific high-fidelity biometric inputs:
    
    [USER PROFILE]
    - Age: ${age}
    - Gender: ${userMetadata.gender || "male"}
    - Height: ${userMetadata.body_metrics?.height_cm || 175} cm
    - Weight: ${userMetadata.body_metrics?.weight_kg || 70} kg
    - BMI: ${userMetadata.body_metrics?.calculated_bmi || 22.8}
    - Body Fat Percentage: ${userMetadata.body_metrics?.estimated_body_fat_percentage || 16}%

    [CRANIOFACIAL GEOMETRY]
    - Face Shape: ${faceShape}
    - Bilateral Asymmetry Index: ${asymmetryRaw}% (Deviation from center midline)
    - Primary Deviation Zone: ${craniofacial.asymmetry?.primary_deviation_zone || "balanced"}
    - Canthal Tilt: ${craniofacial.asymmetry?.canthal_tilt || "positive"}
    - Jaw & Chin Structural Type: ${craniofacial.jaw_and_chin?.structural_type || "Defined/Symmetric"}
    - Gonial Angle Estimate: ${craniofacial.jaw_and_chin?.gonial_angle_estimate || 122}°
    - Submental Fat Storage: ${craniofacial.jaw_and_chin?.submental_fat_storage || "minimal"}
    - Vertical Thirds Proportion Ratio: ${craniofacial.facial_proportions?.vertical_thirds_ratio || "1:1.0:1.0"}
    - Bizygomatic-to-Bigonial Width Ratio: ${craniofacial.facial_proportions?.bizygomatic_to_bigonial_ratio || 1.2}

    [POSTURE ANALYSIS]
    - Forward Head Posture Angle: ${forwardHeadAngle}° (Normal is <12°, forward angle increases strain)
    - Posture Severity Classification: ${posture.forward_head_posture?.severity_classification || "mild"}
    - Cervical Spine Strain Index: ${posture.forward_head_posture?.cervical_spine_strain_index || 25} lbs equivalent
    - Shoulder Girdle Roundedness: ${posture.shoulder_girdle?.rounded_shoulders || "minimal"}
    - Scapular Protraction: ${posture.shoulder_girdle?.scapular_protraction || "minimal"}

    [DERMATOLOGY & TRICHOLOGY]
    - Skin Profile Type: ${skinCondition}
    - Sebum Production Level: ${typeof dermTrich.skin_profile?.sebum_production === "string" ? dermTrich.skin_profile.sebum_production : "moderate"}
    - Active Pathologies: ${JSON.stringify(dermTrich.skin_profile?.active_pathologies || [])}
    - Scarring Type: ${dermTrich.skin_profile?.scarring_type || "none"}
    - Hair Texture Type: ${hairTexture}
    - Norwood Hair Loss Scale: Class ${dermTrich.hair_profile?.norwood_scale_rating || 1}
    - Hair Follicular Density: ${dermTrich.hair_profile?.density || "medium"}
    - Growth/Spiral Direction: ${dermTrich.hair_profile?.growth_direction || "forward"}

    Analyze this data with clinical precision and generate a targeted 4-part routine:
    1. structuralKinesiology (cervicothoracic posture corrections, jaw kinesiotherapy, mastication adjustments based on asymmetry and cervical strain).
    2. dermBiochemistry (custom topical chemical actives, application timings, and bio-mechanisms for skin type, pathologies, and scarring).
    3. geometricGrooming (exact haircut and beard/facial hair lines tailored to the face shape, bigonial ratio, hair texture, and growth direction).
    4. lifestyleDirectives (exactly 3 targeted lifestyle habit adjustments for postural relief, hydration, or sleep hygiene).

    You must format your response strictly as a JSON object matching the requested schema.`;

    // 4. STRICT JSON SCHEMA INTERFACE: Requesting schema structured exactly to UI expectations
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
                      targetMetrics: { type: Type.STRING, description: "The bio-objective target, referencing the current metric (e.g., Target: < 12° from current 15.2°)." },
                    },
                    required: ["title", "description", "frequency", "volume", "targetMetrics"],
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
                  description: "Exactly 3 concise daily habit recommendations to assist posture or aesthetic preservation.",
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
      source: "AuraMax Biometric AI Engine",
      routine: parsedData.routine,
    });

  } catch (error: any) {
    console.error("AuraMax Recommendations core failed, falling back to static rules:", error);
    return NextResponse.json(
      getFallbackRoutine("AuraMax Static Calibration Engine (Failsafe Mode)")
    );
  }
}
