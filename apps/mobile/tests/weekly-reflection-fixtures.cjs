function historySignal(args) {
  return {
    code: args.code,
    label: args.label,
    domain: args.domain,
    confidence: args.confidence ?? 'high',
    source: args.source ?? 'life_os',
  };
}

function goalRecommendation(args) {
  return {
    code: args.code,
    title: args.title,
    domain: args.domain,
    priority: args.priority ?? 'primary',
  };
}

function goalSummary(args) {
  return {
    goalId: args.goalId ?? 'goal-1',
    goalTitle: args.goalTitle ?? 'Perform at a high level',
    archetype: args.archetype ?? 'perform',
    alignmentBand: args.alignmentBand ?? 'aligned',
    alignmentScore: args.alignmentScore ?? 78,
    confidence: args.confidence ?? 'high',
    blockers: args.blockers ?? [],
    supports: args.supports ?? [],
    recommendations: args.recommendations ?? [],
  };
}

function historyRecord(args) {
  return {
    version: 1,
    date: args.date,
    recordedAt: `${args.date}T21:00:00.000Z`,
    signalCoverage: {
      pct: args.coveragePct ?? 82,
      confidence: args.coverageConfidence ?? 'high',
      missingDomains: args.missingDomains ?? [],
    },
    currentState: {
      time: {
        state: args.timeState ?? 'steady',
        focusLoadScore: args.focusLoadScore ?? 48,
        deepWorkMinutes: args.deepWorkMinutes ?? 90,
      },
      body: {
        state: args.bodyState ?? 'steady',
        recoveryRiskScore: args.recoveryRiskScore ?? 28,
        recoveryRiskLevel: args.recoveryRiskLevel ?? 'low',
        bodyReadinessScore: args.bodyReadinessScore ?? 72,
        sleepMinutes: args.sleepMinutes ?? 470,
      },
      mind: {
        state: args.mindState ?? 'steady',
        mindStabilityScore: args.mindStabilityScore ?? 74,
        moodScore: args.moodScore ?? 7,
        habitsCompletionPct: args.habitsCompletionPct ?? 75,
        hasJournalEntry: args.hasJournalEntry ?? true,
      },
    },
    momentum: args.momentum ?? [],
    blockers: args.blockers ?? [],
    supports: args.supports ?? [],
    goalAlignment: args.goalAlignment ?? null,
  };
}

function buildImprovingPerformWeek() {
  const recurringBlocker = historySignal({
    code: 'time-load-high',
    label: 'Cognitive load is elevated',
    domain: 'time',
  });
  const recurringSupport = historySignal({
    code: 'time-focus-protected',
    label: 'Focused workload is protected',
    domain: 'time',
  });

  return [
    historyRecord({
      date: '2026-03-09',
      blockers: [recurringBlocker],
      supports: [],
      goalAlignment: goalSummary({
        alignmentBand: 'at_risk',
        alignmentScore: 58,
        blockers: [historySignal({
          code: 'focusCapacityScore',
          label: 'Focus capacity',
          domain: 'time',
          source: 'goal_alignment',
        })],
        recommendations: [goalRecommendation({
          code: 'reduce_cognitive_load',
          title: 'Reduce cognitive load before pushing harder',
          domain: 'time',
        })],
      }),
    }),
    historyRecord({
      date: '2026-03-10',
      blockers: [recurringBlocker],
      supports: [recurringSupport],
      goalAlignment: goalSummary({
        alignmentBand: 'at_risk',
        alignmentScore: 64,
        supports: [historySignal({
          code: 'deepWorkTargetScore',
          label: 'Deep work support',
          domain: 'time',
          source: 'goal_alignment',
        })],
        recommendations: [goalRecommendation({
          code: 'reduce_cognitive_load',
          title: 'Reduce cognitive load before pushing harder',
          domain: 'time',
        })],
      }),
    }),
    historyRecord({
      date: '2026-03-11',
      blockers: [],
      supports: [recurringSupport],
      goalAlignment: goalSummary({
        alignmentBand: 'aligned',
        alignmentScore: 75,
        supports: [historySignal({
          code: 'deepWorkTargetScore',
          label: 'Deep work support',
          domain: 'time',
          source: 'goal_alignment',
        })],
        recommendations: [goalRecommendation({
          code: 'protect_focus_window',
          title: 'Protect the clean focus window you already have',
          domain: 'time',
        })],
      }),
    }),
    historyRecord({
      date: '2026-03-12',
      blockers: [],
      supports: [recurringSupport],
      goalAlignment: goalSummary({
        alignmentBand: 'aligned',
        alignmentScore: 82,
        supports: [historySignal({
          code: 'deepWorkTargetScore',
          label: 'Deep work support',
          domain: 'time',
          source: 'goal_alignment',
        })],
        recommendations: [goalRecommendation({
          code: 'protect_focus_window',
          title: 'Protect the clean focus window you already have',
          domain: 'time',
        })],
      }),
    }),
    historyRecord({
      date: '2026-03-13',
      blockers: [],
      supports: [recurringSupport],
      goalAlignment: goalSummary({
        alignmentBand: 'aligned',
        alignmentScore: 86,
        supports: [historySignal({
          code: 'deepWorkTargetScore',
          label: 'Deep work support',
          domain: 'time',
          source: 'goal_alignment',
        })],
        recommendations: [goalRecommendation({
          code: 'protect_focus_window',
          title: 'Protect the clean focus window you already have',
          domain: 'time',
        })],
      }),
    }),
  ];
}

