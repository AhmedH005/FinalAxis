import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useAppliedDayReshapeRecord } from '@/engines/time';
import { formatFullDate, getGreeting } from '@/engines/mind';
import { buildTodayLifeOsModel } from './life-os-model';
import { useLifeOsHomeData } from './useLifeOsHomeData';

export function useTodayScreen() {
  const router = useRouter();
  const lifeOs = useLifeOsHomeData();
  const { data: appliedDayReshapeRecord = null } = useAppliedDayReshapeRecord();
  const activeDayReshapeRecord = appliedDayReshapeRecord?.date === lifeOs.date
    ? appliedDayReshapeRecord
    : null;

  const model = useMemo(
    () => buildTodayLifeOsModel(lifeOs.snapshot, lifeOs.observations, {
      alignment: lifeOs.goalAlignment,
      path: lifeOs.goalPath,
    }, {
      plan: lifeOs.dayReshapePlan,
      appliedRecord: activeDayReshapeRecord,
    }, {
      reflection: lifeOs.weeklyReflection,
    }),
    [
      activeDayReshapeRecord,
      lifeOs.dayReshapePlan,
      lifeOs.goalAlignment,
      lifeOs.goalPath,
      lifeOs.observations,
      lifeOs.snapshot,
      lifeOs.weeklyReflection,
    ],
  );

  const openRoute = useCallback((route: Href) => {
    router.navigate(route);
  }, [router]);

  const dateLabel = useMemo(() => formatFullDate(), []);
  const greeting = useMemo(
    () => getGreeting(lifeOs.profile?.full_name),
    [lifeOs.profile?.full_name],
  );

  return {
    dateLabel,
    greeting,
    isLoading: lifeOs.isLoading,
    model,
    openRoute,
  };
}
