import { useCallback } from 'react';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useLifeOsHomeData } from '@/features/today/useLifeOsHomeData';

export function useWeeklyReflectionScreen() {
  const router = useRouter();
  const lifeOs = useLifeOsHomeData();

  const goBack = useCallback(() => router.back(), [router]);
  const openRoute = useCallback((route: Href) => router.push(route), [router]);

  return {
    isLoading: lifeOs.isLoading || lifeOs.weeklyHistoryLoading,
    model: lifeOs.weeklyReflection,
    goBack,
    openRoute,
  };
}
