import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { hasDedicatedTimeSupabase, timeSupabase } from '@/lib/supabase/timeClient';
import type { Profile } from '@/lib/supabase/database.types';

interface AuthContextValue {
  session: Session | null;
  timeSession: Session | null;
  profile: Profile | null;
  loading: boolean;
  timeLoading: boolean;
  timeAuthError: string | null;
  hasDedicatedTimeSupabase: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [timeSession, setTimeSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLoading, setTimeLoading] = useState(true);
  const [timeAuthError, setTimeAuthError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return;
    await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!hasDedicatedTimeSupabase) {
        setTimeSession(s);
        setTimeLoading(false);
      }
      if (s?.user.id) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!hasDedicatedTimeSupabase) {
        setTimeSession(s);
        setTimeLoading(false);
      }
      if (s?.user.id) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (!hasDedicatedTimeSupabase) return;

    timeSupabase.auth.getSession().then(({ data: { session: s } }) => {
      setTimeSession(s);
      setTimeLoading(false);
    });

    const { data: { subscription } } = timeSupabase.auth.onAuthStateChange((_event, s) => {
      setTimeSession(s);
      setTimeLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error as Error | null };

    if (hasDedicatedTimeSupabase) {
      const { error: timeSignInError } = await timeSupabase.auth.signInWithPassword({ email, password });
      if (timeSignInError) {
        const msg = timeSignInError.message.toLowerCase();
        if (msg.includes('invalid login') || msg.includes('user not found') || msg.includes('no user found')) {
          const { error: timeSignUpError } = await timeSupabase.auth.signUp({ email, password });
          setTimeAuthError(timeSignUpError?.message ?? null);
        } else {
          setTimeAuthError(timeSignInError.message);
        }
      } else {
        setTimeAuthError(null);
      }
    } else {
      setTimeAuthError(null);
    }

    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ error: Error | null; needsConfirmation: boolean }> => {
    const { error, data } = await supabase.auth.signUp({ email, password });

    if (error) return { error: error as Error | null, needsConfirmation: false };

    if (!data.session) {
      return { error: null, needsConfirmation: true };
    }

    await supabase.from('profiles').upsert({
      id: data.user!.id,
      onboarding_done: false,
      units: 'metric',
    });
    await fetchProfile(data.user!.id);

    if (hasDedicatedTimeSupabase) {
      const { error: timeSignUpError } = await timeSupabase.auth.signUp({ email, password });
      if (timeSignUpError) {
        const msg = timeSignUpError.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
          const { error: timeSignInError } = await timeSupabase.auth.signInWithPassword({ email, password });
          setTimeAuthError(timeSignInError?.message ?? null);
        } else {
          setTimeAuthError(timeSignUpError.message);
        }
      } else {
        setTimeAuthError(null);
      }
    } else {
      setTimeAuthError(null);
    }

    return { error: null, needsConfirmation: false };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (hasDedicatedTimeSupabase) {
      await timeSupabase.auth.signOut();
    }
    setProfile(null);
    setTimeAuthError(null);
  }, []);

  const contextValue = useMemo(() => ({
    session,
    timeSession,
    profile,
    loading,
    timeLoading,
    timeAuthError,
    hasDedicatedTimeSupabase,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [
    session,
    timeSession,
    profile,
    loading,
    timeLoading,
    timeAuthError,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
