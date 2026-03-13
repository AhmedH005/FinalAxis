import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { supabase } from './client';
import type { Database } from './database.types';

const primaryUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const primaryAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const dedicatedTimeUrl = process.env.EXPO_PUBLIC_TIME_SUPABASE_URL?.trim();
const dedicatedTimeAnonKey = process.env.EXPO_PUBLIC_TIME_SUPABASE_ANON_KEY?.trim();

if ((dedicatedTimeUrl && !dedicatedTimeAnonKey) || (!dedicatedTimeUrl && dedicatedTimeAnonKey)) {
  throw new Error(
    'Time Engine Supabase configuration is incomplete.\n' +
    'Set both EXPO_PUBLIC_TIME_SUPABASE_URL and EXPO_PUBLIC_TIME_SUPABASE_ANON_KEY, or neither.',
  );
}

export const hasDedicatedTimeSupabase = Boolean(
  dedicatedTimeUrl &&
  dedicatedTimeAnonKey &&
  (dedicatedTimeUrl !== primaryUrl || dedicatedTimeAnonKey !== primaryAnonKey),
);

export const timeSupabase = hasDedicatedTimeSupabase
  ? createClient<Database>(dedicatedTimeUrl!, dedicatedTimeAnonKey!, {
      auth: {
        storage: AsyncStorage,
        storageKey: 'axis-time-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : supabase;
