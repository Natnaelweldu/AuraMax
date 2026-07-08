import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON size limits in case of any larger telemetry
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client with fallback warning
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined. Routine generation will fall back to smart local rules.");
}

// REST API for routine generation using structured schema
app.post("/api/gemini/routine", async (req, res) => {
  try {
    const {
      faceShape,
      asymmetryIndex,
      postureAngle,
      skinCondition, // 'dry' | 'oily' | 'combination' | 'normal' | 'congested'
      groomingStyle, // 'clean-shaven' | 'stubble' | 'beard'
      subscores
    } = req.body;

    if (!ai) {
      // Return beautiful high-quality fallback routine if no API key
      return res.json({
        source: "fallback",
        routine: getFallbackRoutine(faceShape, postureAngle, skinCondition, groomingStyle)
      });
    }

    const prompt = `Generate a highly professional, cyber-luxury self-optimization routine payload for AuraMax.
Biometrics Profile:
- Calculated Face Shape: ${faceShape || "Unknown"}
- Facial Asymmetry Index: ${asymmetryIndex ?? 0.0}% (Ideal target: < 3.0%)
- Forward Head Posture Angle: ${postureAngle ?? 0.0}° (Ideal target: < 15.0°)
- Primary Skin Classification: ${skinCondition || "Balanced"}
- Grooming/Beard Styling Preference: ${groomingStyle || "Unspecified"}
- Category Subscores: Jawline & Frame: ${subscores?.jawline || 80}/100, Skin Health: ${subscores?.skin || 80}/100, Hair & Grooming: ${subscores?.grooming || 80}/100, Symmetry: ${subscores?.symmetry || 80}/100.

Create highly specific, scientific, and realistic recommendations. No placeholders. Make sure exercises directly refer to the posture angle of ${postureAngle ?? 0}° and haircut suggestions are mathematically tailored to ${faceShape || "their face shape"}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are AuraMax Core AI, an elite biochemical and kinesiological analyzer specializing in facial optimization, symmetry training, skin health, and structural aesthetics. Output only valid JSON strictly matching the requested schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["kinesiology", "topicalActives", "groomingStyle", "lifestyleDirectives"],
          properties: {
            kinesiology: {
              type: Type.ARRAY,
              description: "Structural exercises to target asymmetry or head posture.",
              items: {
                type: Type.OBJECT,
                required: ["exerciseName", "description", "frequency", "repsSets", "targetPostureAngle"],
                properties: {
                  exerciseName: { type: Type.STRING },
                  description: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  repsSets: { type: Type.STRING },
                  targetPostureAngle: { type: Type.STRING, description: "Justification of how this exercise counters the detected posture angle." }
                }
              }
            },
            topicalActives: {
              type: Type.ARRAY,
              description: "Targeted dermatological actives.",
              items: {
                type: Type.OBJECT,
                required: ["ingredient", "purpose", "applicationFrequency", "scientificJustification"],
                properties: {
                  ingredient: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  applicationFrequency: { type: Type.STRING },
                  scientificJustification: { type: Type.STRING }
                }
              }
            },
            groomingStyle: {
              type: Type.OBJECT,
              required: ["haircutSuggestion", "facialHairSuggestion", "eyebrowShaping", "reasoning"],
              properties: {
                haircutSuggestion: { type: Type.STRING, description: "Geometric haircut tailored strictly to calculated face shape." },
                facialHairSuggestion: { type: Type.STRING, description: "Facial hair or grooming style matching current preference and facial ratios." },
                eyebrowShaping: { type: Type.STRING, description: "Symmetry recommendations for eyebrows." },
                reasoning: { type: Type.STRING }
              }
            },
            lifestyleDirectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Daily high-impact lifestyle habits (e.g. sleep posture, chewing habits for jaw asymmetry)."
            }
          }
        }
      }
    });

    const text = response.text || "{}";
    const routine = JSON.parse(text);
    return res.json({
      source: "gemini",
      routine
    });

  } catch (error: any) {
    console.error("Gemini route error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// High quality fallback generator in case API key is unavailable
function getFallbackRoutine(faceShape: string, postureAngle: number, skinCondition: string, grooming: string) {
  const isPosturalIssue = postureAngle > 15;
  return {
    kinesiology: [
      {
        exerciseName: "Isometric Chin Tuck Press",
        description: "Pull head straight back (like making a double chin) while keeping gaze level. Press back of head against resistance.",
        frequency: "3x daily",
        repsSets: "15 reps x 5s hold",
        targetPostureAngle: `Specifically counters the elevated posture angle of ${postureAngle}° by strengthening deep cervical flexors.`
      },
      {
        exerciseName: "Prone Cobra (Y-T-W Activation)",
        description: "Lie face down, raise chest off ground and rotate thumbs upward, pulling scapulae back and down to activate rhomboids.",
        frequency: "Once daily",
        repsSets: "3 sets x 12 reps",
        targetPostureAngle: `Re-anchors thoracic spine to stabilize neck curvature from your current offset angle of ${postureAngle}°.`
      },
      {
        exerciseName: "Unilateral Masseter Release & Load Balance",
        description: "Massage the hypertonic (tighter) masseter side for 2 minutes, then intentionally chew on the weaker side to normalize jaw symmetry.",
        frequency: "Daily with meals",
        repsSets: "2 minutes release / active balance",
        targetPostureAngle: "Balances lateral muscle hypertrophy to lower calculated asymmetry index."
      }
    ],
    topicalActives: [
      {
        ingredient: skinCondition === "oily" || skinCondition === "congested" ? "Salicylic Acid (BHA 2%)" : "Hyaluronic Acid (Multi-molecular)",
        purpose: skinCondition === "oily" || skinCondition === "congested" ? "Lipophilic pore-clearing and sebum regulation." : "Deep hydration barrier replenishment.",
        applicationFrequency: "PM, 3x per week",
        scientificJustification: `Directly targets ${skinCondition} skin type by restoring stratum corneum moisture and skin cell turnover.`
      },
      {
        ingredient: "Niacinamide (5%)",
        purpose: "Strengthen epidermal barrier and normalize hyperpigmentation.",
        applicationFrequency: "AM/PM daily",
        scientificJustification: "Upregulates ceramide synthesis and reduces trans-epidermal water loss."
      }
    ],
    groomingStyle: {
      haircutSuggestion: faceShape === "Oval" 
        ? "Mid-fade with structured textured crop to maintain natural aesthetic balance."
        : faceShape === "Square"
        ? "Classic side part with softened length on top to offset strong angular jaw vertices."
        : faceShape === "Round"
        ? "Pompadour with high skin fade to add vertical dimension and create a more elongated appearance."
        : "Textured slick-back with tapered sides to optimize forehead-to-jaw ratio.",
      facialHairSuggestion: grooming === "clean-shaven" 
        ? "Keep skin ultra-sharp; clean shaven emphasizes hard bone structures."
        : grooming === "beard"
        ? "Boxed beard style with sharp, straight cheek lines to structure jaw contouring."
        : "Heavy stubble with sharp neck taper to emphasize jawline shadow.",
      eyebrowShaping: "Straight-across styling with subtle outer arch raise to visually lift face and increase horizontal symmetry.",
      reasoning: `Tailored strictly to calculated ${faceShape} face shape to optimize the aesthetic outline of facial structures.`
    },
    lifestyleDirectives: [
      "Avoid sleeping on one side; train yourself to sleep on your back with an ergonomic cervical roll pillow.",
      "Chew strictly balanced on both sides, using sugar-free mastic gum to build symmetric masseter tone.",
      "Set a posture check alarm every 45 minutes of screen work to pull shoulders down and back."
    ]
  };
}

// Vite middleware configuration for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AuraMax Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
