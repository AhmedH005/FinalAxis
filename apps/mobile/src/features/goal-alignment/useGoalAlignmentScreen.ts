import { useCallback, useMemo } from 'react';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { buildGoalAlignmentDetailModel } from './detail-model';
import { useLifeOsHomeData } from '@/features/today/useLifeOsHomeData';

export function useGoalAlignmentScreen() {
  const router = useRouter();
  const lifeOs = useLifeOsHomeData();

  const model = useMemo(
    () => buildGoalAlignmentDetailModel(lifeOs.goalAlignment, lifeOs.goalPath),
    [lifeOs.goalAlignment, lifeOs.goalPath],
  );

  const goBack = useCallback(() => router.back(), [router]);
  const openRoute = useCallback((route: Href) => router.push(route), [router]);

  return {
    isLoading: lifeOs.isLoading,
    model,
    goBack,
    openRoute,
  };
}
