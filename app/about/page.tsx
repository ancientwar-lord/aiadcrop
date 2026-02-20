'use client';

import { Zap, ScanLine, Share2, Rocket, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { APPNAME } from '@/lib/constants';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200 px-6 py-32 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-lime-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-24">
          <h1 className="text-6xl md:text-7xl font-black mb-8 italic uppercase tracking-tighter text-white">
            The <span className="text-lime-400">Growth Engine</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed">
            {APPNAME} bridges the gap between physical products and viral digital content. We help
            brands turn their customers into their biggest marketing asset using next-generation AI
            technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AboutCard
            index="01"
            title="Impactful AI Ads"
            description="Our platform transforms any product image into a high-retention AI advertisement. Forget expensive cameras and crews—this is pure AI power optimized for social media. By leveraging the next-generation PerfectCrop API, we craft the ideal ad for your product, guaranteed to drive higher click-through rates than traditional advertising."
            icon={<Zap size={24} fill="currentColor" />}
          />
          <AboutCard
            index="02"
            title="Interactive QR Try-Ons"
            description="Brands can generate a unique AI-powered QR code to place on product pages across shopping platforms. When shoppers scan it, they enter an 'AI Fitting Room' to experience the product through personalized AI-generated videos."
            icon={<ScanLine size={24} />}
          />
          <AboutCard
            index="03"
            title="Viral Marketing"
            description="Users generate their own 'AI Try-On' images and if they share it on social media. Every shared image includes a QR overlay, creating a viral loop that brings new customers directly back to your product page."
            icon={<Share2 size={24} />}
          />
          <AboutCard
            index="04"
            title="Product Recommendation Engine"
            description="We analyze user skin tone and their style preferences during the QR-Try experience to recommend the best product from your listings for a perfect match."
            icon={<Rocket size={24} />}
          />
        </div>

        <div className="mt-24 p-12 rounded-[3rem] bg-white/[0.02] border border-white/5 text-center backdrop-blur-sm">
          <h3 className="text-3xl font-black text-white mb-4 italic uppercase">
            Go Global Without an Ad Budget
          </h3>
          <p className="text-slate-500 mb-8 max-w-2xl mx-auto font-medium">
            Ready to let your customers do the marketing for you? Join our platform to turn your
            brand viral, use {APPNAME} and dominate the market.
          </p>
          <Link
            href="/login"
            className="px-8 py-4 rounded-2xl bg-lime-400 text-black font-black uppercase tracking-widest hover:bg-lime-300 transition-all group"
          >
            Explore the platform{' '}
            <ChevronRight className="inline ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function AboutCard({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: string;
}) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-lime-400/30 transition-all duration-500 group relative overflow-hidden">
      <span className="absolute top-6 right-8 text-4xl font-black text-white/5 group-hover:text-lime-400/10 transition-colors">
        {index}
      </span>
      <div className="w-14 h-14 rounded-2xl bg-lime-400 text-black flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-all duration-500">
        {icon}
      </div>
      <h3 className="text-xl font-black italic uppercase mb-4 text-white tracking-tight">
        {title}
      </h3>
      <p className="text-slate-300 text-sm leading-relaxed font-medium group-hover:text-slate-200 transition-colors">
        {description}
      </p>
      <div className="absolute bottom-0 right-0 w-8 h-8 bg-lime-400 translate-x-4 translate-y-4 rotate-45 opacity-0 group-hover:opacity-100 transition-all" />
    </div>
  );
}
