import { format, parseISO } from 'date-fns';
import type { LifeOsWeeklyReflectionModel, LifeOsWeeklySummary } from '../history/types';

function formatWeekLabel(summary: LifeOsWeeklySummary) {
  const start = parseISO(`${summary.startDate}T12:00:00`);
  const end = parseISO(`${summary.endDate}T12:00:00`);
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
}

function recurringDetail(count: number, recordedDays: number) {
  return `Showed up on ${count} of ${recordedDays} recorded days.`;
}

function buildHeader(summary: LifeOsWeeklySummary) {
  if (summary.confidence === 'low') {
    return {
      title: 'The week is still only partly visible',
      summary: 'AXIS has enough signal to notice a pattern, but not enough to make a stronger weekly call yet.',
    };
  }

  switch (summary.alignmentTrend.direction) {
    case 'improving':
      return {
        title: 'The week moved in a better direction',
        summary: 'The daily pattern started to support the goal more reliably as the week went on.',
      };
    case 'worsening':
      return {
        title: 'The week kept leaning away from the goal',
        summary: 'Recurring drag showed up often enough to pull the week off line.',
      };
    case 'mixed':
      return {
        title: 'The week kept swinging between support and strain',
        summary: 'There was real support in parts of the week, but it did not hold consistently enough yet.',
      };
    default:
      if (summary.consistencyTrend.level === 'stable') {
        return {
          title: 'The week held together more steadily',
          summary: 'The basics were supportive often enough to keep the week on more stable footing.',
        };
      }

      if (summary.consistencyTrend.level === 'fragile') {
        return {
          title: 'The week stayed fragile more often than not',
          summary: 'The same pressure points kept reappearing before they could fully reset.',
        };
      }

      return {
        title: 'The week was readable without a dramatic swing',
        summary: 'AXIS can see the week clearly enough, but the pattern is more steady than directional.',
      };
  }
}

function buildAlignmentRead(summary: LifeOsWeeklySummary) {
  if (!summary.goal) {
    return {
      title: 'No single goal held the week together',
      summary: 'Weekly reflection is still useful without an active goal, but the strongest alignment read appears once one direction stays active.',
    };
  }

  const goalTitle = summary.goal.goalTitle;
  switch (summary.alignmentTrend.direction) {
    case 'improving':
      return {
        title: `${goalTitle} gained support as the week moved on`,
        summary: 'The later part of the week was more aligned than the earlier part.',
      };
    case 'worsening':
      return {
        title: `${goalTitle} kept losing support through the week`,
        summary: 'The week started with more room than it ended with, which is why the current path feels softer now.',
      };
    case 'mixed':
      return {
        title: `${goalTitle} had support, but it did not hold consistently`,
        summary: 'The weekly read swung enough that AXIS should stay cautious about overclaiming a clear trend.',
      };
    case 'steady':
      return {
        title: `${goalTitle} stayed on a similar track through the week`,
        summary: 'The week did not sharply improve or worsen, which makes recurring blockers and supports the more useful read.',
      };
    default:
      return {
        title: `${goalTitle} still needs more weekly signal`,
        summary: 'There are not enough confident daily alignment reads yet to call the weekly direction clearly.',
      };
  }
}

function buildStrongestShift(summary: LifeOsWeeklySummary) {
  if (!summary.strongestShiftCandidate) {
    return {
      title: null,
      summary: null,
      domain: null,
      code: null,
    };
  }

  return {
    title: summary.strongestShiftCandidate.title,
    summary: `This shift appeared often enough to matter more than a larger but less repeatable correction.`,
    domain: summary.strongestShiftCandidate.domain,
    code: summary.strongestShiftCandidate.code,
  };
}

function buildEvidenceNote(summary: LifeOsWeeklySummary) {
  if (summary.recordedDays < 3) {
    return 'This reflection is intentionally cautious because there are fewer than three captured days in view.';
  }

  if (summary.confidence === 'low') {
    return 'Signal coverage was thin across enough of the week that AXIS is keeping the weekly read narrow.';
  }

  if (summary.goal?.mixedGoals) {
    return 'The active goal changed during the week, so the alignment read is based on the dominant goal pattern rather than a perfectly stable week.';
  }

  return null;
}

export function buildLifeOsWeeklyReflectionModel(
  summary: LifeOsWeeklySummary | null,
): LifeOsWeeklyReflectionModel {
  if (!summary || summary.recordedDays < 3) {
    return {
      isAvailable: false,
      weekLabel: null,
      confidence: null,
      teaserTitle: null,
      teaserSummary: null,
      header: {
        title: null,
        summary: null,
      },
      recurringBlockers: [],
      recurringSupports: [],
      alignmentRead: {
        title: null,
        summary: null,
      },
      strongestShift: {
        title: null,
        summary: null,
        domain: null,
        code: null,
      },
      evidenceNote: null,
      emptyState: {
        title: 'Not enough week behind this yet',
        summary: 'AXIS starts the weekly read once it has a few persisted daily summaries to work from.',
      },
    };
  }

  const header = buildHeader(summary);
  const alignmentRead = buildAlignmentRead(summary);
  const strongestShift = buildStrongestShift(summary);

  return {
    isAvailable: true,
    weekLabel: formatWeekLabel(summary),
    confidence: summary.confidence,
    teaserTitle: header.title,
    teaserSummary: strongestShift.title
      ? `The clearest next-week shift is ${strongestShift.title.toLowerCase()}.`
      : header.summary,
    header,
    recurringBlockers: summary.recurringBlockers.map((item) => ({
      id: `${item.source}:${item.code}`,
      label: item.label,
      detail: recurringDetail(item.count, summary.recordedDays),
      domain: item.domain,
    })),
    recurringSupports: summary.recurringSupports.map((item) => ({
      id: `${item.source}:${item.code}`,
      label: item.label,
      detail: recurringDetail(item.count, summary.recordedDays),
      domain: item.domain,
    })),
    alignmentRead,
    strongestShift,
    evidenceNote: buildEvidenceNote(summary),
    emptyState: null,
  };
}
