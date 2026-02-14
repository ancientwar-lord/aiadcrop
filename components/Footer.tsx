'use client';

import { APPNAME } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="mt-auto py-10 text-center text-slate-400  bg-[#0F1525] border-t border-white/5 relative overflow-hidden px-6">
      © {new Date().getFullYear()} {APPNAME}. All rights reserved.
    </footer>
  );
}
