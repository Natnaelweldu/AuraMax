"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Key, 
  Sparkles, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle,
  Activity, 
  User, 
  Settings,
  Flame,
  Heart,
  Droplet
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { db } from "@/lib/db";

type GatewayMode = "onboarding" | "login";

export default function GatewayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<GatewayMode>("onboarding");
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // STEP 1 FIELDS: Credentials & Encryption
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityKeyphrase, setSecurityKeyphrase] = useState("");

  // STEP 2 FIELDS: Body Metrics & Indices
  const [age, setAge] = useState<number>(21);
  const [gender, setGender] = useState<string>("Masculine");
  const [height, setHeight] = useState<number>(180);
  const [weight, setWeight] = useState<number>(75);

  // STEP 3 FIELDS: Dermatology Profiles
  const [biomembraneType, setBiomembraneType] = useState<string>("combination");
  const [pathologies, setPathologies] = useState<string[]>([]);
  const [scarring, setScarring] = useState<string[]>([]);

  // STEP 4 FIELDS: Styling Filters & Modifiers
  const [hairTexture, setHairTexture] = useState<string>("straight");
  const [ageDelta, setAgeDelta] = useState<number>(0);

  // LOGIN MODE FIELDS
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // On-the-fly Calculations (Step 2)
  const [bmi, setBmi] = useState<number>(23.15);
  const [bodyFat, setBodyFat] = useState<number>(14.5);

  // Check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  // Recalculate BMI and body fat whenever relevant fields change
  useEffect(() => {
    if (height > 0 && weight > 0) {
      const heightM = height / 100;
      const calculatedBmi = weight / (heightM * heightM);
      setBmi(parseFloat(calculatedBmi.toFixed(2)));

      // Estimate body fat % (Standard adult formula)
      const genderFactor = gender === "Feminine" ? 0 : 1;
      const calculatedFat = (1.20 * calculatedBmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4;
      setBodyFat(parseFloat(Math.max(2.0, Math.min(60.0, calculatedFat)).toFixed(1)));
    }
  }, [age, gender, height, weight]);

  const handleTogglePathology = (item: string) => {
    setPathologies(prev => 
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const handleToggleScarring = (item: string) => {
    setScarring(prev => 
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!email || !password || !securityKeyphrase) {
        setError("Please declare credentials and your security keyphrase.");
        return;
      }
      if (password.length < 6) {
        setError("Cryptographic password must be at least 6 characters.");
        return;
      }
    }
    setError(null);
    setStep(prev => Math.min(4, prev + 1));
  };

  const handlePrevStep = () => {
    setError(null);
    setStep(prev => Math.max(1, prev - 1));
  };

  // Process SignUp with all onboarding metrics
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      // 1. Register with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            security_keyphrase: securityKeyphrase,
            age,
            gender,
            height_cm: height,
            weight_kg: weight,
            calculated_bmi: bmi,
            estimated_body_fat_percentage: bodyFat,
            biomembrane_type: biomembraneType,
            active_pathologies: pathologies,
            scarring_types: scarring,
            hair_texture: hairTexture,
            chronological_age_delta: ageDelta
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      // 2. Hydrate local database (Dexie) with the computed scores
      const rawSymmetry = 8.5; // starter default
      const rawJawline = 7.8; // starter default
      const rawPosture = 8.0; // starter default
      const rawSkin = biomembraneType === "congested" ? 6.2 : biomembraneType === "oily" ? 7.2 : biomembraneType === "dry" ? 7.8 : biomembraneType === "combination" ? 8.0 : 8.8;
      const rawGrooming = 8.2;

      const calculatedSubscores = {
        jawline: rawJawline,
        skin: rawSkin,
        grooming: rawGrooming,
        symmetry: rawSymmetry,
        posture: rawPosture
      };

      const currentScore = parseFloat(((rawJawline + rawSkin + rawGrooming + rawSymmetry + rawPosture) / 5).toFixed(1));

      await db.profiles.put({
        id: "current_profile",
        frontImage: null,
        sideImage: null,
        closeupImage: null,
        faceShape: "Oval",
        asymmetryIndex: 7.11,
        postureAngle: 18.0,
        tiltAngle: 0.0,
        jawHeightRatio: 0.611,
        skinCondition: biomembraneType,
        groomingStyle: "stubble",
        subscores: calculatedSubscores,
        currentScore,
        potentialScore: 9.5,
        routine: null,
        routineChecks: [],
        lastUpdated: Date.now()
      });

      // Insert baseline metricsRecord
      await db.metricsRecords.put({
        id: "latest",
        timestamp: Date.now(),
        faceShape: "Oval",
        symmetryScore: 8.5,
        forwardHeadAngle: 18.0,
        hairTexture,
        age,
        skinCondition: biomembraneType,
        groomingStyle: "stubble",
        subscores: calculatedSubscores,
        routine: null,
        routineChecks: []
      });

      setSuccess("Subject bio-profile initialized! Access authorized.");
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during onboarding encryption.");
    } finally {
      setSubmitting(false);
    }
  };

  // Direct login for returning subjects
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError("Please input authorization credentials.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        setSuccess("Subject credentials authenticated. Routing to matrix...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        setError("Failed to initialize session. Please check keyphrase.");
      }
    } catch (err: any) {
      setError(err.message || "Credentials authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex flex-col items-center justify-center p-6 select-none">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border border-teal-500/10" />
          <div className="absolute inset-0 rounded-full border border-teal-500 border-t-transparent animate-spin" />
        </div>
        <p className="font-mono text-xs text-zinc-500 tracking-wider">DECRYPTING_VAULT_CORES...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0e12] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden select-none">
      
      {/* Decorative cybernetic background elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
      
      {/* Matrix overlay lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Mode Switch Bar */}
      <div className="w-full max-w-xl flex justify-between items-center mb-6 px-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-mint animate-pulse" />
          <span className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase">
            AuraMax Matrix v2.4
          </span>
        </div>
        <button
          onClick={() => {
            setMode(prev => prev === "onboarding" ? "login" : "onboarding");
            setError(null);
            setSuccess(null);
          }}
          className="text-[10px] font-mono text-accent-mint hover:text-white transition-colors uppercase tracking-wider border border-accent-mint/20 hover:border-accent-mint/50 bg-[#12141c]/40 px-3 py-1.5 rounded-lg backdrop-blur-md cursor-pointer"
        >
          {mode === "onboarding" ? "Access Existing Profile" : "Initialize New Profile"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "onboarding" ? (
          <motion.div
            key="onboarding-wizard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-xl bg-[#12141c]/60 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-8 relative shadow-2xl z-10"
          >
            {/* Glow corner highlights */}
            <div className="absolute top-0 left-0 w-8 h-[1px] bg-gradient-to-r from-accent-mint to-transparent" />
            <div className="absolute top-0 left-0 w-[1px] h-8 bg-gradient-to-b from-accent-mint to-transparent" />
            <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-gradient-to-l from-accent-blue to-transparent" />
            <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-gradient-to-t from-accent-blue to-transparent" />

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-br from-accent-mint/10 to-accent-blue/10 border border-white/[0.08] mb-3 shadow-[0_0_20px_rgba(20,184,166,0.1)]">
                <ShieldCheck className="w-5 h-5 text-accent-mint" />
              </div>
              <h1 className="font-display font-black text-xl tracking-tight text-white uppercase">
                Bio-Aesthetic Initialization
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono tracking-widest mt-1 uppercase">
                Step {step} of 4: {step === 1 && "Credentials & Encryption"}
                {step === 2 && "Body Metrics & Indices"}
                {step === 3 && "Dermatology Profiles"}
                {step === 4 && "Styling Filters & Modifiers"}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/[0.02] h-1 rounded-full mb-8 overflow-hidden border border-white/[0.03]">
              <div 
                className="bg-gradient-to-r from-accent-mint to-accent-blue h-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-950/20 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-400 font-sans leading-relaxed">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-400 font-sans leading-relaxed">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleOnboardingSubmit} className="space-y-6">
              
              {/* STEP 1: Credentials & Encryption */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="subject@auramax.matrix"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-950/40 border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent-mint/40 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Security Keyphrase (Password)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-950/40 border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent-mint/40 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Secret Encryption Salt Key
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                        <Key className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ALPHA-9-SECURE"
                        value={securityKeyphrase}
                        onChange={(e) => setSecurityKeyphrase(e.target.value)}
                        className="w-full bg-zinc-950/40 border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent-mint/40 transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600 font-mono mt-1">
                      This private salt will map your client-side biometric records securely.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Body Metrics & Indices */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        Chronological Age
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="100"
                        value={age}
                        onChange={(e) => setAge(Number(e.target.value))}
                        className="w-full bg-zinc-950/40 border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-sans text-zinc-200 focus:outline-none focus:border-accent-mint/40 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        Gender Designation
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-zinc-950/40 border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-sans text-zinc-300 focus:outline-none focus:border-accent-mint/40 transition-colors"
                      >
                        <option value="Masculine" className="bg-[#12141c]">Masculine</option>
                        <option value="Feminine" className="bg-[#12141c]">Feminine</option>
                        <option value="Androgynous" className="bg-[#12141c]">Androgynous</option>
                        <option value="Neutral" className="bg-[#12141c]">Neutral</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="250"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        className="w-full bg-zinc-950/40 border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-sans text-zinc-200 focus:outline-none focus:border-accent-mint/40 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="250"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full bg-zinc-950/40 border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-sans text-zinc-200 focus:outline-none focus:border-accent-mint/40 transition-colors"
                      />
                    </div>
                  </div>

                  {/* BMI & Body Fat Computed Chips */}
                  <div className="p-4 bg-zinc-950/40 border border-white/[0.03] rounded-xl flex items-center justify-around gap-4 shadow-inner mt-4">
                    <div className="flex flex-col items-center">
                      <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Calculated BMI</div>
                      <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-mint to-teal-400 drop-shadow-[0_0_10px_rgba(20,184,166,0.15)] font-mono">
                        {bmi} <span className="text-[10px] text-zinc-500 font-normal">kg/m²</span>
                      </div>
                    </div>
                    <div className="w-[1px] h-8 bg-white/[0.06]" />
                    <div className="flex flex-col items-center">
                      <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Est. Body Fat</div>
                      <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-indigo-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.15)] font-mono">
                        {bodyFat}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Dermatology Profiles */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  {/* Biomembrane Selection Grid */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Biomembrane Type
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {["dry", "oily", "combination", "normal", "congested"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setBiomembraneType(t)}
                          className={`py-2 px-1 text-xs font-mono rounded-lg border text-center uppercase tracking-tighter transition-all cursor-pointer ${
                            biomembraneType === t
                              ? "bg-accent-mint/10 border-accent-mint/40 text-accent-mint shadow-[0_0_12px_rgba(20,184,166,0.1)]"
                              : "bg-zinc-950/30 border-white/[0.04] text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Pathologies */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Identify Active Pathologies
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Inflammatory Acne",
                        "Comedones",
                        "Rosacea",
                        "Seborrheic Dermatitis"
                      ].map((item) => {
                        const isSelected = pathologies.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleTogglePathology(item)}
                            className={`py-2.5 px-3 rounded-lg border flex items-center justify-between text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue shadow-[0_0_12px_rgba(59,130,246,0.08)]"
                                : "bg-zinc-950/30 border-white/[0.04] text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            <span className="text-[11px] font-mono uppercase tracking-tight">{item}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-accent-blue" : "bg-zinc-800"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scarring Micro-texture Array */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Micro-texture Scarring Arrays
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Atrophic Boxcar",
                        "Icepick Scarring",
                        "Rolling Scarring",
                        "Hypertrophic Fibrosis"
                      ].map((item) => {
                        const isSelected = scarring.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleToggleScarring(item)}
                            className={`py-2.5 px-3 rounded-lg border flex items-center justify-between text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#12141c] border-white/[0.12] text-zinc-200 shadow-inner"
                                : "bg-zinc-950/30 border-white/[0.04] text-zinc-500 hover:text-zinc-400"
                            }`}
                          >
                            <span className="text-[11px] font-sans font-medium">{item}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-accent-mint" : "bg-zinc-850"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Styling Filters & Modifiers */}
              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Hair density / texture selection */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Hair Texture Profile
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["Straight", "Wavy", "Curly", "Coily"].map((texture) => (
                        <button
                          key={texture}
                          type="button"
                          onClick={() => setHairTexture(texture.toLowerCase())}
                          className={`py-3 px-1 text-xs font-mono rounded-xl border text-center uppercase tracking-tight transition-all cursor-pointer ${
                            hairTexture === texture.toLowerCase()
                              ? "bg-accent-mint/10 border-accent-mint/40 text-accent-mint"
                              : "bg-zinc-950/30 border-white/[0.04] text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {texture}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chronological Age Delta slider */}
                  <div className="space-y-3 p-4 bg-zinc-950/30 border border-white/[0.03] rounded-xl">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        Chronological Age Delta
                      </label>
                      <span className="font-mono text-xs text-accent-mint font-bold px-2 py-0.5 rounded bg-accent-mint/10">
                        {ageDelta > 0 ? `+${ageDelta}` : ageDelta} Years
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="1"
                      value={ageDelta}
                      onChange={(e) => setAgeDelta(Number(e.target.value))}
                      className="w-full accent-accent-mint bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-zinc-600 uppercase">
                      <span>Younger (Biological)</span>
                      <span>Symmetric</span>
                      <span>Older (Biological)</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Navigation Action Footer */}
              <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between gap-4 mt-8">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex items-center gap-1 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    PREVIOUS
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-1 bg-[#12141c] hover:bg-[#161a24] border border-white/[0.08] text-accent-mint hover:text-white px-5 py-2.5 rounded-xl text-xs font-mono transition-all shadow-[0_0_15px_rgba(20,184,166,0.05)] cursor-pointer ml-auto"
                  >
                    NEXT
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-accent-mint to-accent-blue text-zinc-950 hover:from-teal-400 hover:to-blue-400 font-mono text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(20,184,166,0.15)] cursor-pointer ml-auto"
                  >
                    {submitting ? (
                      <>
                        <Activity className="w-4 h-4 animate-spin" />
                        INITIALIZING_PROFILE...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        SECURE_AUTHORIZATION
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="returning-subject-login"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-md bg-[#12141c]/60 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-8 relative shadow-2xl z-10"
          >
            {/* Glow corner highlights */}
            <div className="absolute top-0 left-0 w-8 h-[1px] bg-gradient-to-r from-accent-mint to-transparent" />
            <div className="absolute top-0 left-0 w-[1px] h-8 bg-gradient-to-b from-accent-mint to-transparent" />
            <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-gradient-to-l from-accent-blue to-transparent" />
            <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-gradient-to-t from-accent-blue to-transparent" />

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-br from-accent-mint/10 to-accent-blue/10 border border-white/[0.08] mb-3 shadow-[0_0_20px_rgba(20,184,166,0.1)]">
                <ShieldCheck className="w-5 h-5 text-accent-mint" />
              </div>
              <h1 className="font-display font-black text-xl tracking-tight text-white uppercase">
                Authorize Profile
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono tracking-widest mt-1 uppercase">
                Access Existing Subject Record
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-950/20 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-400 font-sans leading-relaxed">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-400 font-sans leading-relaxed">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="subject@auramax.matrix"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-zinc-950/40 border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent-mint/40 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Security Keyphrase (Password)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-zinc-950/40 border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent-mint/40 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-accent-mint to-accent-blue text-zinc-950 hover:from-teal-400 hover:to-blue-400 font-mono text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    AUTHORIZE_DASHBOARD
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative footer branding */}
      <div className="mt-8 text-center text-[10px] font-mono text-zinc-600 tracking-widest uppercase">
        SECURE MATRIX COMMUNICATIONS ENCRYPTED END-TO-END
      </div>
    </div>
  );
}
