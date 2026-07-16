"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Mail, Lock, Sparkles, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

interface AuthGatewayProps {
  onAuthSuccess: () => void;
}

type AuthMode = "signin" | "signup";

export default function AuthGateway({ onAuthSuccess }: AuthGatewayProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        setSuccessMsg("Access authorized. Syncing biometrics...");
        setTimeout(() => {
          onAuthSuccess();
        }, 800);
      } else {
        setError("Session failed to initialize. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Check if user confirmation is pending (usually true if user has no session yet)
      if (data.user && !data.session) {
        setNeedsConfirmation(true);
        setSuccessMsg("Registration successful! Email verification link sent.");
      } else if (data.session) {
        // Logged in immediately
        setSuccessMsg("Account created! Access granted.");
        setTimeout(() => {
          onAuthSuccess();
        }, 800);
      } else {
        setNeedsConfirmation(true);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during sign up.");
    } finally {
      setLoading(false);
    }
  };

  // Re-check Verification Status
  const handleCheckVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      // Attempting to sign in with the password to see if it succeeds now (if email was verified)
      const { data, error: checkError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (checkError) {
        if (checkError.message.includes("Email not confirmed")) {
          setError("Email still pending confirmation. Please click the link in your verification email.");
        } else {
          throw checkError;
        }
      } else if (data.session) {
        setSuccessMsg("Email verified! Access authorized.");
        setTimeout(() => {
          onAuthSuccess();
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || "Failed to confirm verification status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-gateway-container" className="min-h-screen bg-[#070707] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Visual background atmospheric effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[250px] h-[250px] bg-emerald-600/[0.02] rounded-full blur-[80px] pointer-events-none" />

      {/* Decorative cyber grid background lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-graphite-950/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 relative shadow-2xl shadow-emerald-950/10 z-10"
      >
        {/* Glow corner highlights */}
        <div className="absolute top-0 left-0 w-8 h-[1px] bg-emerald-500/30" />
        <div className="absolute top-0 left-0 w-[1px] h-8 bg-emerald-500/30" />
        <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-emerald-500/30" />
        <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-emerald-500/30" />

        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/[0.04] border border-emerald-500/20 mb-3.5 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="font-mono text-lg font-bold tracking-[0.2em] text-zinc-100 uppercase">
            AuraMax Core
          </h1>
          <p className="text-xs text-zinc-500 font-mono tracking-wider mt-1 uppercase">
            Facial Bio-Aesthetic Engine
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!needsConfirmation ? (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Tab Selector */}
              <div className="flex bg-graphite-900/60 p-1 rounded-lg border border-white/[0.05] mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-mono rounded transition-all uppercase font-semibold ${
                    mode === "signin"
                      ? "bg-graphite-800 text-emerald-400 border border-white/[0.04] shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Authorized Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-mono rounded transition-all uppercase font-semibold ${
                    mode === "signup"
                      ? "bg-graphite-800 text-emerald-400 border border-white/[0.04] shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Create Profile
                </button>
              </div>

              {/* Feedback States */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-950/40 border border-red-500/20 rounded-lg flex items-start gap-2.5 text-xs text-red-400 font-sans leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-lg flex items-start gap-2.5 text-xs text-emerald-400 font-sans leading-relaxed"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {/* Authentication Form */}
              <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Subject Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                        <Sparkles className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Jane Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-graphite-900/60 border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    Core Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-graphite-900/60 border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Security Keyphrase
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-graphite-900/60 border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-brass-500 hover:from-emerald-400 hover:to-brass-400 text-graphite-950 font-mono text-xs font-bold uppercase tracking-widest py-3 px-4 rounded-lg shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Decrypting Access...
                    </>
                  ) : mode === "signin" ? (
                    "Authorize Dashboard"
                  ) : (
                    "Generate Bio-Profile"
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="verification-pending"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="text-center py-4"
            >
              <div className="inline-flex items-center justify-center p-3.5 rounded-full bg-emerald-500/[0.04] border border-emerald-500/20 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                <Mail className="w-7 h-7 text-emerald-400 animate-pulse" />
              </div>
              <h2 className="font-mono text-md font-semibold tracking-wider text-zinc-100 uppercase mb-2">
                VERIFICATION_PENDING
              </h2>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-6 max-w-xs mx-auto">
                We&apos;ve dispatched a secure cryptographic link to <strong className="text-zinc-200">{email}</strong>. 
                Please approve the authorization email to activate your profile.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-500/20 rounded-lg text-xs text-red-400 font-sans text-left">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCheckVerification}
                  disabled={loading}
                  className="w-full bg-graphite-900 hover:bg-graphite-800 border border-white/[0.08] text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  Check Verification Status
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNeedsConfirmation(false);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 uppercase tracking-wider block mx-auto py-1"
                >
                  Back to Sign In
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Decorative footer credentials */}
      <div className="mt-8 text-center text-[10px] font-mono text-zinc-600 tracking-widest uppercase">
        SECURE AUTH CONNECTIONS POWERED BY SUPABASE
      </div>
    </div>
  );
}
