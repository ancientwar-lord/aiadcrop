'use client';

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B0F1A]/80 backdrop-blur-md">
      <div className="relative flex items-center justify-center">
        {/* Outer Hexagon-like spinning frame */}
        <div className="absolute h-24 w-24 rounded-3xl border-2 border-lime-400/20 animate-[spin_3s_linear_infinite]" />
        {/* Inner pulsing core */}
        <div className="absolute h-8 w-8 rounded-lg bg-lime-400 animate-pulse shadow-[0_0_30px_rgba(163,230,53,0.6)] rotate-45" />
      </div>
    </div>
  );
}
