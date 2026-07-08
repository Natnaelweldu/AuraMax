import Dexie, { Table } from "dexie";

export interface BiometricProfile {
  id?: string; // e.g., 'current_profile'
  frontImage: string | null;
  sideImage: string | null;
  closeupImage: string | null;
  faceShape: string;
  asymmetryIndex: number;
  postureAngle: number;
  skinCondition: string; // 'dry' | 'oily' | 'combination' | 'normal' | 'congested'
  groomingStyle: string; // 'clean-shaven' | 'stubble' | 'beard'
  subscores: {
    jawline: number;
    skin: number;
    grooming: number;
    symmetry: number;
  };
  currentScore: number;
  potentialScore: number;
  routine: any | null;
  routineChecks: string[]; // checklist values checked e.g. ["exercise-0", "active-1"]
  lastUpdated: number;
}

export interface HistoricalRecord {
  id?: number;
  timestamp: number;
  score: number;
  asymmetryIndex: number;
  postureAngle: number;
  subscores: {
    jawline: number;
    skin: number;
    grooming: number;
    symmetry: number;
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
    this.version(2).stores({
      profiles: "id",
      history: "++id, timestamp",
      metricsRecords: "id, timestamp",
    });
  }
}

export const db = new AuraMaxDatabase();
export const dbEngine = db;

