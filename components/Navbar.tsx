'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { APPNAME } from '@/lib/constants';
import { Menu, X, Zap, ArrowUpRight } from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Scroll effect for a "floating" navbar look
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 transition-all duration-500">
      <nav
        className={`w-full max-w-7xl transition-all duration-500 ease-in-out border rounded-2xl ${
          isScrolled
            ? 'bg-[#0B0F1A]/80 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] py-3'
            : 'bg-[#0B0F1A]/40 backdrop-blur-md border-white/5 py-5'
        }`}
      >
        <div className="px-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-12">
            {/* Logo Section */}
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-lime-400 blur-md opacity-20 group-hover:opacity-50 transition-opacity" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-xl flex items-center justify-center text-[#0B0F1A] shadow-lg shadow-lime-500/20 rotate-[10deg] group-hover:rotate-[0deg] transition-transform duration-300">
                  <Zap size={20} fill="currentColor" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-white italic leading-none">
                  {APPNAME}
                </span>

                {/* Tactical Dash Lines */}
                <div className="flex flex-col gap-[3px] mt-1.5 opacity-60">
                  <div className="h-[1px] w-full border-t border-dashed border-lime-400/80"></div>
                  <div className="h-[1px] w-full border-t border-dashed border-lime-400/80"></div>
                </div>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-12">
              <NavLink href="/" active={pathname === '/'}>
                Home
              </NavLink>
              <NavLink href="/about" active={pathname === '/about'}>
                About
              </NavLink>

              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center px-6 py-2.5 font-bold text-black transition-all duration-300 bg-lime-400 rounded-xl hover:bg-lime-300 active:scale-95 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2 text-sm uppercase tracking-wider">
                  Login
                  <ArrowUpRight
                    size={16}
                    className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                  />
                </span>
              </Link>
            </div>

            {/* Mobile Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative w-10 h-10 flex items-center justify-center text-lime-400 hover:bg-white/5 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[calc(100%+10px)] left-0 right-0 bg-[#0B0F1A]/95 backdrop-blur-2xl border border-white/10 mx-2 p-8 rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300 origin-top shadow-2xl">
            <div className="grid gap-4">
              <MobileNavLink
                href="/"
                active={pathname === '/'}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </MobileNavLink>
              <MobileNavLink
                href="/about"
                active={pathname === '/about'}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </MobileNavLink>
            </div>
            <div className="h-px bg-white/5 w-full" />
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-4 rounded-2xl bg-lime-400 text-black font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(163,230,53,0.2)]"
            >
              Initialize Session
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative text-sm font-bold uppercase tracking-[0.1em] transition-all duration-300 ${
        active ? 'text-lime-400' : 'text-slate-400 hover:text-white'
      }`}
    >
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
      {/* Dynamic Hover/Active Line */}
      <span
        className={`absolute -bottom-2 left-0 h-[2px] bg-lime-400 transition-all duration-300 shadow-[0_0_10px_#A3E635] ${
          active ? 'w-full' : 'w-0 group-hover:w-full'
        }`}
      />
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
  active,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`text-4xl font-black uppercase italic tracking-tighter transition-colors ${
        active ? 'text-lime-400' : 'text-slate-600'
      }`}
    >
      {children}
    </Link>
  );
}
