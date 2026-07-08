import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      faceShape = "Oval",
      symmetryScore = 85,
      forwardHeadAngle = 14.5,
      hairTexture = "wavy",
      age = 28,
      skinCondition = "combination",
      groomingStyle = "stubble",
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // Default high-quality structured backup response matching the exact faceShape and inputs
    const getFallbackRoutine = () => {
      const faceShapeLower = faceShape.toLowerCase();
      const haircut = faceShapeLower === "round"
        ? "Textured crop with high fade to add vertical dimension"
        : faceShapeLower === "square"
        ? "Soft textured pompadour with tapered sides to soften angles"
        : faceShapeLower === "heart"
        ? "Mid-length scissor cut with side parting to balance forehead"
        : "Classic low-taper fade with textured volume on top";

      return {
        source: "AuraMax Static Calibration Engine (No API Key)",
        routine: {
          kinesiology: [
            {
              exerciseName: "Cervical Retraction (Chin Tucks)",
              description: "Pull your head straight back, keeping eyes level, like making a double chin. Hold 5s.",
              frequency: "Daily",
              repsSets: "3 sets of 10 reps",
              targetPostureAngle: `< 12° (Current: ${forwardHeadAngle}°)`,
            },
            {
              exerciseName: "Suboccipital Release Stretch",
              description: "Gently tuck chin and pull the base of the skull upward to release deep cervical extensors.",
              frequency: "Twice daily",
              repsSets: "4 holds of 20 seconds",
              targetPostureAngle: `< 12° (Current: ${forwardHeadAngle}°)`,
            },
            {
              exerciseName: "Symmetric Masseter Massage & Release",
              description: "Apply firm circular pressure to masseter muscles on both sides to release unilateral biting tension.",
              frequency: "Daily, before rest",
              repsSets: "2 minutes per side",
              targetPostureAngle: `Symmetry Target: > 92% (Current: ${symmetryScore}%)`,
            },
          ],
          topicalActives: [
            {
              ingredient: skinCondition === "oily" ? "Salicylic Acid (BHA) 2%" : "Niacinamide 5%",
              purpose: skinCondition === "oily" ? "Deep follicular sebum control and pore clearing" : "Barrier support and sebum stabilization",
              applicationFrequency: "PM, every other night",
              scientificJustification: `Regulates lipid production optimized for ${skinCondition} skin profiles.`,
            },
            {
              ingredient: "Hyaluronic Acid & Ceramide NP Complex",
              purpose: "Transepidermal water loss reduction",
              applicationFrequency: "AM/PM daily",
              scientificJustification: "Maintains optimal stratum corneum hydration to support cellular turnover.",
            },
          ],
          groomingStyle: {
            haircutSuggestion: haircut,
            facialHairSuggestion: groomingStyle === "clean-shaven"
              ? "Slick, clean-shaven definition with straight lines across cheeks"
              : "Structured low-cheek stubble to contour jaw symmetry",
            eyebrowShaping: "Neat horizontal shape with subtle arch tapering",
            reasoning: `Structured to complement a ${faceShape} shape and maximize facial harmony.`,
          },
          lifestyleDirectives: [
            `Maintain monitor height at direct eye level to decrease cervical load from ${forwardHeadAngle}°`,
            "Sleep on an ergonomic contoured pillow to prevent unilateral facial compression",
            "Perform symmetric chewing exercises to balance jaw masseter muscle hypertrophy",
          ],
        },
      };
    };

    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Falling back to structured static calibration.");
      return NextResponse.json(getFallbackRoutine());
    }

    // Lazy initialize GoogleGenAI client with correct headers
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `You are the AuraMax Bio-Aesthetic Core AI.
    Calculate a hyper-customized facial aesthetics, skin, hair, and posture routine based on these biometrics:
    - Face Shape: ${faceShape}
    - Facial Symmetry Score: ${symmetryScore}% (Asymmetry Index is calculated from this)
    - Forward Head Angle: ${forwardHeadAngle}° (Target is < 12°)
    - Hair Texture: ${hairTexture}
    - Age: ${age}
    - Skin Condition: ${skinCondition}
    - Current Grooming Style: ${groomingStyle}

    Return a highly sophisticated, scientifically justified routine in JSON. Make the scientific justifications extremely detailed and tailored. Ensure it exactly matches the requested JSON schema.`;

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
                kinesiology: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      exerciseName: { type: Type.STRING },
                      description: { type: Type.STRING },
                      frequency: { type: Type.STRING },
                      repsSets: { type: Type.STRING },
                      targetPostureAngle: { type: Type.STRING },
                    },
                    required: ["exerciseName", "description", "frequency", "repsSets", "targetPostureAngle"],
                  },
                },
                topicalActives: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ingredient: { type: Type.STRING },
                      purpose: { type: Type.STRING },
                      applicationFrequency: { type: Type.STRING },
                      scientificJustification: { type: Type.STRING },
                    },
                    required: ["ingredient", "purpose", "applicationFrequency", "scientificJustification"],
                  },
                },
                groomingStyle: {
                  type: Type.OBJECT,
                  properties: {
                    haircutSuggestion: { type: Type.STRING },
                    facialHairSuggestion: { type: Type.STRING },
                    eyebrowShaping: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                  },
                  required: ["haircutSuggestion", "facialHairSuggestion", "eyebrowShaping", "reasoning"],
                },
                lifestyleDirectives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["kinesiology", "topicalActives", "groomingStyle", "lifestyleDirectives"],
            },
          },
          required: ["routine"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini engine");
    }

    const data = JSON.parse(responseText);
    return NextResponse.json({
      source: "AuraMax Biometric AI Engine",
      routine: data.routine,
    });
  } catch (error: any) {
    console.error("AuraMax recommendation API error:", error);
    return NextResponse.json(
      {
        error: "Internal recommendation generation failure",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
