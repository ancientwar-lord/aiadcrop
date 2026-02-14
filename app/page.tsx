'use client';

import Link from 'next/link';
import { Sparkles, Zap, ArrowRight, ScanLine, Share2, PlayCircle } from 'lucide-react';
import { APPNAME } from '@/lib/constants';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F1A] text-slate-100 selection:bg-lime-400 selection:text-black">
      {/* ================= HERO ================= */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-lime-500/5 blur-[120px] rounded-full animate-pulse" />
        </div>

        <div className="relative z-10 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">
            <Sparkles size={12} /> Next-Gen Advertising
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.9]">
            Create <br />
            <span className="text-lime-400 drop-shadow-[0_0_15px_rgba(163,230,53,0.3)]">
              Viral Ads
            </span>
          </h1>

          <p className="mt-8 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Turn product photos into cinematic video ads. Let users scan a QR to virtually try your
            products through AI.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-10 py-5 rounded-2xl bg-lime-400 text-black font-black uppercase tracking-wider text-sm hover:bg-lime-300 hover:shadow-[0_0_30px_rgba(163,230,53,0.3)] transition-all flex items-center justify-center gap-2 group"
            >
              Start Creating{' '}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/about"
              className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              How it Works
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FEATURES (SHORT) ================= */}
      <section className="py-32 bg-[#0D121F] border-t border-white/5 relative px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<PlayCircle size={24} fill="currentColor" />}
              title="Instant Ads"
              description="Transform your product photos into professional video commercials in seconds."
            />
            <FeatureCard
              icon={<ScanLine size={24} />}
              title="QR AI Try-On"
              description="Embed QR codes for customers to virtually experience your products."
            />
            <FeatureCard
              icon={<Share2 size={24} />}
              title="Viral Marketing"
              description="Turn customers into ambassadors using viral loop."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-lime-400/30 transition-all duration-500 group">
      <div className="w-12 h-12 rounded-xl bg-lime-400 text-black flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-xl font-black uppercase italic mb-4 text-white">{title}</h4>
      <p className="text-slate-500 text-sm leading-relaxed font-medium">{description}</p>
    </div>
  );
}
