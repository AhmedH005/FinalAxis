import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAddHydrationLog } from '@/engines/body';
import { parseQuickCaptureInput, type CaptureAcceptedResult, type CaptureResult } from '@/engines/capture';
import { useAddMoodLog, useCreateJournalEntry } from '@/engines/mind';
import { appRoutes, journalEntryRoute } from '@/types/navigation';

function routeForWriteTarget(target: CaptureAcceptedResult['writeTarget']): Href {
  switch (target) {
    case 'body_hydration_log':
      return appRoutes.bodyHydration;
    case 'mind_mood_log':
      return appRoutes.mindMood;
    case 'mind_journal_note':
      return appRoutes.mindJournal;
    default:
      return appRoutes.home;
  }
}

type QuickCaptureOutcome =
  | {
      kind: 'success';
      title: string;
      detail: string;
      route: Href | null;
    }
  | {
      kind: 'error';
      title: string;
      detail: string;
      route: null;
    };

export function useQuickCapture(args: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const onCloseRef = useRef(args.onClose);
  onCloseRef.current = args.onClose;

  const addHydration = useAddHydrationLog();
  const addMood = useAddMoodLog();
  const createEntry = useCreateJournalEntry();
  const [input, setInput] = useState('');
  const [outcome, setOutcome] = useState<QuickCaptureOutcome | null>(null);

  const result = useMemo(
    () => parseQuickCaptureInput(input),
    [input],
  );

  const isSubmitting = addHydration.isPending || addMood.isPending || createEntry.isPending;

  useEffect(() => {
    if (!args.visible) {
      setInput('');
      setOutcome(null);
    }
  }, [args.visible]);

  const confirmCapture = useCallback(async () => {
    if (result.status !== 'accepted') {
      return;
    }

    try {
      if (result.intent === 'hydration') {
        await addHydration.mutateAsync(result.parsed.amountMl);
        setOutcome({
          kind: 'success',
          title: 'Hydration logged',
          detail: `${result.parsed.amountMl}ml was added to today.`,
          route: routeForWriteTarget(result.writeTarget),
        });
        setInput('');
        return;
      }

      if (result.intent === 'mood') {
        await addMood.mutateAsync({
          mood_score: result.parsed.moodScore,
          note: result.parsed.note,
          tags: result.parsed.tags,
        });
        setOutcome({
          kind: 'success',
          title: 'Mood saved',
          detail: `Your ${result.parsed.moodScore}/10 check-in is in the Mind engine now.`,
          route: routeForWriteTarget(result.writeTarget),
        });
        setInput('');
        return;
      }

      if (result.intent === 'journal_note') {
        const entry = await createEntry.mutateAsync({
          entry_type: 'note',
          body: result.parsed.body,
        });
        setOutcome({
          kind: 'success',
          title: 'Note saved',
          detail: 'The note is now visible in Journal.',
          route: journalEntryRoute(entry.id),
        });
        setInput('');
        return;
      }

      const entry = await createEntry.mutateAsync({
        entry_type: 'note',
        title: result.parsed.title,
        body: result.parsed.body,
        tags: result.parsed.tags,
      });
      setOutcome({
        kind: 'success',
        title: 'Reminder saved',
        detail: 'AXIS saved the reminder as a visible Journal note.',
        route: journalEntryRoute(entry.id),
      });
      setInput('');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'AXIS could not save that right now.';
      setOutcome({
        kind: 'error',
        title: 'Capture did not save',
        detail,
        route: null,
      });
    }
  }, [addHydration, addMood, createEntry, result]);

  const dismissOutcome = useCallback(() => {
    setOutcome(null);
  }, []);

  const openOutcomeRoute = useCallback(() => {
    if (!outcome?.route) return;
    router.push(outcome.route);
    onCloseRef.current();
  }, [outcome?.route, router]);

  const closeSheet = useCallback(() => {
    setOutcome(null);
    setInput('');
    onCloseRef.current();
  }, []);

  return {
    input,
    setInput,
    result: result as CaptureResult,
    isSubmitting,
    outcome,
    confirmCapture,
    dismissOutcome,
    openOutcomeRoute,
    closeSheet,
  };
}