function buildWorseningBodyWeek(archetype) {
  const blocker = historySignal({
    code: 'recovery-risk-high',
    label: 'Recovery risk is elevated',
    domain: 'body',
  });

  return [
    historyRecord({
      date: '2026-03-09',
      blockers: [],
      supports: [historySignal({ code: 'body-ready', label: 'Recovery inputs are supportive', domain: 'body' })],
      goalAlignment: goalSummary({
        archetype,
        goalTitle: archetype === 'lose' ? 'Lose with stability' : archetype === 'gain' ? 'Gain with support' : 'Maintain steadily',
        alignmentBand: 'aligned',
        alignmentScore: 76,
        recommendations: [goalRecommendation({
          code: 'prioritize_hydration',
          title: 'Prioritize hydration early',
          domain: 'body',
        })],
      }),
    }),
    historyRecord({
      date: '2026-03-10',
      blockers: [blocker],
      supports: [],
      bodyState: 'fragile',
      recoveryRiskScore: 72,
      recoveryRiskLevel: 'high',
      bodyReadinessScore: 38,
      goalAlignment: goalSummary({
        archetype,
        goalTitle: archetype === 'lose' ? 'Lose with stability' : archetype === 'gain' ? 'Gain with support' : 'Maintain steadily',
        alignmentBand: 'at_risk',
        alignmentScore: 58,
        blockers: [historySignal({
          code: 'recoverySupportScore',
          label: 'Recovery support',
          domain: 'body',
          source: 'goal_alignment',
        })],
        recommendations: [goalRecommendation({
          code: 'protect_sleep_window',
          title: 'Protect tonight’s sleep window',
          domain: 'time',
        })],
      }),
    }),
    historyRecord({
      date: '2026-03-11',
      blockers: [blocker],
      supports: [],
      bodyState: 'fragile',
      recoveryRiskScore: 79,
      recoveryRiskLevel: 'high',
      bodyReadinessScore: 32,
      goalAlignment: goalSummary({
        archetype,
        goalTitle: archetype === 'lose' ? 'Lose with stability' : archetype === 'gain' ? 'Gain with support' : 'Maintain steadily',
        alignmentBand: 'misaligned',
        alignmentScore: 42,
        blockers: [historySignal({
          code: 'sleepScore',
          label: 'Sleep support',
          domain: 'body',
          source: 'goal_alignment',
        })],
        recommendations: [goalRecommendation({
          code: 'protect_sleep_window',
          title: 'Protect tonight’s sleep window',
          domain: 'time',
        })],
      }),
    }),
    historyRecord({
      date: '2026-03-12',
      blockers: [blocker],
      supports: [],
      bodyState: 'fragile',
      recoveryRiskScore: 82,
      recoveryRiskLevel: 'high',
      bodyReadinessScore: 28,
      goalAlignment: goalSummary({
        archetype,
        goalTitle: archetype === 'lose' ? 'Lose with stability' : archetype === 'gain' ? 'Gain with support' : 'Maintain steadily',
        alignmentBand: 'misaligned',
        alignmentScore: 37,
        blockers: [historySignal({
          code: 'recoverySupportScore',
          label: 'Recovery support',
          domain: 'body',
          source: 'goal_alignment',
        })],
        recommendations: [goalRecommendation({
          code: 'hold_goal_intensity',
          title: 'Shift from aggressive to sustainable today',
          domain: 'body',
        })],
      }),
    }),
  ];
}

function buildLowConfidenceMixedWeek() {
  return [
    historyRecord({
      date: '2026-03-11',
      coveragePct: 34,
      coverageConfidence: 'low',
      blockers: [historySignal({ code: 'time-load-high', label: 'Cognitive load is elevated', domain: 'time' })],
      goalAlignment: null,
    }),
    historyRecord({
      date: '2026-03-12',
      coveragePct: 42,
      coverageConfidence: 'low',
      supports: [historySignal({ code: 'mind-stable', label: 'Mood pattern is stable', domain: 'mind' })],
      goalAlignment: null,
    }),
    historyRecord({
      date: '2026-03-13',
      coveragePct: 46,
      coverageConfidence: 'medium',
      blockers: [historySignal({ code: 'recovery-risk-high', label: 'Recovery risk is elevated', domain: 'body' })],
      goalAlignment: null,
    }),
  ];
}

module.exports = {
  buildImprovingPerformWeek,
  buildLowConfidenceMixedWeek,
  buildWorseningBodyWeek,
  goalSummary,
  historyRecord,
  historySignal,
};
