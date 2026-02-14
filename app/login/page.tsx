'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingOverlay from '@/components/LoadingOverlay';
import { APPNAME } from '@/lib/constants';

export default function LoginPage() {
  const { emailSignIn, emailSignUp, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isSignUp) {
        await emailSignUp(email, password, name);
      } else {
        await emailSignIn(email, password);
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] px-6 relative overflow-hidden">
      {isLoading && <LoadingOverlay />}

      {/* Unique Matrix-like Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-lime-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-10 shadow-2xl">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-black text-white italic tracking-tighter mb-2">
            {isSignUp ? 'Create Account on' : 'Login to'} {APPNAME}
          </h2>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl mb-6 text-xs font-bold uppercase tracking-tight">
            Error // {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 transition-all"
              required
            />
          )}

          <input
            type="email"
            placeholder="Network ID (Email)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 transition-all"
            required
          />

          <input
            type="password"
            placeholder="Access Key (Password)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 transition-all"
            required
          />

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-lime-400 text-black font-black uppercase tracking-widest hover:bg-lime-300 transition-all shadow-lg shadow-lime-900/20 active:scale-[0.98]"
          >
            {isSignUp ? 'Create Account' : 'Login'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-lime-400 transition-colors"
          >
            {isSignUp ? '← Back to Login' : 'Create New Account →'}
          </button>
        </div>
      </div>
    </div>
  );
}
