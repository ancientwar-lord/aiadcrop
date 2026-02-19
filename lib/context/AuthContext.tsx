'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

// Define a User type compatible with previous Firebase usage
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleSignIn: () => Promise<void>;
  logOut: () => Promise<void>;
  emailSignIn: (email: string, pass: string) => Promise<void>;
  emailSignUp: (email: string, pass: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const user: User | null = session?.user
    ? {
        uid: session.user.id,
        email: session.user.email,
        displayName: session.user.name,
        photoURL: session.user.image || null,
        emailVerified: session.user.emailVerified,
      }
    : null;

  const loading = isPending;

  const googleSignIn = async () => {
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    });
    if (error) throw new Error(error.message);
  };

  const emailSignIn = async (email: string, pass: string) => {
    const { error } = await authClient.signIn.email({
      email,
      password: pass,
      callbackURL: '/dashboard',
    });
    if (error) throw new Error(error.message);
  };

  const emailSignUp = async (email: string, pass: string, name: string) => {
    const { error } = await authClient.signUp.email({
      email,
      password: pass,
      name,
      callbackURL: '/dashboard',
    });
    if (error) throw new Error(error.message);
  };

  const logOut = async () => {
    await authClient.signOut();
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleSignIn, logOut, emailSignIn, emailSignUp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};
