'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { APPNAME } from '@/lib/constants';
import { LayoutDashboard, ChevronLeft, LogIn, Zap, Upload, Frame } from 'lucide-react';

export default function Sidebar({
  isCollapsed = false,
  toggleSidebar,
}: {
  isCollapsed?: boolean;
  toggleSidebar?: () => void;
}) {
  const pathname = usePathname();
  const { user, logOut } = useAuth();

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Upload', href: '/products/upload', icon: <Upload size={20} /> },
    { name: 'Seller Studio', href: '/studio', icon: <Frame size={20} /> },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-[#0f172a] text-slate-300 transition-all duration-300 shadow-2xl ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Unique Floating Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-10 bg-[#1e293b] border border-slate-700 rounded-lg p-1 text-lime-400 hover:text-white transition-all z-50 shadow-lg"
      >
        <ChevronLeft
          className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
        />
      </button>

      <div className="flex-1 overflow-y-auto py-8 px-4 space-y-8">
        {/* Logo with Neon Glow */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-2'}`}>
          <Link href="/dashboard" className="group flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-lime-400 blur-md opacity-20 group-hover:opacity-50 transition-opacity" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-xl flex items-center justify-center text-[#0B0F1A] shadow-lg shadow-lime-500/20 rotate-[10deg] group-hover:rotate-[0deg] transition-transform duration-300">
                <Zap size={20} fill="currentColor" />
              </div>
            </div>
            {!isCollapsed && (
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
            )}
          </Link>
        </div>

        {/* Links with Glass-Effect */}
        <nav className="space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`group relative flex items-center px-4 py-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-white/10 text-lime-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                    : 'hover:bg-white/5 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                {isActive && (
                  <span className="absolute left-0 w-1 h-6 bg-lime-400 rounded-r-full shadow-[4px_0_12px_rgba(163,230,53,0.8)]" />
                )}

                <span
                  className={`${isActive ? 'text-lime-400' : 'text-slate-500 group-hover:text-lime-300'}`}
                >
                  {link.icon}
                </span>

                {!isCollapsed && (
                  <span className="ml-3 font-semibold text-sm tracking-wide">{link.name}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Modern Profile Card */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        {user ? (
          <div className={`flex items-center gap-3 p-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full border-2 border-lime-400/30 p-0.5">
              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-lime-400 font-bold">
                {user.email?.[0].toUpperCase()}
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user.displayName || 'Developer'}
                </p>
                <button
                  onClick={logOut}
                  className="text-[10px] text-rose-400 hover:underline uppercase tracking-widest font-bold"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex justify-center p-3 rounded-xl bg-lime-400 text-black font-bold hover:bg-lime-300 transition-all"
          >
            {!isCollapsed ? 'ACCESS SYSTEM' : <LogIn size={20} />}
          </Link>
        )}
      </div>
    </aside>
  );
}
