import Dexie, { Table } from "dexie";

export interface BiometricProfile {
  id?: string; // e.g., 'current_profile'
  frontImage: string | null;
  sideImage: string | null;
  closeupImage: string | null;
  faceShape: string;
  asymmetryIndex: number;
  postureAngle: number;
  tiltAngle?: number;
  jawHeightRatio?: number;
  skinCondition: string; // 'dry' | 'oily' | 'combination' | 'normal' | 'congested'
  groomingStyle: string; // 'clean-shaven' | 'stubble' | 'beard'
  subscores: {
    jawline: number;
    skin: number;
    grooming: number;
    symmetry: number;
    posture?: number;
  };
  currentScore: number;
  potentialScore: number;
  routine: any | null;
  routineChecks: string[]; // checklist values checked e.g. ["exercise-0", "active-1"]
  lastUpdated: number;

  // --- Extended fields consumed by lib/payload.ts's single recommendation-payload builder.
  // All optional so existing records without them degrade gracefully rather than throwing.
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  estimatedBodyFatPercentage?: number;
  hairTexture?: string;
  primaryDeviationZone?: string;
  canthalTilt?: string;
  jawStructuralType?: string;
  verticalThirdsRatio?: string;
  activePathologies?: string[];
  scarringTypes?: string[];
  norwoodScaleRating?: number;
  density?: string;
  growthDirection?: string;
  // Data-quality flags: whether the current front/side metrics came from a real MediaPipe
  // detection (auto-detect) vs. only ever a manual drag / never-touched default. Surfaced to
  // both the Gemini payload and the UI so fabricated-looking precision is never presented
  // as a confirmed measurement.
  isFrontCalibrated?: boolean;
  isSideCalibrated?: boolean;
}

export interface HistoricalRecord {
  id?: number;
  timestamp: number;
  score: number;
  asymmetryIndex: number;
  postureAngle: number;
  tiltAngle?: number;
  jawHeightRatio?: number;
  subscores: {
    jawline: number;
    skin: number;
    grooming: number;
    symmetry: number;
    posture?: number;
  };
}

class AuraMaxDatabase extends Dexie {
  profiles!: Table<BiometricProfile>;
  history!: Table<HistoricalRecord>;
  metricsRecords!: Table<{
    id: string; // e.g. "latest" or timestamp
    timestamp: number;
    faceShape: string;
    symmetryScore: number;
    forwardHeadAngle: number;
    hairTexture: string;
    age: number;
    skinCondition: string;
    groomingStyle: string;
    subscores: {
      jawline: number;
      skin: number;
      grooming: number;
      symmetry: number;
    };
    routine: any;
    routineChecks: string[];
  }>;

  constructor() {
    super("AuraMaxDatabase");
    // v2 -> v3: purely additive optional fields on `profiles` (see BiometricProfile above).
    // No index changes required; existing v2 records remain valid without migration.
    this.version(3).stores({
      profiles: "id",
      history: "++id, timestamp",
      metricsRecords: "id, timestamp",
    });
  }

  /**
   * Atomically writes a scan result across all three tables. Previously these writes
   * (metricsRecords.put / profiles.put / history.add) ran as independent sequential awaits
   * with no transaction — a failure partway through (e.g. a slow/offline tab closing mid-save)
   * could leave `profiles` updated but `history` un-appended, permanently desyncing the
   * "current" view from the trend chart. This wraps them so they succeed or fail together.
   */
  async saveScanResult(profile: BiometricProfile, metricsRecord: any, historyEntry: HistoricalRecord) {
    return this.transaction("rw", this.profiles, this.history, this.metricsRecords, async () => {
      await this.metricsRecords.put(metricsRecord);
      await this.profiles.put(profile);
      await this.history.add(historyEntry);
    });
  }
}

export const db = new AuraMaxDatabase();
export const dbEngine = db;

