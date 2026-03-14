import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  useAppliedDayReshapeRecord,
  useApplyDayReshapePlan,
  useUndoDayReshapePlan,
} from '@/engines/time';
import { buildDayReshapingModel } from './model';
import { useLifeOsHomeData } from '@/features/today/useLifeOsHomeData';

export function useDayReshapingScreen() {
  const router = useRouter();
  const lifeOs = useLifeOsHomeData();
  const { data: appliedRecord = null, isLoading: recordLoading } = useAppliedDayReshapeRecord();
  const activeAppliedRecord = appliedRecord?.date === lifeOs.date ? appliedRecord : null;
  const applyMutation = useApplyDayReshapePlan();
  const undoMutation = useUndoDayReshapePlan();
  const [message, setMessage] = useState<string | null>(null);

  const model = useMemo(
    () => buildDayReshapingModel(lifeOs.dayReshapePlan, activeAppliedRecord),
    [activeAppliedRecord, lifeOs.dayReshapePlan],
  );

  const goBack = useCallback(() => router.back(), [router]);

  const applyPlan = useCallback(async () => {
    if (!lifeOs.dayReshapePlan || lifeOs.dayReshapePlan.actions.length === 0) {
      setMessage('There is no concrete reshape plan to apply right now.');
      return;
    }

    const result = await applyMutation.mutateAsync({
      plan: lifeOs.dayReshapePlan,
      blocks: lifeOs.blocks,
    });

    setMessage(
      result.applied
        ? 'The schedule has been reshaped. You can undo it if the day changes again.'
        : result.issues[0]?.detail ?? 'AXIS could not apply this reshape safely.',
    );
  }, [applyMutation, lifeOs.dayReshapePlan, lifeOs.blocks]);

  const undoPlan = useCallback(async () => {
    const result = await undoMutation.mutateAsync();
    setMessage(
      result.undone
        ? 'The last applied reshape has been undone.'
        : result.issues[0]?.detail ?? 'AXIS could not undo the applied reshape.',
    );
  }, [undoMutation]);

  return {
    isLoading: lifeOs.isLoading || recordLoading,
    model,
    message,
    isApplying: applyMutation.isPending,
    isUndoing: undoMutation.isPending,
    goBack,
    keepDayAsIs: goBack,
    applyPlan,
    undoPlan,
  };
}
