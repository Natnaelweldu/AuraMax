import React from "react";

interface WireframeProps {
  type: "front" | "side" | "closeup";
  className?: string;
}

export const HeadWireframe: React.FC<WireframeProps> = ({ type, className = "" }) => {
  if (type === "front") {
    return (
      <svg
        viewBox="0 0 100 120"
        className={`w-full h-full stroke-emerald-500/30 fill-none stroke-[0.75] ${className}`}
      >
        {/* Face symmetry guides */}
        <line x1="50" y1="5" x2="50" y2="115" strokeDasharray="2,2" className="stroke-emerald-500/20" />
        <line x1="10" y1="60" x2="90" y2="60" strokeDasharray="2,2" className="stroke-emerald-500/20" />
        
        {/* Head shape */}
        <path d="M50,15 C25,15 20,45 20,65 C20,85 30,105 50,105 C70,105 80,85 80,65 C80,45 75,15 50,15 Z" />
        
        {/* Hair line */}
        <path d="M26,35 C35,28 50,30 50,35 C50,30 65,28 74,35" strokeDasharray="1,1" />
        
        {/* Eyes alignment target */}
        <circle cx="38" cy="55" r="3" />
        <circle cx="62" cy="55" r="3" />
        <line x1="32" y1="55" x2="44" y2="55" />
        <line x1="56" y1="55" x2="68" y2="55" />
        
        {/* Nose target */}
        <path d="M50,55 L50,75 L46,75" />
        
        {/* Mouth target */}
        <path d="M40,88 C45,92 55,92 60,88" />
        
        {/* Jawline anchor target */}
        <path d="M22,78 L32,100 L50,105 L68,100 L78,78" strokeDasharray="3,3" />

        {/* Technical telemetry markings */}
        <text x="50" y="12" textAnchor="middle" className="fill-emerald-500/40 font-mono text-[5px] tracking-widest">FRONT_AXIS_0.00</text>
      </svg>
    );
  }

  if (type === "side") {
    return (
      <svg
        viewBox="0 0 100 120"
        className={`w-full h-full stroke-emerald-500/30 fill-none stroke-[0.75] ${className}`}
      >
        {/* Forward Head Posture guidelines */}
        <line x1="45" y1="15" x2="45" y2="105" strokeDasharray="2,2" className="stroke-emerald-500/20" />
        <line x1="45" y1="105" x2="80" y2="105" strokeDasharray="2,2" className="stroke-emerald-500/20" />
        
        {/* Side Head shape */}
        <path d="M45,15 C20,15 15,45 15,65 C15,85 30,100 45,100 C50,100 60,98 65,95 L72,105 L82,105 L78,90 C85,80 85,60 85,50 C85,25 70,15 45,15 Z" />
        
        {/* Ear tragus marker */}
        <circle cx="45" cy="65" r="4" className="stroke-emerald-400" />
        <text x="52" y="67" className="fill-emerald-400/60 font-mono text-[5px]">TRAGUS_PT</text>
        
        {/* Shoulder acromion reference */}
        <circle cx="75" cy="105" r="4" className="stroke-emerald-400" />
        <text x="82" y="108" className="fill-emerald-400/60 font-mono text-[5px]">ACROMION_PT</text>
        
        {/* Connecting vector */}
        <line x1="45" y1="65" x2="75" y2="105" className="stroke-emerald-400 stroke-[0.5]" strokeDasharray="1,1" />

        {/* Eye marker */}
        <path d="M22,55 L28,58 L24,62 Z" />
        
        {/* Nose profile outline */}
        <path d="M16,50 C12,58 10,65 14,68 L10,72 L18,74" />
        
        {/* Chin & Jaw outline */}
        <path d="M18,80 L20,92 L35,98 L45,100" />

        <text x="50" y="12" textAnchor="middle" className="fill-emerald-500/40 font-mono text-[5px] tracking-widest">LATERAL_ALIGN_Y</text>
      </svg>
    );
  }

  // closeup
  return (
    <svg
      viewBox="0 0 100 120"
      className={`w-full h-full stroke-emerald-500/30 fill-none stroke-[0.75] ${className}`}
    >
      {/* Zoomed in face mesh focus */}
      <circle cx="50" cy="60" r="40" strokeDasharray="3,3" className="stroke-emerald-500/20" />
      
      {/* Pores / texture scanning box */}
      <rect x="25" y="35" width="50" height="50" strokeDasharray="1,2" />
      
      {/* Target Crosshairs */}
      <line x1="50" y1="10" x2="50" y2="110" className="stroke-emerald-500/10" />
      <line x1="10" y1="60" x2="90" y2="60" className="stroke-emerald-500/10" />
      
      {/* Face features outlines */}
      <path d="M35,50 C40,48 45,52 45,52" />
      <path d="M65,50 C60,48 55,52 55,52" />
      
      {/* Nose bridge & nostrils */}
      <path d="M50,52 L50,68 C48,70 47,72 50,72 C53,72 52,70 50,68" />
      
      {/* Mouth detailed layout */}
      <path d="M38,80 C44,78 56,78 62,80 C56,84 44,84 38,80 Z" />

      {/* Surface grid points */}
      <circle cx="30" cy="40" r="1" className="fill-emerald-400" />
      <circle cx="70" cy="40" r="1" className="fill-emerald-400" />
      <circle cx="30" cy="80" r="1" className="fill-emerald-400" />
      <circle cx="70" cy="80" r="1" className="fill-emerald-400" />

      <text x="50" y="12" textAnchor="middle" className="fill-emerald-500/40 font-mono text-[5px] tracking-widest">MACRO_TEXTURE_SCAN</text>
    </svg>
  );
};
